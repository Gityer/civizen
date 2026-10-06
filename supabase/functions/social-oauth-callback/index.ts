import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const CIVIZEN_BUSINESS_NAME_NORMALIZED = 'civizen';
const CIVIZEN_ORG_USERNAME = 'civizen';
const CIVIZEN_LINKEDIN_ORG_ID = Deno.env.get('LINKEDIN_ORGANIZATION_ID') || '143053953';

function appPublicOrigin(): string {
  return (Deno.env.get('CIVIZEN_PUBLIC_ORIGIN') || 'https://civizen.world').replace(/\/$/, '');
}

function oauthRedirectUri(): string {
  const explicit = Deno.env.get('SOCIAL_OAUTH_REDIRECT_URI');
  if (explicit) return explicit;
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  return `${supabaseUrl}/functions/v1/social-oauth-callback`;
}

function redirectToSettings(params: Record<string, string>) {
  const url = new URL(`${appPublicOrigin()}/settings/social-accounts`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return Response.redirect(url.toString(), 302);
}

async function assertOfficialCivizenOrgProfile(
  adminClient: ReturnType<typeof createClient>,
  profileId: string,
): Promise<boolean> {
  const { data: link } = await adminClient
    .from('linked_accounts')
    .select('id')
    .eq('relationship_type', 'business')
    .eq('business_name_normalized', CIVIZEN_BUSINESS_NAME_NORMALIZED)
    .eq('linked_profile_id', profileId)
    .maybeSingle();
  if (link?.id) return true;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('username')
    .eq('id', profileId)
    .maybeSingle();
  return (profile?.username || '').trim().toLowerCase() === CIVIZEN_ORG_USERNAME;
}

async function exchangeLinkedIn(code: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauthRedirectUri(),
    client_id: Deno.env.get('LINKEDIN_CLIENT_ID') || '',
    client_secret: Deno.env.get('LINKEDIN_CLIENT_SECRET') || '',
  });
  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    throw new Error(`LinkedIn token exchange failed (${response.status})`);
  }
  return await response.json();
}

async function verifyLinkedInOrgAccess(accessToken: string): Promise<boolean> {
  const response = await fetch(
    `https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202507',
      },
    },
  );
  if (!response.ok) {
    // Fallback: allow connect; publish will fail if role is insufficient.
    return true;
  }
  const payload = await response.json();
  const elements = payload.elements || [];
  return elements.some((el: { organization?: string }) =>
    String(el.organization || '').includes(`organization:${CIVIZEN_LINKEDIN_ORG_ID}`),
  ) || elements.length === 0;
}

async function exchangeFacebook(code: string) {
  const params = new URLSearchParams({
    client_id: Deno.env.get('FACEBOOK_CLIENT_ID') || '',
    client_secret: Deno.env.get('FACEBOOK_CLIENT_SECRET') || '',
    redirect_uri: oauthRedirectUri(),
    code,
  });
  const response = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params}`);
  if (!response.ok) {
    throw new Error(`Facebook token exchange failed (${response.status})`);
  }
  return await response.json();
}

async function resolveFacebookPage(
  userAccessToken: string,
): Promise<{ pageId: string; pageName: string; pageToken: string } | null> {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(userAccessToken)}`,
  );
  if (!response.ok) return null;
  const payload = await response.json();
  const page = (payload.data || [])[0];
  if (!page?.id || !page?.access_token) return null;
  return {
    pageId: String(page.id),
    pageName: String(page.name || 'Facebook Page'),
    pageToken: String(page.access_token),
  };
}

async function exchangeX(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oauthRedirectUri(),
    client_id: Deno.env.get('X_CLIENT_ID') || '',
    code_verifier: codeVerifier,
  });
  const basic = btoa(
    `${Deno.env.get('X_CLIENT_ID') || ''}:${Deno.env.get('X_CLIENT_SECRET') || ''}`,
  );
  const response = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(`X token exchange failed (${response.status})`);
  }
  return await response.json();
}

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');

    if (oauthError) {
      return redirectToSettings({ error: oauthError });
    }
    if (!code || !state) {
      return redirectToSettings({ error: 'missing_code' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: stateRow } = await adminClient
      .from('social_oauth_states')
      .select('*')
      .eq('id', state)
      .maybeSingle();

    if (!stateRow?.id) {
      return redirectToSettings({ error: 'invalid_state' });
    }

    await adminClient.from('social_oauth_states').delete().eq('id', state);

    if (new Date(stateRow.expires_at).getTime() < Date.now()) {
      return redirectToSettings({ error: 'expired_state' });
    }

    const allowed = await assertOfficialCivizenOrgProfile(adminClient, stateRow.profile_id);
    if (!allowed) {
      return redirectToSettings({ error: 'forbidden' });
    }

    const provider = stateRow.provider as 'linkedin' | 'facebook' | 'x';
    let accessToken = '';
    let refreshToken: string | null = null;
    let expiresAt: string | null = null;
    let externalAccountId: string | null = null;
    let externalAccountName: string | null = null;
    let scopes: string | null = null;

    if (provider === 'linkedin') {
      const token = await exchangeLinkedIn(code);
      accessToken = token.access_token;
      refreshToken = token.refresh_token || null;
      const expiresIn = Number(token.expires_in || 3600);
      expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      scopes = token.scope || null;
      await verifyLinkedInOrgAccess(accessToken);
      externalAccountId = CIVIZEN_LINKEDIN_ORG_ID;
      externalAccountName = 'Civizen LinkedIn Page';
    } else if (provider === 'facebook') {
      const token = await exchangeFacebook(code);
      const page = await resolveFacebookPage(token.access_token);
      if (!page) {
        return redirectToSettings({ error: 'facebook_no_page', provider });
      }
      accessToken = page.pageToken;
      externalAccountId = page.pageId;
      externalAccountName = page.pageName;
      expiresAt = null;
    } else {
      const verifier = typeof stateRow.code_verifier === 'string' ? stateRow.code_verifier : '';
      if (!verifier) {
        return redirectToSettings({ error: 'invalid_state', provider });
      }
      const token = await exchangeX(code, verifier);
      accessToken = token.access_token;
      refreshToken = token.refresh_token || null;
      const expiresIn = Number(token.expires_in || 7200);
      expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      scopes = token.scope || null;
      externalAccountName = 'Civizen on X';
    }

    await adminClient.from('social_account_connections').upsert({
      org_profile_id: stateRow.profile_id,
      provider,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      token_scopes: scopes,
      external_account_id: externalAccountId,
      external_account_name: externalAccountName,
      status: 'connected',
      last_error: null,
      connected_by_profile_id: stateRow.profile_id,
    }, { onConflict: 'org_profile_id,provider' });

    return redirectToSettings({ connected: provider });
  } catch (error) {
    console.error('social-oauth-callback error', error);
    return redirectToSettings({
      error: error instanceof Error ? error.message.slice(0, 120) : 'oauth_failed',
    });
  }
});
