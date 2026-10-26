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
const TOO_MANY = { error: 'too_many_attempts' };

/** The caller's address as seen by the gateway (first X-Forwarded-For hop), for the per-caller limit. */
function callerIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  return (forwarded.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

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

    // Security finding M2: at most 10 failed attempts per identifier and 30 attempts per caller in 15 minutes.
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const ip = callerIp(request);
    const { data: allowed, error: limitError } = await admin.rpc('sign_in_attempt_allowed', { p_identifier: identifier, p_ip: ip });
    if (limitError || allowed !== true) {
      return json(TOO_MANY, 429);
    }
    const record = (succeeded: boolean) =>
      admin.rpc('record_sign_in_attempt', { p_identifier: identifier, p_ip: ip, p_succeeded: succeeded });

    let email = identifier;
    if (!identifier.includes('@')) {
      const { data, error } = await admin.rpc('resolve_login_email', { identifier });
      if (error || !data || typeof data !== 'string') {
        await record(false);
        return json(INVALID, 400);
      }
      email = data;
    }

    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await anon.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      await record(false);
      return json(INVALID, 400);
    }
    await record(true);

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
    console.error('sign-in-with-identifier failed', error instanceof Error ? error.message : error);
    return json({ error: 'unexpected_error' }, 500);
  }
});
