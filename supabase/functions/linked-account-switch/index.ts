import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { resolveSwitchAuthorization } from './authorize.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SwitchPayload = {
  targetProfileId?: string;
};

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = request.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const payload = (await request.json()) as SwitchPayload;
    const targetProfileId = payload.targetProfileId?.trim();

    if (!targetProfileId) {
      return json({ error: 'Missing targetProfileId.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: currentProfile, error: currentProfileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (currentProfileError || !currentProfile?.id) {
      return json({ error: 'Current profile not found.' }, 404);
    }

    // Only established rows count: a row is established by the owner/business session handshake
    // or by an owner approving an access request. Anything else was never proven.
    const { data: relatedRows } = await adminClient
      .from('linked_accounts')
      .select('owner_profile_id, linked_profile_id, relationship_type, established_at')
      .eq('relationship_type', 'business')
      .not('established_at', 'is', null)
      .or(`owner_profile_id.eq.${currentProfile.id},linked_profile_id.eq.${currentProfile.id},linked_profile_id.eq.${targetProfileId},owner_profile_id.eq.${targetProfileId}`);

    const authorization = resolveSwitchAuthorization(relatedRows ?? [], currentProfile.id, targetProfileId);

    if (authorization === 'denied') {
      return json({ error: 'Target account is not linked.' }, 403);
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('id', targetProfileId)
      .is('deleted_at', null)
      .single();

    if (targetProfileError || !targetProfile?.user_id) {
      return json({ error: 'Target profile not found.' }, 404);
    }

    const { data: targetUser, error: targetUserError } = await adminClient.auth.admin.getUserById(targetProfile.user_id);

    if (targetUserError || !targetUser?.user) {
      return json({ error: 'Target user not found.' }, 404);
    }

    const email = targetUser.user.email ?? null;

    if (!email) {
      return json({ error: 'Target user has no email.' }, 400);
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    const token = linkData?.properties?.email_otp ?? null;

    if (linkError || !token) {
      return json({ error: linkError?.message || 'Could not generate switch token.' }, 400);
    }

    return json({ email, token }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
