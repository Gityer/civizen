import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

/**
 * Sign in with a username, phone number or e-mail plus password.
 *
 * The identifier → e-mail lookup used to be an anonymous RPC, which let anyone learn the e-mail
 * behind any username or phone number. It now runs here with the service role, the password grant is
 * performed server-side, and every failure returns the same answer, so callers learn nothing about
 * which identifiers exist.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SignInPayload = { identifier?: string; password?: string };

const INVALID = { error: 'invalid_login_credentials' };

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const payload = (await request.json().catch(() => ({}))) as SignInPayload;
    const identifier = payload.identifier?.trim() ?? '';
    const password = payload.password ?? '';

    if (!identifier || !password) {
      return json({ error: 'identifier_and_password_required' }, 400);
    }

    let email = identifier;
    if (!identifier.includes('@')) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await admin.rpc('resolve_login_email', { identifier });
      if (error || !data || typeof data !== 'string') {
        return json(INVALID, 400);
      }
      email = data;
    }

    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await anon.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return json(INVALID, 400);
    }

    return json(
      {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
          token_type: data.session.token_type,
        },
      },
      200,
    );
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
