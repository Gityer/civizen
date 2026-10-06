import { motion } from 'framer-motion';
import { Coins, MoreHorizontal } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { canFinanceAdmin } from '@/lib/finance/permissions';
import {
  FUNDING_ADMIN_LEGACY_SECTIONS,
  isFundingAdminLegacySection,
  parseFundingAdminSection,
  resolveFundingAdminSection,
  visibleFundingAdminSections,
  type FundingAdminSection,
} from '@/lib/funding/admin-sections';
import { cn } from '@/lib/utils';

/** Default tab stays eager so Budget does not wait on other sections. */
import FundingBudgetAdmin from '@/pages/settings/FundingBudgetAdmin';

const FundingProgramPlanAdmin = lazy(() => import('@/pages/settings/FundingProgramPlanAdmin'));
const FundingEconomicsAdmin = lazy(() => import('@/pages/settings/FundingEconomicsAdmin'));
const FundingOverviewAdmin = lazy(() => import('@/pages/settings/FundingOverviewAdmin'));
const FundingSourcesAdmin = lazy(() => import('@/pages/settings/FundingSourcesAdmin'));
const FundingInterestAdmin = lazy(() => import('@/pages/settings/FundingInterestAdmin'));
const FundingLedgerAdmin = lazy(() => import('@/pages/settings/FundingLedgerAdmin'));
const FundingAuditAdmin = lazy(() => import('@/pages/settings/FundingAuditAdmin'));
const FundingComplianceAdmin = lazy(() => import('@/pages/settings/FundingComplianceAdmin'));
const FundingContributorsAdmin = lazy(() => import('@/pages/settings/FundingContributorsAdmin'));

const SECTION_LABEL_KEY: Record<FundingAdminSection, string> = {
  budget: 'settings.adminFundingSectionBudget',
  'program-plan': 'settings.adminFundingSectionProgramPlan',
  economics: 'settings.adminFundingSectionEconomics',
  overview: 'settings.adminFundingSectionOverview',
  sources: 'settings.adminFundingSectionSources',
  interest: 'settings.adminFundingSectionInterest',
  ledger: 'settings.adminFundingSectionLedger',
  audit: 'settings.adminFundingSectionAudit',
  compliance: 'settings.adminFundingSectionCompliance',
  contributors: 'settings.adminFundingSectionContributors',
};

export default function FundingAdmin() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const permissions = profile?.effective_permissions || [];
  const allowLegacyTools = canFinanceAdmin(permissions);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabTriggerRefs = useRef<Partial<Record<FundingAdminSection, HTMLButtonElement | null>>>({});

  const resolved = useMemo(
    () =>
      resolveFundingAdminSection({
        sectionParam: searchParams.get('section'),
        legacyParam: searchParams.get('legacy'),
      }),
    [searchParams],
  );

  // Legacy tools remain on ?legacy=1 but only for finance.admin.
  const legacyMode = allowLegacyTools && resolved.legacyMode;
  const section =
    !allowLegacyTools && isFundingAdminLegacySection(resolved.section)
      ? 'budget'
      : resolved.section;
  const visibleSections = useMemo(() => visibleFundingAdminSections(legacyMode), [legacyMode]);

  useEffect(() => {
    if (!resolved.redirectedFromLegacy) return;
    setSearchParams({}, { replace: true });
  }, [resolved.redirectedFromLegacy, setSearchParams]);

  useEffect(() => {
    if (allowLegacyTools) return;
    if (searchParams.get('legacy') !== '1' && searchParams.get('legacy') !== 'true') return;
    const params = new URLSearchParams(searchParams);
    params.delete('legacy');
    if (isFundingAdminLegacySection(params.get('section'))) params.delete('section');
    setSearchParams(params, { replace: true });
  }, [allowLegacyTools, searchParams, setSearchParams]);

  const setSection = (next: FundingAdminSection) => {
    if (next === section && !(isFundingAdminLegacySection(next) && !legacyMode)) return;
    if (isFundingAdminLegacySection(next) && !allowLegacyTools) return;
    const params = new URLSearchParams();
    if (next !== 'budget') params.set('section', next);
    if (legacyMode || isFundingAdminLegacySection(next)) params.set('legacy', '1');
    setSearchParams(params, { replace: true });
  };

  const enableLegacyMode = () => {
    if (!allowLegacyTools) return;
    const params = new URLSearchParams(searchParams);
    params.set('legacy', '1');
    if (!params.get('section') || params.get('section') === 'budget' || params.get('section') === 'overview') {
      params.set('section', FUNDING_ADMIN_LEGACY_SECTIONS[0]);
    }
    setSearchParams(params, { replace: true });
  };

  const disableLegacyMode = () => {
    setSearchParams(section === 'budget' || isFundingAdminLegacySection(section) ? {} : { section }, {
      replace: true,
    });
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
          <div className="flex min-w-0 items-start justify-between gap-2">
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
            {allowLegacyTools || legacyMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="mt-1 shrink-0"
                    aria-label={t('settings.adminFundingAdvancedMenu')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {legacyMode ? (
                    <DropdownMenuItem onSelect={disableLegacyMode}>
                      {t('settings.adminFundingLegacyHide')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={enableLegacyMode}>
                      {t('settings.adminFundingLegacyShow')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {legacyMode ? (
            <div
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
              data-build-key="fundingLegacyBanner"
              data-build-label="Legacy funding experimental banner"
            >
              <p className="font-medium">{t('settings.adminFundingLegacyBannerTitle')}</p>
              <p className="mt-1 text-xs opacity-90">{t('settings.adminFundingLegacyBannerBody')}</p>
              <button
                type="button"
                className="mt-2 text-xs font-medium underline underline-offset-2"
                onClick={disableLegacyMode}
              >
                {t('settings.adminFundingLegacyHide')}
              </button>
            </div>
          ) : null}

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
                <option key={item} value={item}>
                  {t(SECTION_LABEL_KEY[item])}
                  {isFundingAdminLegacySection(item) ? ` (${t('settings.adminFundingLegacyTag')})` : ''}
                </option>
              ))}
            </select>
          </div>

          <Tabs
            value={section}
            onValueChange={(value) => setSection(parseFundingAdminSection(value))}
            className="hidden w-full min-w-0 md:block"
          >
            <div className="min-w-0 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
              <TabsList
                aria-label={t('settings.adminFundingSection')}
                className="inline-flex h-auto w-max min-w-full justify-start gap-0 rounded-none border-b border-border/60 bg-transparent p-0 text-foreground shadow-none"
              >
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
                      isFundingAdminLegacySection(item) && 'opacity-80',
                    )}
                  >
                    {t(SECTION_LABEL_KEY[item])}
                    {isFundingAdminLegacySection(item) ? ` (${t('settings.adminFundingLegacyTag')})` : ''}
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
            <Suspense
              fallback={
                <div className="rounded-md border border-border/60 px-3 py-6 text-sm text-muted-foreground">
                  {t('common.loading')}
                </div>
              }
            >
              {section === 'program-plan' ? (
                <FundingProgramPlanAdmin embedded onGoToSection={(next) => setSection(next)} />
              ) : null}
              {section === 'economics' ? (
                <FundingEconomicsAdmin embedded onGoToSection={(next) => setSection(next)} />
              ) : null}
              {section === 'overview' ? (
                <FundingOverviewAdmin
                  embedded
                  onGoToSection={(next) => setSection(next)}
                />
              ) : null}
              {section === 'sources' ? <FundingSourcesAdmin embedded /> : null}
              {section === 'interest' ? <FundingInterestAdmin embedded /> : null}
              {section === 'ledger' ? <FundingLedgerAdmin embedded /> : null}
              {section === 'audit' ? <FundingAuditAdmin embedded /> : null}
              {section === 'compliance' ? <FundingComplianceAdmin embedded /> : null}
              {section === 'contributors' ? <FundingContributorsAdmin embedded /> : null}
            </Suspense>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
