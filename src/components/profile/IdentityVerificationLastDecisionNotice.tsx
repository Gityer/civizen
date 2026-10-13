import { AlertCircle } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { readLastIdentityDecision } from '@/lib/identity-verification-queue';

/**
 * What the reviewer told the member (v2 step C1): shown while the case is back with the member
 * after an information request, or after a rejection. Hidden once they submit again.
 */
export function IdentityVerificationLastDecisionNotice({ status, metadata }: { status: string; metadata: unknown }) {
  const { t } = useLanguage();
  const decision = readLastIdentityDecision(metadata);
  if (!decision) return null;
  const relevant =
    (decision.kind === 'info_requested' && status === 'draft') || (decision.kind === 'rejected' && status === 'rejected');
  if (!relevant) return null;

  return (
    <div className="space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="status" data-testid="identity-last-decision">
      <p className="flex items-center gap-2 font-medium text-foreground">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        {t(decision.kind === 'info_requested' ? 'identityReview.member.infoRequestedTitle' : 'identityReview.member.rejectedTitle')}
      </p>
      {decision.reasonCode ? (
        <p className="text-foreground">
          {t('identityReview.member.reasonPrefix')} {t(`identityReview.reasons.${decision.reasonCode}`)}
        </p>
      ) : null}
      {decision.message ? <p className="whitespace-pre-line text-muted-foreground">{decision.message}</p> : null}
      <p className="text-xs text-muted-foreground">{t('identityReview.member.resubmitHint')}</p>
    </div>
  );
}
