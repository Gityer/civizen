import { Suspense } from 'react';

import { GovernanceMember, PublicGovernanceLanding } from '@/app-routes/lazy-pages';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

function Loading() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
    </div>
  );
}

/**
 * `/governance` is one surface: signed-in members get their Governance page (Open votes · My votes ·
 * Proposals · Results · Tools), guests get the public landing. Step 2.3 of the implementation plan.
 */
export default function GovernanceEntry() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Suspense fallback={<Loading />}>{user ? <GovernanceMember /> : <PublicGovernanceLanding />}</Suspense>;
}
