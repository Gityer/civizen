import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { PROGRAM_PLAN_SUMMARY } from '@/lib/funding/program-plan-summary.generated';
import type { FundingAdminPrimarySection } from '@/lib/funding/admin-sections';

type FundingProgramPlanAdminProps = {
  embedded?: boolean;
  onGoToSection?: (section: FundingAdminPrimarySection) => void;
};

type FiveYearPeriod = 'total' | '1' | '2' | '3' | '4' | '5';

function formatUsdM(n: number): string {
  return `~$${n}M`;
}

function formatUsdB(n: number): string {
  const rounded = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
  return `~$${rounded}B`;
}

/**
 * Read-only Program plan summaries from the canonical generated artifact.
 * Five-year first-wave is primary; validation is a linked subprogram — not an approvable master ledger.
 */
export default function FundingProgramPlanAdmin({
  onGoToSection,
}: FundingProgramPlanAdminProps = {}) {
  const { t } = useLanguage();
  const plan = PROGRAM_PLAN_SUMMARY;
  const [showLongRangeNumbers, setShowLongRangeNumbers] = useState(false);
  const [showWorkstreams, setShowWorkstreams] = useState(false);
  const [fiveYearPeriod, setFiveYearPeriod] = useState<FiveYearPeriod>('total');

  if (!plan?.validation || !plan?.fiveYearFirstWave) {
    return (
      <Card className="space-y-2 p-4" data-build-key="fundingProgramPlanError">
        <h2 className="text-sm font-semibold">{t('settings.adminFundingProgramPlanTitle')}</h2>
        <p className="text-sm text-destructive" role="alert">
          {t('settings.adminFundingProgramPlanLoadError')}
        </p>
      </Card>
    );
  }

  const v = plan.validation;
  const f = plan.fiveYearFirstWave;
  const longRange = plan.longRangeOutlook;
  const selectedYearRow =
    fiveYearPeriod === 'total'
      ? null
      : f.annualBaseCashflowUsdB.find((row) => String(row.year) === fiveYearPeriod) ?? null;

  return (
    <div className="space-y-4" data-build-key="fundingProgramPlanAdmin" data-build-label="Funding program plan">
      <Card className="space-y-3 p-4" data-build-key="fundingProgramPlanFiveYearPrimary">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{t('settings.adminFundingProgramPlanTitle')}</h2>
              <Badge variant="outline">{t('settings.adminFundingProgramPlanStatusEcosystem')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.adminFundingProgramPlanLead')}</p>
            <p className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanNotWorldwide')}</p>
          </div>
          <div className="min-w-48 space-y-1">
            <label htmlFor="program-plan-year" className="text-xs text-muted-foreground">
              {t('settings.adminFundingProgramPlanPeriod')}
            </label>
            <select
              id="program-plan-year"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={fiveYearPeriod}
              onChange={(e) => setFiveYearPeriod(e.target.value as FiveYearPeriod)}
            >
              <option value="total">{t('settings.adminFundingProgramPlanPeriodTotal')}</option>
              {f.annualBaseCashflowUsdB.map((row) => (
                <option key={row.year} value={String(row.year)}>
                  {t('settings.adminFundingProgramPlanYear')} {row.year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanEcosystemSplit')}</p>

        {fiveYearPeriod === 'total' ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-border/60 p-2">
              <dt className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanPlanningRange')}</dt>
              <dd className="font-medium">
                {t('settings.adminFundingProgramPlanFiveYearRange')
                  .replace('{low}', String(f.rangeUsdB.lowRounded))
                  .replace('{high}', String(f.rangeUsdB.highRounded))}
              </dd>
            </div>
            <div className="rounded-md border border-border/60 p-2">
              <dt className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanFiveYearBase')}</dt>
              <dd className="font-medium">{formatUsdB(f.modeledBaseUsdB)}</dd>
            </div>
          </dl>
        ) : selectedYearRow ? (
          <div className="space-y-1 rounded-md border border-border/60 p-3">
            <p className="text-sm font-medium">
              {t('settings.adminFundingProgramPlanYear')} {selectedYearRow.year}:{' '}
              {formatUsdB(selectedYearRow.amountUsdB)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('settings.adminFundingProgramPlanYearAmountNote')}
            </p>
          </div>
        ) : null}

        {fiveYearPeriod === 'total' ? (
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[18rem] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-1 pr-2">{t('settings.adminFundingProgramPlanYear')}</th>
                  <th className="py-1">{t('settings.adminFundingProgramPlanCashflow')}</th>
                </tr>
              </thead>
              <tbody>
                {f.annualBaseCashflowUsdB.map((row) => (
                  <tr key={row.year} className="border-b border-border/40">
                    <td className="py-1 pr-2">
                      {t('settings.adminFundingProgramPlanYear')} {row.year}
                    </td>
                    <td className="py-1">{formatUsdB(row.amountUsdB)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div>
          <h3 className="text-xs font-medium text-muted-foreground">
            {t('settings.adminFundingProgramPlanResponsibility')}
          </h3>
          <ul className="mt-1 space-y-1 text-sm">
            <li>
              {t('settings.adminFundingProgramPlanCorePrimary')}: {formatUsdB(f.corePrimaryResponsibleUsdB)}
              <span className="ml-1 text-xs text-muted-foreground">
                ({t('settings.adminFundingProgramPlanPeriodTotal')})
              </span>
            </li>
            <li>
              {t('settings.adminFundingProgramPlanCoreRaise')}: {formatUsdB(f.coreMustRaiseUsdB)}
              <span className="ml-1 text-xs text-muted-foreground">
                ({t('settings.adminFundingProgramPlanPeriodTotal')})
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-medium text-muted-foreground">
            {t('settings.adminFundingProgramPlanMajorComponents')}
          </h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            <li>{t('settings.adminFundingProgramPlanComponentPlatform')}</li>
            <li>{t('settings.adminFundingProgramPlanComponentDomains')}</li>
            <li>{t('settings.adminFundingProgramPlanComponentAssurance')}</li>
            <li>{t('settings.adminFundingProgramPlanComponentReserves')}</li>
            <li>{t('settings.adminFundingProgramPlanComponentOperators')}</li>
          </ul>
        </div>

        {'domainLayers' in f && f.domainLayers ? (
          <div className="space-y-2 rounded-md border border-border/60 p-3" data-build-key="fundingProgramPlanDomainLayers">
            <h3 className="text-xs font-medium text-muted-foreground">
              {t('settings.adminFundingProgramPlanDomainLayers')}
            </h3>
            <p className="text-xs text-muted-foreground">{f.domainLayers.frameworkVsDeployment}</p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-md border border-border/40 p-2">
                <dt className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanHealthFramework')}</dt>
                <dd className="font-medium">{formatUsdM(f.domainLayers.health.frameworkSdHeaUsdM)}</dd>
                <dd className="mt-1 text-xs text-muted-foreground">
                  {t('settings.adminFundingProgramPlanHealthJpIi')}: {formatUsdM(f.domainLayers.health.jpIiProvisionalDeploymentUsdM)}
                  {' · '}
                  {t('settings.adminFundingProgramPlanNotWorldwideHealth')}
                </dd>
              </div>
              <div className="rounded-md border border-border/40 p-2">
                <dt className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanInsuranceFramework')}</dt>
                <dd className="font-medium">{formatUsdM(f.domainLayers.insuranceSystems.sdInsFrameworkUsdM)}</dd>
                <dd className="mt-1 text-xs text-muted-foreground">
                  {t('settings.adminFundingProgramPlanInsuranceCarve')}: {f.domainLayers.insuranceSystems.fundingSource}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              {t('settings.adminFundingProgramPlanSharedVsLocal')}: {f.domainLayers.responsibility.shared}
              {' / '}
              {f.domainLayers.responsibility.jurisdictionalInstitutional}
            </p>
          </div>
        ) : null}

        <div className="rounded-md border border-border/60 p-3" data-build-key="fundingProgramPlanValidationLink">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium">{t('settings.adminFundingProgramPlanValidationSubprogram')}</p>
              <p className="text-xs text-muted-foreground">
                {t('settings.adminFundingProgramPlanValidationSubprogramDetail')
                  .replace('{base}', formatUsdM(v.totalsUsdM.base))
                  .replace('{duration}', String(v.durationMonths))}
              </p>
            </div>
            {onGoToSection ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onGoToSection('budget')}>
                {t('settings.adminFundingProgramPlanViewValidationBudget')}
              </Button>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('settings.adminFundingProgramPlanModelMeta')
            .replace('{version}', plan.modelVersion)
            .replace('{date}', plan.generatedAt)}
        </p>
      </Card>

      <Card className="space-y-3 p-4" data-build-key="fundingProgramPlanValidationDetail">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium">{t('settings.adminFundingProgramPlanValidation')}</h3>
          <Badge variant="outline">{t('settings.adminFundingProgramPlanStatusWorking')}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanValidationRole')}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-md border border-border/60 p-2">
            <dt className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanLow')}</dt>
            <dd className="font-medium">{formatUsdM(v.totalsUsdM.low)}</dd>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <dt className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanBase')}</dt>
            <dd className="font-medium">{formatUsdM(v.totalsUsdM.base)}</dd>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <dt className="text-xs text-muted-foreground">{t('settings.adminFundingProgramPlanHigh')}</dt>
            <dd className="font-medium">{formatUsdM(v.totalsUsdM.high)}</dd>
          </div>
        </dl>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground">
            {t('settings.adminFundingProgramPlanFundingCategories')}
          </h4>
          <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2">
            <li>
              {t('settings.adminFundingProgramPlanCatCore')}: {formatUsdM(v.fundingControlBaseUsdM.core)}
            </li>
            <li>
              {t('settings.adminFundingProgramPlanCatIndependent')}:{' '}
              {formatUsdM(v.fundingControlBaseUsdM.independent)}
            </li>
            <li>
              {t('settings.adminFundingProgramPlanCatGrants')}:{' '}
              {formatUsdM(v.fundingControlBaseUsdM.grant_pass_through)}
            </li>
            <li>
              {t('settings.adminFundingProgramPlanCatReserve')}: {formatUsdM(v.fundingControlBaseUsdM.reserve)}
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium text-muted-foreground">
            {t('settings.adminFundingProgramPlanPacing')}
          </h4>
          <ul className="mt-1 space-y-0.5 text-sm">
            {v.baseTranchePacing.map((row) => (
              <li key={row.id}>
                {row.label}: {formatUsdM(row.indicativeDirectUsdM)} (~{Math.round(row.shareOfBase * 100)}%)
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{v.fundingControlsNote}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setShowWorkstreams((x) => !x)}>
            {showWorkstreams
              ? t('settings.adminFundingProgramPlanHideWorkstreams')
              : t('settings.adminFundingProgramPlanShowWorkstreams')}
          </Button>
          {onGoToSection ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onGoToSection('budget')}>
              {t('settings.adminFundingProgramPlanViewValidationBudget')}
            </Button>
          ) : null}
        </div>
        {showWorkstreams ? (
          <p className="text-xs text-muted-foreground">
            {t('settings.adminFundingProgramPlanWorkstreamsNote')
              .replace('{count}', String(v.workstreamCount))
              .replace('{doc}', v.workstreamsDoc)}
          </p>
        ) : null}
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-medium">{t('settings.adminFundingProgramPlanLongRange')}</h3>
        <p className="text-sm text-muted-foreground">{longRange.defaultStatement}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowLongRangeNumbers((x) => !x)}
        >
          {showLongRangeNumbers
            ? t('settings.adminFundingProgramPlanHideAdvanced')
            : t('settings.adminFundingProgramPlanShowAdvanced')}
        </Button>
        {showLongRangeNumbers ? (
          <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <Badge variant="outline">{t('settings.adminFundingProgramPlanLowConfidence')}</Badge>
            <p className="text-xs text-muted-foreground">{longRange.sensitivityNote}</p>
            {longRange.scenariosUsdB ? (
              <ul className="space-y-1">
                <li>
                  {t('settings.adminFundingProgramPlanScenario10y')}:{' '}
                  {formatUsdB(longRange.scenariosUsdB.baseYears1to10)}
                </li>
                <li>
                  {t('settings.adminFundingProgramPlanScenario20y')}:{' '}
                  {formatUsdB(longRange.scenariosUsdB.baseYears1to20)}
                </li>
              </ul>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
