import { isVerificationRequired, requestVerification } from '@/lib/identity-live';
import { restrictionMessage } from '@/lib/member-enforcement';
import { rateLimitMessage } from '@/lib/rate-limit';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The member-facing sentence when the server refused a write for a reason the member should know about: a
 * per-account limit (TD4) or a moderation restriction (TD2). Null for any other error.
 */
export function writeRefusalMessage(error: unknown, t: Translate, language?: string): string | null {
  // an unverified member: offer verification and come back here afterwards
  if (isVerificationRequired(error)) {
    requestVerification();
    return t('verify.required');
  }
  return rateLimitMessage(error, t, language) ?? restrictionMessage(error, t, language);
}
