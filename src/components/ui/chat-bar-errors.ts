import { toast } from 'sonner';
import { rateLimitMessage } from '@/lib/rate-limit';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The failure toast for a chat action: the rate-limit sentence when the server refused for that reason, otherwise
 * `withReasonKey` with the server's message when there is one, otherwise `failedKey`.
 */
export function toastChatFailure(
  error: { message?: string } | null | undefined,
  t: Translate,
  failedKey: string,
  withReasonKey?: string,
): void {
  const reason = error?.message?.trim();
  toast.error(rateLimitMessage(error, t) ?? (withReasonKey && reason ? t(withReasonKey, { reason }) : t(failedKey)));
}
