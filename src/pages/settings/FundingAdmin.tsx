import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  parseFundingAdminSection,
  resolveFundingAdminSection,
  visibleFundingAdminSections,
  type FundingAdminSection,
} from '@/lib/funding/admin-sections';
import { cn } from '@/lib/utils';

import FundingBudgetAdmin from '@/pages/settings/FundingBudgetAdmin';

const FundingProgramPlanAdmin = lazy(() => import('@/pages/settings/FundingProgramPlanAdmin'));
const FundingEconomicsAdmin = lazy(() => import('@/pages/settings/FundingEconomicsAdmin'));
const FundingOverviewAdmin = lazy(() => import('@/pages/settings/FundingOverviewAdmin'));
const FundingSourcesAdmin = lazy(() => import('@/pages/settings/FundingSourcesAdmin'));
const FundingInterestAdmin = lazy(() => import('@/pages/settings/FundingInterestAdmin'));

const SECTION_LABEL_KEY: Record<FundingAdminSection, string> = {
  budget: 'settings.adminFundingSectionBudget',
  'program-plan': 'settings.adminFundingSectionProgramPlan',
  economics: 'settings.adminFundingSectionEconomics',
  overview: 'settings.adminFundingSectionOverview',
  sources: 'settings.adminFundingSectionSources',
  interest: 'settings.adminFundingSectionInterest',
};

/** Funding workspace: Budget, Program plan, Economics, Overview, Sources ledger and Interest. The legacy capital-ledger tools are retired (Phase 6 step 6.4). */
export default function FundingAdmin() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabTriggerRefs = useRef<Partial<Record<FundingAdminSection, HTMLButtonElement | null>>>({});

  const resolved = useMemo(() => resolveFundingAdminSection({ sectionParam: searchParams.get('section') }), [searchParams]);
  const section = resolved.section;
  const visibleSections = useMemo(() => visibleFundingAdminSections(), []);

  useEffect(() => {
    if (!resolved.redirected && !searchParams.has('legacy')) return;
    setSearchParams(section === 'budget' ? {} : { section }, { replace: true });
  }, [resolved.redirected, searchParams, section, setSearchParams]);

  const setSection = (next: FundingAdminSection) => {
    if (next === section) return;
    setSearchParams(next === 'budget' ? {} : { section: next }, { replace: true });
  };

  useEffect(() => {
    const active = tabTriggerRefs.current[section];
    if (!active) return;
    active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [section]);

  return (
    <AppLayout>
      <div className="min-w-0 space-y-4 overflow-x-clip px-4 py-6 pb-24 md:pb-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 space-y-3">
          <AppPageHeader
            title={t('settings.adminFunding')}
            subtitle={t('settings.adminFundingDescription')}
            fallbackPath="/settings"
            leading={
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Coins className="h-6 w-6" />
              </div>
            }
          />

          <div className="space-y-1 md:hidden" data-build-key="fundingSectionPickerMobile">
            <Label htmlFor="funding-section-picker">{t('settings.adminFundingSection')}</Label>
            <select
              id="funding-section-picker"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={section}
              aria-label={t('settings.adminFundingSection')}
              onChange={(e) => setSection(parseFundingAdminSection(e.target.value))}
            >
              {visibleSections.map((item) => (
                <option key={item} value={item}>{t(SECTION_LABEL_KEY[item])}</option>
              ))}
            </select>
          </div>

          <Tabs value={section} onValueChange={(value) => setSection(parseFundingAdminSection(value))} className="hidden w-full min-w-0 md:block">
            <div className="min-w-0 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
              <TabsList aria-label={t('settings.adminFundingSection')} className="inline-flex h-auto w-max min-w-full justify-start gap-0 rounded-none border-b border-border/60 bg-transparent p-0 text-foreground shadow-none">
                {visibleSections.map((item) => (
                  <TabsTrigger
                    key={item}
                    value={item}
                    ref={(node) => {
                      tabTriggerRefs.current[item] = node;
                    }}
                    className={cn(
                      'shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-2.5 py-2 text-xs font-medium shadow-none',
                      'text-muted-foreground hover:text-foreground',
                      'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
                      'focus-visible:ring-1 focus-visible:ring-ring sm:px-3 sm:text-sm',
                    )}
                  >
                    {t(SECTION_LABEL_KEY[item])}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </motion.div>

        <div className="min-w-0">
          {section === 'budget' ? (
            <FundingBudgetAdmin embedded onGoToSection={(next) => setSection(next)} />
          ) : (
            <Suspense fallback={<div className="rounded-md border border-border/60 px-3 py-6 text-sm text-muted-foreground">{t('common.loading')}</div>}>
              {section === 'program-plan' ? <FundingProgramPlanAdmin embedded onGoToSection={(next) => setSection(next)} /> : null}
              {section === 'economics' ? <FundingEconomicsAdmin embedded onGoToSection={(next) => setSection(next)} /> : null}
              {section === 'overview' ? <FundingOverviewAdmin embedded onGoToSection={(next) => setSection(next)} /> : null}
              {section === 'sources' ? <FundingSourcesAdmin embedded /> : null}
              {section === 'interest' ? <FundingInterestAdmin embedded /> : null}
            </Suspense>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
