import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CIVIZEN_BUSINESS_NAME_NORMALIZED = 'civizen';
const CIVIZEN_ORG_USERNAME = 'civizen';
const CIVIZEN_LINKEDIN_ORG_ID = Deno.env.get('LINKEDIN_ORGANIZATION_ID') || '143053953';
const PROVIDERS = ['linkedin', 'facebook', 'x'] as const;
type SocialProvider = (typeof PROVIDERS)[number];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isSocialProvider(value: unknown): value is SocialProvider {
  return value === 'linkedin' || value === 'facebook' || value === 'x';
}

function providerConfigured(provider: SocialProvider): boolean {
  if (provider === 'linkedin') {
    return Boolean(Deno.env.get('LINKEDIN_CLIENT_ID') && Deno.env.get('LINKEDIN_CLIENT_SECRET'));
  }
  if (provider === 'facebook') {
    return Boolean(Deno.env.get('FACEBOOK_CLIENT_ID') && Deno.env.get('FACEBOOK_CLIENT_SECRET'));
  }
  return Boolean(Deno.env.get('X_CLIENT_ID') && Deno.env.get('X_CLIENT_SECRET'));
}

function oauthRedirectUri(): string {
  const explicit = Deno.env.get('SOCIAL_OAUTH_REDIRECT_URI');
  if (explicit) return explicit;
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  return `${supabaseUrl}/functions/v1/social-oauth-callback`;
}

function linkedInAuthorizeUrl(state: string): string {
  const clientId = Deno.env.get('LINKEDIN_CLIENT_ID') || '';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: oauthRedirectUri(),
    state,
    scope: 'openid profile w_organization_social r_organization_social',
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

function facebookAuthorizeUrl(state: string): string {
  const clientId = Deno.env.get('FACEBOOK_CLIENT_ID') || '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthRedirectUri(),
    state,
    scope: 'pages_manage_posts,pages_read_engagement,pages_show_list',
    response_type: 'code',
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** PKCE pair for X: a random verifier kept server-side and its S256 challenge for the URL. */
async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge: base64Url(digest) };
}

function xAuthorizeUrl(state: string, codeChallenge: string): string {
  const clientId = Deno.env.get('X_CLIENT_ID') || '';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: oauthRedirectUri(),
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
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

async function refreshLinkedInToken(
  adminClient: ReturnType<typeof createClient>,
  connection: Record<string, unknown>,
): Promise<string | null> {
  const accessToken = String(connection.access_token || '');
  const expiresAt = connection.expires_at ? new Date(String(connection.expires_at)).getTime() : 0;
  if (accessToken && expiresAt > Date.now() + 60_000) return accessToken;

  const refreshToken = String(connection.refresh_token || '');
  if (!refreshToken) return accessToken || null;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: Deno.env.get('LINKEDIN_CLIENT_ID') || '',
    client_secret: Deno.env.get('LINKEDIN_CLIENT_SECRET') || '',
  });

  const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) return accessToken || null;
  const payload = await response.json();
  const nextAccess = payload.access_token as string | undefined;
  if (!nextAccess) return accessToken || null;

  const expiresIn = Number(payload.expires_in || 3600);
  await adminClient
    .from('social_account_connections')
    .update({
      access_token: nextAccess,
      refresh_token: payload.refresh_token || refreshToken,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      status: 'connected',
      last_error: null,
    })
    .eq('id', connection.id);

  return nextAccess;
}

async function publishLinkedIn(
  accessToken: string,
  content: string,
): Promise<{ ok: true; externalPostId: string } | { ok: false; error: string }> {
  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202507',
    },
    body: JSON.stringify({
      author: `urn:li:organization:${CIVIZEN_LINKEDIN_ORG_ID}`,
      commentary: content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: text.slice(0, 500) || `LinkedIn publish failed (${response.status})` };
  }

  const postId = response.headers.get('x-restli-id') || response.headers.get('x-linkedin-id') || '';
  return { ok: true, externalPostId: postId || `linkedin:${Date.now()}` };
}

async function publishFacebook(
  accessToken: string,
  pageId: string,
  content: string,
): Promise<{ ok: true; externalPostId: string } | { ok: false; error: string }> {
  const params = new URLSearchParams({
    message: content,
    access_token: accessToken,
  });
  const response = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const payload = await response.json();
  if (!response.ok || !payload.id) {
    return { ok: false, error: payload?.error?.message || `Facebook publish failed (${response.status})` };
  }
  return { ok: true, externalPostId: String(payload.id) };
}

async function publishX(
  accessToken: string,
  content: string,
): Promise<{ ok: true; externalPostId: string } | { ok: false; error: string }> {
  const response = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: content.slice(0, 280) }),
  });
  const payload = await response.json();
  if (!response.ok || !payload?.data?.id) {
    return {
      ok: false,
      error: payload?.detail || payload?.title || `X publish failed (${response.status})`,
    };
  }
  return { ok: true, externalPostId: String(payload.data.id) };
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
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, username')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || !profile?.id) {
      return jsonResponse({ error: 'Profile not found' }, 403);
    }

    const allowed = await assertOfficialCivizenOrgProfile(adminClient, profile.id);
    if (!allowed) {
      return jsonResponse({
        error: 'Only the official Civizen organization account can manage social publishing.',
      }, 403);
    }

    const payload = await request.json().catch(() => ({})) as {
      action?: string;
      provider?: string;
      postId?: string;
    };
    const action = payload.action || 'status';

    if (action === 'status') {
      const { data: rows } = await adminClient
        .from('social_account_connections')
        .select('provider, status, external_account_name, last_error')
        .eq('org_profile_id', profile.id);

      const byProvider = new Map((rows || []).map((row) => [row.provider, row]));
      const connections = PROVIDERS.map((provider) => {
        const row = byProvider.get(provider);
        return {
          provider,
          configured: providerConfigured(provider),
          connected: row?.status === 'connected',
          externalAccountName: row?.external_account_name ?? null,
          status: row?.status ?? null,
          lastError: row?.last_error ?? null,
        };
      });
      return jsonResponse({ connections });
    }

    if (action === 'oauth-start') {
      if (!isSocialProvider(payload.provider)) {
        return jsonResponse({ error: 'Unknown provider' }, 400);
      }
      if (!providerConfigured(payload.provider)) {
        return jsonResponse({
          error: `${payload.provider} is not configured yet. Add developer app credentials to edge secrets.`,
        }, 400);
      }

      const pkce = payload.provider === 'x' ? await createPkcePair() : null;
      const { data: stateRow, error: stateError } = await adminClient
        .from('social_oauth_states')
        .insert({
          profile_id: profile.id,
          provider: payload.provider,
          code_verifier: pkce?.verifier ?? null,
        })
        .select('id')
        .single();

      if (stateError || !stateRow?.id) {
        return jsonResponse({ error: 'Could not start OAuth' }, 500);
      }

      let authorizeUrl = '';
      if (payload.provider === 'linkedin') authorizeUrl = linkedInAuthorizeUrl(stateRow.id);
      else if (payload.provider === 'facebook') authorizeUrl = facebookAuthorizeUrl(stateRow.id);
      else authorizeUrl = xAuthorizeUrl(stateRow.id, pkce?.challenge ?? '');

      return jsonResponse({ authorizeUrl });
    }

    if (action === 'disconnect') {
      if (!isSocialProvider(payload.provider)) {
        return jsonResponse({ error: 'Unknown provider' }, 400);
      }
      await adminClient
        .from('social_account_connections')
        .delete()
        .eq('org_profile_id', profile.id)
        .eq('provider', payload.provider);
      return jsonResponse({ ok: true });
    }

    if (action === 'publish') {
      if (!isSocialProvider(payload.provider)) {
        return jsonResponse({ error: 'Unknown provider' }, 400);
      }
      const postId = payload.postId?.trim();
      if (!postId) return jsonResponse({ error: 'postId is required' }, 400);

      const { data: post } = await adminClient
        .from('posts')
        .select('id, content, author_id')
        .eq('id', postId)
        .maybeSingle();

      if (!post?.id || post.author_id !== profile.id) {
        return jsonResponse({ error: 'Post not found for this organization account.' }, 404);
      }

      const { data: existing } = await adminClient
        .from('social_crossposts')
        .select('id, status, external_post_id')
        .eq('post_id', postId)
        .eq('provider', payload.provider)
        .eq('status', 'published')
        .maybeSingle();

      if (existing?.id) {
        return jsonResponse({
          ok: true,
          alreadyPublished: true,
          externalPostId: existing.external_post_id,
        });
      }

      const { data: connection } = await adminClient
        .from('social_account_connections')
        .select('*')
        .eq('org_profile_id', profile.id)
        .eq('provider', payload.provider)
        .eq('status', 'connected')
        .maybeSingle();

      if (!connection?.access_token) {
        return jsonResponse({
          error: 'Connect this network in Settings → Social accounts first.',
        }, 400);
      }

      let result: { ok: true; externalPostId: string } | { ok: false; error: string };

      if (payload.provider === 'linkedin') {
        const token = await refreshLinkedInToken(adminClient, connection);
        if (!token) {
          result = { ok: false, error: 'LinkedIn token expired. Reconnect in Settings.' };
        } else {
          result = await publishLinkedIn(token, post.content);
        }
      } else if (payload.provider === 'facebook') {
        const pageId = String(connection.external_account_id || '');
        if (!pageId) {
          result = { ok: false, error: 'Facebook Page id missing. Reconnect Facebook.' };
        } else {
          result = await publishFacebook(String(connection.access_token), pageId, post.content);
        }
      } else {
        result = await publishX(String(connection.access_token), post.content);
      }

      if (!result.ok) {
        await adminClient.from('social_crossposts').upsert({
          post_id: postId,
          org_profile_id: profile.id,
          provider: payload.provider,
          status: 'failed',
          error_message: result.error,
          external_post_id: null,
        }, { onConflict: 'post_id,provider' });
        return jsonResponse({ error: result.error }, 502);
      }

      await adminClient.from('social_crossposts').upsert({
        post_id: postId,
        org_profile_id: profile.id,
        provider: payload.provider,
        status: 'published',
        error_message: null,
        external_post_id: result.externalPostId,
      }, { onConflict: 'post_id,provider' });

      return jsonResponse({ ok: true, externalPostId: result.externalPostId });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('social-accounts error', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
