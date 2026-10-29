type Translate = (key: string, vars?: Record<string, string | number>) => string;

/** The shape of a Supabase/PostgREST error (or an Error carrying the same fields). */
type ErrorLike = { message?: unknown; code?: unknown; details?: unknown; hint?: unknown } | null | undefined;

const ACTIONS = new Set(['post', 'comment', 'conversation', 'message', 'report']);

/**
 * Per-account limits (PM decision TD4) refuse a write with SQLSTATE PT429: the action in `details`, the time it is
 * allowed again in `hint`. Null for any other error.
 */
export function rateLimitInfo(value: unknown): { action: string; retryAt: Date | null } | null {
  if (!value || typeof value !== 'object') return null;
  const error = value as NonNullable<ErrorLike>;
  if (error.code !== 'PT429') return null;
  const action = typeof error.details === 'string' ? error.details : '';
  const retry = typeof error.hint === 'string' ? new Date(error.hint) : null;
  return { action, retryAt: retry && !Number.isNaN(retry.getTime()) ? retry : null };
}

/** The member-facing sentence for a rate-limit refusal, or null when the error is something else. */
export function rateLimitMessage(error: unknown, t: Translate, language?: string): string | null {
  const info = rateLimitInfo(error);
  if (!info) return null;
  const time = info.retryAt
    ? info.retryAt.toLocaleTimeString(language || undefined, { hour: '2-digit', minute: '2-digit' })
    : '—';
  return t(ACTIONS.has(info.action) ? `rateLimit.${info.action}` : 'rateLimit.generic', { time });
}

/** Keeps the PostgREST fields on a thrown Error so the screen that catches it can still recognise a rate limit. */
export function errorWithFields(message: string, error: ErrorLike): Error {
  return Object.assign(new Error(message), { code: error?.code, details: error?.details, hint: error?.hint });
}
