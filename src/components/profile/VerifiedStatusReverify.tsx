import { CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useLanguage } from '@/contexts/LanguageContext';
import { verifyPath } from '@/lib/identity-live';

/**
 * The member's own Verified badge with "Verify" beside it, which starts a re-verification. A re-verification that is
 * pending or not passed never changes the current status (enforced on the server).
 */
export function VerifiedStatusReverify({ verified, returnTo }: { verified: boolean; returnTo: string }) {
  const { t } = useLanguage();
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span role="img" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
        title={t('profile.verifiedMember')} aria-label={t('profile.verifiedMember')}>
        <CheckCircle className="h-3.5 w-3.5" aria-hidden />
      </span>
      <Link to={verifyPath(returnTo, true)} title={t('verify.reverify.hint')} data-testid="identity-reverify"
        className="text-xs font-medium text-primary underline-offset-2 hover:underline">{t('verify.reverify.link')}</Link>
    </span>
  );
}
