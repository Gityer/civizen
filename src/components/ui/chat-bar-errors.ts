import { toast } from 'sonner';
import { writeRefusalMessage } from '@/lib/write-refusal';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The failure toast for a chat action: the refusal sentence (limit or moderation restriction) when the server gave one, otherwise
 * `withReasonKey` with the server's message when there is one, otherwise `failedKey`.
 */
export function toastChatFailure(
  error: { message?: string } | null | undefined,
  t: Translate,
  failedKey: string,
  withReasonKey?: string,
): void {
  const reason = error?.message?.trim();
  toast.error(writeRefusalMessage(error, t) ?? (withReasonKey && reason ? t(withReasonKey, { reason }) : t(failedKey)));
}
