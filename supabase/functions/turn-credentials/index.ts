/**
 * Short-lived TURN credentials for Messaging calls.
 *
 * Configure one of:
 *   TURN_URLS            comma-separated, e.g. "turn:relay.civizen.world:3478,turns:relay.civizen.world:5349"
 *   TURN_SHARED_SECRET   coturn `use-auth-secret` / `static-auth-secret`: credentials are derived per request
 *                        (username = "<expiry>:<user id>", credential = base64(HMAC-SHA1(secret, username)))
 *   TURN_USERNAME / TURN_CREDENTIAL   static credentials instead of the shared secret
 *   TURN_TTL_SECONDS     lifetime of derived credentials (default 3600)
 *
 * Without TURN_URLS the function answers with an empty list and the client stays on STUN only.
 * Only signed-in members may ask (the relay would otherwise be open to anyone).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSha1Base64(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = request.headers.get('Authorization') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const urls = (Deno.env.get('TURN_URLS') ?? '').split(',').map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      return json({ iceServers: [] }, 200);
    }

    const sharedSecret = Deno.env.get('TURN_SHARED_SECRET') ?? '';
    let username = Deno.env.get('TURN_USERNAME') ?? '';
    let credential = Deno.env.get('TURN_CREDENTIAL') ?? '';
    let ttl: number | undefined;

    if (sharedSecret) {
      ttl = Number(Deno.env.get('TURN_TTL_SECONDS') ?? '3600') || 3600;
      const expiry = Math.floor(Date.now() / 1000) + ttl;
      username = `${expiry}:${user.id}`;
      credential = await hmacSha1Base64(sharedSecret, username);
    }

    if (!username || !credential) {
      return json({ iceServers: [] }, 200);
    }

    return json({ iceServers: [{ urls, username, credential }], ttl }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
