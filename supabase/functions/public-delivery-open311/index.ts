/**
 * Delivers a Matter to a public body through its city service-request system (Open311 GeoReport v2) and reads the
 * request's status back. The body's channel address is "<endpoint>|<service code>"; the database decides whether the
 * caller may handle the Matter (`prepare_open311_delivery`, `prepare_open311_refresh`) and records the outcome.
 *
 *   POST { "action": "submit", "matter_id": "..." }   -> { "delivery_id", "service_request_id" }
 *   POST { "action": "refresh", "delivery_id": "..." } -> { "status", "status_notes" }
 *
 * Configure:
 *   OPEN311_API_KEYS              JSON object of endpoint host -> API key, for cities that require one
 *   OPEN311_ALLOW_PRIVATE_HTTP=1  local testing only: allows http:// and private-network endpoints
 * Without it, only https endpoints on public hosts are called.
 */
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

import { allowedEndpoint } from './endpoint.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function apiKeyFor(host: string): string | null {
  try {
    const keys = JSON.parse(Deno.env.get('OPEN311_API_KEYS') ?? '{}') as Record<string, string>;
    return keys[host] ?? null;
  } catch {
    return null;
  }
}

async function call(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`open311_${response.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authHeader = request.headers.get('Authorization') ?? '';
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const payload = (await request.json().catch(() => ({}))) as { action?: string; matter_id?: string; delivery_id?: string };
  const allowPrivate = Deno.env.get('OPEN311_ALLOW_PRIVATE_HTTP') === '1';
  try {
    if (payload.action === 'submit' && payload.matter_id) {
      const { data: prepared, error } = await supabase.rpc('prepare_open311_delivery', { p_matter_id: payload.matter_id });
      if (error) return json({ error: error.message }, error.code === '42501' ? 403 : 400);
      const plan = prepared as { endpoint: string; service_code: string; description: string; address_string: string };
      const endpoint = allowedEndpoint(plan.endpoint, allowPrivate);
      if (!endpoint) return json({ error: 'endpoint_not_allowed' }, 400);
      const form = new URLSearchParams({ service_code: plan.service_code, description: plan.description, address_string: plan.address_string });
      const key = apiKeyFor(endpoint.host);
      if (key) form.set('api_key', key);
      const result = await call(`${endpoint.href.replace(/\/$/, '')}/requests.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });
      const first = (Array.isArray(result) ? result[0] : result) as { service_request_id?: string; token?: string } | undefined;
      const externalId = first?.service_request_id ?? (first?.token ? `token:${first.token}` : '');
      if (!externalId) return json({ error: 'no_request_id' }, 502);
      const { data: deliveryId, error: recordError } = await supabase.rpc('record_open311_delivery', { p_matter_id: payload.matter_id, p_external_id: externalId });
      if (recordError) return json({ error: recordError.message }, 400);
      return json({ delivery_id: deliveryId, service_request_id: externalId }, 200);
    }
    if (payload.action === 'refresh' && payload.delivery_id) {
      const { data: prepared, error } = await supabase.rpc('prepare_open311_refresh', { p_delivery_id: payload.delivery_id });
      if (error) return json({ error: error.message }, error.code === '42501' ? 403 : 400);
      const plan = prepared as { endpoint: string; external_id: string };
      const endpoint = allowedEndpoint(plan.endpoint, allowPrivate);
      if (!endpoint || plan.external_id.startsWith('token:')) return json({ error: 'endpoint_not_allowed' }, 400);
      const key = apiKeyFor(endpoint.host);
      const result = await call(`${endpoint.href.replace(/\/$/, '')}/requests/${encodeURIComponent(plan.external_id)}.json${key ? `?api_key=${encodeURIComponent(key)}` : ''}`, { method: 'GET' });
      const first = (Array.isArray(result) ? result[0] : result) as { status?: string; status_notes?: string } | undefined;
      const status = first?.status ?? 'unknown';
      const { error: statusError } = await supabase.rpc('record_open311_status', { p_delivery_id: payload.delivery_id, p_status: status, p_notes: first?.status_notes ?? '' });
      if (statusError) return json({ error: statusError.message }, 400);
      return json({ status, status_notes: first?.status_notes ?? null }, 200);
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'unexpected_error' }, 502);
  }
});
