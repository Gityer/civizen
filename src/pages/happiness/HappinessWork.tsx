import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadHappinessWorkDomainSummary } from '@/lib/happiness/workspace';
import type { HappinessLevel, HappinessTrend } from '@/lib/happiness/types';
import { cn } from '@/lib/utils';
import { useWorkFulfillmentWorkspace } from '@/lib/work-fulfillment/use-work-fulfillment';

import { HappinessShell } from './HappinessShell';
import { WorkCurrentSection } from './HappinessWorkCurrent';
import { WorkFitSection } from './HappinessWorkFit';
import { WorkImproveSection } from './HappinessWorkImprove';
import { WorkJoySection } from './HappinessWorkJoy';
import { WorkOverviewSection } from './HappinessWorkOverview';

const SECTIONS = ['overview', 'current', 'joy', 'fit', 'improve'] as const;
type Section = (typeof SECTIONS)[number];

function isSection(value: string | null): value is Section {
  return Boolean(value && (SECTIONS as readonly string[]).includes(value));
}

export default function HappinessWork() {
  const { t } = useLanguage();
  const { profile, loading: authLoading } = useAuth();
  const { result, loading, error, reload } = useWorkFulfillmentWorkspace(profile?.id);
  const [happiness, setHappiness] = useState<{
    workLevel: HappinessLevel | null;
    trendDirection: HappinessTrend | null;
  } | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const section = isSection(searchParams.get('section')) ? (searchParams.get('section') as Section) : 'overview';

  useEffect(() => {
    if (!profile?.id) {
      setHappiness(null);
      return;
    }
    let cancelled = false;
    void loadHappinessWorkDomainSummary(profile.id)
      .then((next) => {
        if (!cancelled) setHappiness(next);
      })
      .catch(() => {
        if (!cancelled) setHappiness(null);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </AppLayout>
    );
  }

  if (!profile?.id) {
    return (
      <AppLayout>
        <div className="px-4 py-6">
          <p className="text-sm text-muted-foreground">{t('happiness.signIn')}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <HappinessShell titleKey="happiness.workTitle" privateHint fallbackPath="/happiness">
      {result?.backendMissing ? (
        <Card className="rounded-2xl border-border/60 p-4 text-sm text-muted-foreground">{t('happiness.backendUnavailable')}</Card>
      ) : null}
      {error ? <Card className="rounded-2xl border-destructive/40 p-4 text-sm text-destructive">{error}</Card> : null}

      <Tabs
        value={section}
        onValueChange={(value) => setSearchParams(value === 'overview' ? {} : { section: value })}
        className="w-full min-w-0"
      >
        <div className="-mx-4 min-w-0 overflow-x-auto overscroll-x-contain px-4 [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
          <TabsList
            aria-label={t('happiness.workTitle')}
            className="inline-flex h-auto w-max min-w-full justify-start gap-0 rounded-none border-b border-border/60 bg-transparent p-0 text-foreground shadow-none"
          >
            {SECTIONS.map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-2.5 py-2 text-xs font-medium shadow-none',
                  'text-muted-foreground hover:text-foreground',
                  'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
                  'sm:px-3 sm:text-sm',
                )}
              >
                {t(`happiness.work.sections.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {section === 'overview' ? (
        <WorkOverviewSection t={t} happiness={happiness} work={result} onGo={(next) => setSearchParams({ section: next })} />
      ) : null}
      {section === 'current' ? <WorkCurrentSection t={t} profileId={profile.id} work={result} onSaved={() => void reload()} /> : null}
      {section === 'joy' ? <WorkJoySection t={t} profileId={profile.id} work={result} onSaved={() => void reload()} /> : null}
      {section === 'fit' ? (
        <WorkFitSection t={t} profileId={profile.id} work={result} onSaved={() => void reload()} onExplore={() => setSearchParams({ section: 'improve' })} />
      ) : null}
      {section === 'improve' ? (
        <WorkImproveSection t={t} profileId={profile.id} work={result} onSaved={() => void reload()} />
      ) : null}

      <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link to="/happiness" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t('happiness.navTitle')}
        </Link>
        <Link to="/happiness/privacy" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {t('happiness.openPrivacy')}
        </Link>
      </p>
    </HappinessShell>
  );
}
