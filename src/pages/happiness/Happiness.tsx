import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { recordActionOutcome } from '@/lib/happiness/api';
import { useHappinessWorkspace } from '@/lib/happiness/use-happiness';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { HappinessFulfillmentHome } from './HappinessFulfillmentHome';
import { HappinessShell } from './HappinessShell';
import { CheckInHistory, ImprovementHistory, LifeAreas, Overview, Trends } from './HappinessSections';

const SECTIONS = ['overview', 'areas', 'checkins', 'trends', 'improvement'] as const;
type Section = (typeof SECTIONS)[number];

function isSection(value: string | null): value is Section {
  return Boolean(value && (SECTIONS as readonly string[]).includes(value));
}

export default function Happiness() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { result, loading, error, reload } = useHappinessWorkspace(profile?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const section = isSection(searchParams.get('section')) ? (searchParams.get('section') as Section) : 'overview';
  const locale = language === 'en' ? 'en-US' : language;

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

  const view = result?.view;
  const privacy = result?.privacy;

  return (
    <HappinessShell showBack={false} fallbackPath="/">
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
              aria-label={t('happiness.detailsLabel')}
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
                  {t(`happiness.sections.${value}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {section === 'overview' ? (
          <Overview
            t={t}
            locale={locale}
            view={view}
            checkIns={result?.checkIns ?? []}
            causes={result?.causes ?? []}
            checkinsEnabled={privacy?.checkinsEnabled !== false}
            onCheckIn={() => navigate('/happiness/check-in')}
            onReview={() => navigate('/happiness/review')}
            onImprove={() => navigate('/happiness/improve')}
            onFollowUp={async (actionId, helped, comment) => {
              await recordActionOutcome(profile.id, actionId, helped, comment);
              toast.success(t('happiness.followUpSaved'));
              await reload();
            }}
          />
        ) : null}

        {section === 'areas' ? <LifeAreas t={t} domainLevels={view?.domainLevels ?? {}} /> : null}

        {section === 'checkins' ? (
          <CheckInHistory
            t={t}
            locale={locale}
            checkIns={result?.checkIns ?? []}
            causes={result?.causes ?? []}
            enabled={privacy?.checkinsEnabled !== false}
            onCheckIn={() => navigate('/happiness/check-in')}
          />
        ) : null}

        {section === 'trends' ? <Trends t={t} view={view} /> : null}

        {section === 'improvement' ? (
          <>
            <HappinessFulfillmentHome
              t={t}
              profileId={profile.id}
              actions={result?.actions ?? []}
              outcomes={result?.outcomes ?? []}
              attentionDomains={view?.attentionDomains ?? []}
              onStart={() => navigate('/happiness/improve')}
            />
            <ImprovementHistory
              t={t}
              locale={locale}
              actions={(result?.actions ?? []).filter((action) => !action.planId)}
              outcomes={result?.outcomes ?? []}
              onImprove={() => navigate('/happiness/improve')}
              onFollowUp={async (actionId, helped, comment) => {
                await recordActionOutcome(profile.id, actionId, helped, comment);
                toast.success(t('happiness.followUpSaved'));
                await reload();
              }}
            />
          </>
        ) : null}

        <p className="text-sm">
          <Link to="/happiness/work" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {t('happiness.openWorkFulfillment')}
          </Link>
        </p>
    </HappinessShell>
  );
}
