import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { IdentityVerificationCaseStatus } from '@/lib/identity-verification-types';
import { loadMyVerificationState, verifyPath, type VerificationState } from '@/lib/identity-live';
import { getVerificationCaseBadgeClassName, getVerificationCaseStatusLabelKey } from '@/lib/verification-workflow';
import { IdentityVerificationLastDecisionNotice } from './IdentityVerificationLastDecisionNotice';

/** Settings › Edit Profile: where the member's identity verification stands, and the way into the live check at /verify. */
export function IdentityVerificationSettingsSection() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [state, setState] = useState<VerificationState | null>(null);
  const [failed, setFailed] = useState(false);
  const profileId = profile?.id ?? null;

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    loadMyVerificationState()
      .then((next) => { if (alive) setState(next); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [profileId]);

  if (!profileId) return null;

  const verified = Boolean(profile?.is_verified) || Boolean(state?.verified);
  const status = (verified ? 'approved' : state?.status ?? 'draft') as IdentityVerificationCaseStatus;
  const waiting = status === 'submitted' || status === 'in_review';
  const pendingCase = state?.status === 'submitted' || state?.status === 'in_review';
  const reverifyNote = verified && state?.reverification
    ? (pendingCase ? 'verify.reverify.pending' : state.status === 'rejected' ? 'verify.reverify.notPassed' : null) : null;

  return (
    <Card className="space-y-4 rounded-3xl border-border/60 p-5 shadow-sm" data-build-key="editProfileIdentityVerification"
      data-build-label="Identity verification" data-testid="identity-verification-settings">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{t('editProfile.identityVerification.title')}</h2>
          <Badge variant="outline" className={`rounded-full ${getVerificationCaseBadgeClassName(status)}`}>
            {t(verified ? 'governanceHub.identityVerification.badgeVerified' : getVerificationCaseStatusLabelKey(status))}
          </Badge>
          {verified && !(state?.reverification && pendingCase) ? (
            <Link to={verifyPath('/settings/profile', true)} title={t('verify.reverify.hint')} data-testid="identity-reverify-settings"
              className="text-sm font-medium text-primary underline-offset-2 hover:underline">{t('verify.reverify.link')}</Link>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {t(verified ? 'editProfile.identityVerification.verifiedBody' : waiting ? 'verify.sent.body' : 'verify.subtitle')}
        </p>
        {reverifyNote ? <p className="text-sm text-muted-foreground" data-testid="identity-reverify-note">{t(reverifyNote)}</p> : null}
      </div>
      {!state && !failed && !verified ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /><span>{t('common.loading')}</span>
        </div>
      ) : null}
      {failed ? <p className="text-sm text-destructive">{t('editProfile.identityVerification.loadFailed')}</p> : null}
      {state && !verified ? <IdentityVerificationLastDecisionNotice status={status} metadata={{ last_decision: state.lastDecision }} /> : null}
      {!verified && !waiting ? (
        <Button asChild className="gap-2" data-testid="identity-verification-start">
          <Link to={verifyPath('/settings/profile')}><ShieldCheck className="h-4 w-4" aria-hidden />{t('verify.prompt.start')}</Link>
        </Button>
      ) : null}
    </Card>
  );
}
