import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

/**
 * push-dispatch: called by the database (pg_net) for every new notification and private message. Loads the
 * recipients' web push subscriptions and sends one small payload per device. Message pushes carry no content.
 * Phase 7 step 7.2 (web).
 */
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, x-push-secret' };

type Payload = {
  kind?: 'notification' | 'message';
  notification_id?: string;
  message_id?: string;
  conversation_id?: string;
  sender_id?: string;
  recipients?: string[];
};

type SubscriptionRow = { id: string; profile_id: string; endpoint: string; p256dh: string; auth: string };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

/** Mirrors notificationRoute() in the web client. */
function routeFor(entityType: string | null, entityId: string | null, metadata: Record<string, unknown>): string {
  switch (entityType) {
    case 'civic_election': return entityId ? `/governance/voting/${entityId}` : '/governance/voting';
    case 'civic_voting_proposal': return entityId ? `/governance/voting/proposals/${entityId}` : '/governance?tab=proposals';
    case 'matter': return entityId ? `/contribute/matters/${entityId}` : '/contribute/matters';
    case 'agreement': return entityId ? `/agreements/${entityId}` : '/agreements';
    case 'knowledge_space': return entityId ? `/contribute/knowledge/${entityId}` : '/contribute/knowledge';
    case 'knowledge_resource': return typeof metadata.space_id === 'string' ? `/contribute/knowledge/${metadata.space_id}` : '/contribute/knowledge';
    case 'funding_interest_inquiry': return '/settings/admin/funding?section=interest';
    default: return '/notifications';
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'server_not_configured' });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: config } = await admin.from('push_dispatch_config').select('*').eq('id', true).maybeSingle();
  const secret = String(config?.dispatch_secret ?? '');
  if (!secret || request.headers.get('x-push-secret') !== secret) return json(401, { error: 'unauthorized' });
  if (!config?.vapid_public_key || !config?.vapid_private_key) return json(200, { ok: true, sent: 0, reason: 'vapid_not_configured' });
  webpush.setVapidDetails(String(config.vapid_subject || 'mailto:hello@civizen.world'), String(config.vapid_public_key), String(config.vapid_private_key));

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const recipients = Array.isArray(payload.recipients) ? payload.recipients.filter((id) => typeof id === 'string') : [];
  if (recipients.length === 0) return json(200, { ok: true, sent: 0 });

  let title = 'Civizen';
  let body = '';
  let url = '/notifications';
  let tag = 'civizen';
  if (payload.kind === 'notification' && payload.notification_id) {
    const { data: row } = await admin
      .from('user_notifications')
      .select('title, body, entity_type, entity_id, metadata')
      .eq('id', payload.notification_id)
      .maybeSingle();
    if (!row) return json(200, { ok: true, sent: 0, reason: 'notification_missing' });
    title = String(row.title || 'Civizen');
    body = String(row.body || '');
    url = routeFor(row.entity_type as string | null, row.entity_id as string | null, (row.metadata ?? {}) as Record<string, unknown>);
    tag = `notification-${payload.notification_id}`;
  } else if (payload.kind === 'message' && payload.conversation_id) {
    const { data: sender } = payload.sender_id
      ? await admin.from('profiles').select('full_name, username').eq('id', payload.sender_id).maybeSingle()
      : { data: null };
    const name = String(sender?.full_name || sender?.username || 'Someone').trim();
    title = `New message from ${name}`;
    body = '';
    url = '/messaging';
    tag = `conversation-${payload.conversation_id}`;
  } else {
    return json(400, { error: 'unknown_kind' });
  }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, profile_id, endpoint, p256dh, auth')
    .in('profile_id', recipients);
  if (error) return json(500, { error: error.message });
  const rows = (subs ?? []) as SubscriptionRow[];
  if (rows.length === 0) return json(200, { ok: true, sent: 0 });

  const message = JSON.stringify({ title, body, url, tag });
  let sent = 0;
  const gone: string[] = [];
  await Promise.all(rows.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message, { TTL: 3600 });
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) gone.push(sub.id);
      else console.error('[push-dispatch] send failed', status, (err as Error)?.message);
    }
  }));
  if (gone.length > 0) await admin.from('push_subscriptions').delete().in('id', gone);
  if (sent > 0) await admin.from('push_subscriptions').update({ last_seen_at: new Date().toISOString() }).in('id', rows.filter((r) => !gone.includes(r.id)).map((r) => r.id));
  return json(200, { ok: true, sent, removed: gone.length });
});
