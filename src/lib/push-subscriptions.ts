import { supabase } from '@/integrations/supabase/client';

export type PushState = 'unsupported' | 'denied' | 'enabled' | 'disabled' | 'unconfigured';

const SW_PATH = '/push-sw.js';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Converts the VAPID public key (base64url) into the bytes PushManager.subscribe expects. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH);
}

async function vapidPublicKey(): Promise<string | null> {
  const { data, error } = await supabase.rpc('push_vapid_public_key');
  if (error || typeof data !== 'string' || !data) return null;
  return data;
}

/** What this device is doing right now. */
export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (!(await vapidPublicKey())) return 'unconfigured';
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub ? 'enabled' : 'disabled';
}

type SubscriptionJson = { endpoint: string; keys?: { p256dh?: string; auth?: string } };

/** Asks permission, subscribes this browser and stores the subscription for the member (Phase 7 step 7.2). */
export async function enablePush(profileId: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const key = await vapidPublicKey();
  if (!key) return 'unconfigured';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const json = sub.toJSON() as SubscriptionJson;
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('subscription_incomplete');
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ profile_id: profileId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 200), last_seen_at: new Date().toISOString() }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
  return 'enabled';
}

/** Unsubscribes this browser and forgets the subscription. */
export async function disablePush(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  return 'disabled';
}
