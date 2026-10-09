/**
 * Call signalling contract (voice/video calls in Messaging).
 *
 * Every member listens on a private Realtime inbox topic of their own; a signal is sent to the
 * recipient's inbox, never broadcast. Row-level security on realtime.messages (migration
 * 20261009100000) lets a member read only their own inbox and write only to inboxes of members they
 * share a private conversation with. A signal without a recipient is dropped here, not broadcast.
 */

export const CALL_INBOX_TOPIC_PREFIX = 'call-inbox:';

export const CALL_SIGNAL_EVENT = 'signal';

/** Realtime channel options for a private inbox (RLS-authorised). */
export const PRIVATE_CHANNEL_CONFIG = { config: { private: true } } as const;

export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export const TURN_CREDENTIALS_FUNCTION = 'turn-credentials';

export function callInboxTopic(profileId: string) {
  return `${CALL_INBOX_TOPIC_PREFIX}${profileId}`;
}

/** The inbox topic a signal must be delivered to, or null when it names no recipient. */
export function resolveSignalTopic(signal: { toProfileId?: string | null }): string | null {
  const recipient = signal.toProfileId?.trim();
  return recipient ? callInboxTopic(recipient) : null;
}

type IceServerLike = { urls: string | string[]; username?: string; credential?: string };

function isIceServer(value: unknown): value is IceServerLike {
  if (!value || typeof value !== 'object') return false;
  const urls = (value as { urls?: unknown }).urls;
  return typeof urls === 'string' || (Array.isArray(urls) && urls.every((u) => typeof u === 'string'));
}

/** STUN defaults plus whatever TURN servers the server handed out; malformed entries are ignored. */
export function buildRtcConfiguration(turnServers: unknown): RTCConfiguration {
  const extra = Array.isArray(turnServers) ? turnServers.filter(isIceServer) : [];
  return { iceServers: [...DEFAULT_ICE_SERVERS, ...extra] };
}

type FunctionsClient = {
  functions: { invoke: (name: string, options?: { body?: unknown }) => Promise<{ data: unknown; error: unknown }> };
};

/**
 * Fetches short-lived TURN credentials from the `turn-credentials` edge function. Without a configured
 * TURN server (or on any error) calls proceed with STUN only, exactly as before.
 */
export async function fetchRtcConfiguration(client: FunctionsClient): Promise<RTCConfiguration> {
  try {
    const { data, error } = await client.functions.invoke(TURN_CREDENTIALS_FUNCTION, { body: {} });
    if (error) return buildRtcConfiguration([]);
    const servers = (data as { iceServers?: unknown } | null)?.iceServers;
    return buildRtcConfiguration(servers);
  } catch {
    return buildRtcConfiguration([]);
  }
}

type OutboxChannel = {
  send: (message: { type: 'broadcast'; event: string; payload: unknown }) => Promise<string>;
};

type OutboxClient = {
  channel: (topic: string, options: typeof PRIVATE_CHANNEL_CONFIG) => OutboxChannel;
  removeChannel: (channel: OutboxChannel) => Promise<unknown>;
};

export type CallSignalSender = {
  /** Sends to the recipient's private inbox; resolves false when the signal names no recipient or the send failed. */
  send: (payload: { type: string; toProfileId?: string | null }) => Promise<boolean>;
  /** Removes every outbox channel this sender opened. */
  dispose: () => void;
};

/**
 * Routes each signal to its recipient's private inbox, reusing one outbox channel per recipient.
 * Sending through an unsubscribed channel goes over Realtime's HTTP broadcast endpoint, where the
 * same row-level security decides whether this member may signal that inbox.
 */
export function createCallSignalSender(client: OutboxClient): CallSignalSender {
  const outboxes = new Map<string, OutboxChannel>();
  return {
    async send(payload) {
      const topic = resolveSignalTopic(payload);
      if (!topic) {
        console.warn('Call signal without a recipient was not sent:', payload.type);
        return false;
      }
      let channel = outboxes.get(topic);
      if (!channel) {
        channel = client.channel(topic, PRIVATE_CHANNEL_CONFIG);
        outboxes.set(topic, channel);
      }
      const result = await channel.send({ type: 'broadcast', event: CALL_SIGNAL_EVENT, payload });
      if (result !== 'ok') console.error('Call signal send failed:', payload.type, result);
      return result === 'ok';
    },
    dispose() {
      for (const channel of outboxes.values()) void client.removeChannel(channel);
      outboxes.clear();
    },
  };
}
