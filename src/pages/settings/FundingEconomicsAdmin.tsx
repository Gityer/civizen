import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { ECONOMICS_PAGE_SECTION_ORDER } from '@/lib/funding/economics-page-layout';
import {
  BASE_FPP_ELIGIBLE_BY_VEHICLE_USD_M,
  DEFAULT_COMMERCIAL_SCENARIO,
  DEFAULT_HORIZON_YEARS,
  DEFAULT_INVESTOR_ILLUSTRATION_USD_M,
  DEFAULT_PRIVATE_CAPITAL_CASE,
  ECONOMICS_CURRENCY,
  ECONOMICS_DOC_REFS,
  ECONOMICS_MODEL_AS_OF,
  ECONOMICS_MODEL_VERSION,
  FLOORED_ANNUAL_SUM_ASSUMPTION,
  buildAnnualProjection,
  buildContributorIllustration,
  buildInvestorIllustration,
  commercialCapitalSourcesAndUsesBase,
  economicsSummary,
  policyFormulaExample,
  reconcilePrivateCapitalEligibility,
  selectedModelWaterfall,
  type CommercialPerformanceScenario,
  type EconomicsHorizonYears,
  type EconomicsVehicleId,
  type PrivateCapitalEligibilityCase,
} from '@/lib/funding/economics-model';
import type { FundingAdminPrimarySection } from '@/lib/funding/admin-sections';

type FundingEconomicsAdminProps = {
  embedded?: boolean;
  onGoToSection?: (section: FundingAdminPrimarySection) => void;
};

function formatUsdM(n: number, digits = 1): string {
  return `$${n.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: n % 1 === 0 ? 0 : Math.min(digits, 1),
  })}M`;
}

function formatRatio(n: number | null): string {
  if (n === null || Number.isNaN(n)) return 'N/A';
  return `${n.toFixed(2)}×`;
}

function formatIrr(n: number | null): string {
  if (n === null || Number.isNaN(n)) return 'N/A';
  return `${(n * 100).toFixed(1)}%`;
}

function formatYear(n: number | null): string {
  if (n === null) return 'N/A';
  return String(n);
}

function scenarioLabel(s: CommercialPerformanceScenario): string {
  if (s === 'conservative') return 'Conservative';
  if (s === 'growth') return 'Growth';
  return 'Base';
}

/**
 * Read-only commercial economics planning surface.
 * Does not create offers, payments, balances, or finance records.
 */
export default function FundingEconomicsAdmin(_props: FundingEconomicsAdminProps = {}) {
  const { t } = useLanguage();
  const [commercialScenario, setCommercialScenario] =
    useState<CommercialPerformanceScenario>(DEFAULT_COMMERCIAL_SCENARIO);
  const [privateCapitalCase, setPrivateCapitalCase] =
    useState<PrivateCapitalEligibilityCase>(DEFAULT_PRIVATE_CAPITAL_CASE);
  const [horizonYears, setHorizonYears] = useState<EconomicsHorizonYears>(DEFAULT_HORIZON_YEARS);
  const [showEcosystemDetail, setShowEcosystemDetail] = useState(false);
  const [showAnnual, setShowAnnual] = useState(false);
  const [showPolicyExample, setShowPolicyExample] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showHowRelated, setShowHowRelated] = useState(false);

  const [investmentUsdM, setInvestmentUsdM] = useState(DEFAULT_INVESTOR_ILLUSTRATION_USD_M);
  const [vehicle, setVehicle] = useState<EconomicsVehicleId>('V-ENT');
  const [entryYear, setEntryYear] = useState(1);
  const [includeTerminalValue, setIncludeTerminalValue] = useState(false);
  const [terminalValueUsdM, setTerminalValueUsdM] = useState(500);

  const summary = useMemo(
    () => economicsSummary(commercialScenario, horizonYears),
    [commercialScenario, horizonYears],
  );
  const waterfall = useMemo(
    () => selectedModelWaterfall(commercialScenario, horizonYears),
    [commercialScenario, horizonYears],
  );
  const fpp = useMemo(() => reconcilePrivateCapitalEligibility(privateCapitalCase), [privateCapitalCase]);
  const projection = useMemo(
    () => buildAnnualProjection(commercialScenario, horizonYears),
    [commercialScenario, horizonYears],
  );
  const policy = useMemo(() => policyFormulaExample(), []);
  const investor = useMemo(
    () =>
      buildInvestorIllustration({
        investmentUsdM,
        vehicle,
        entryYear,
        commercialScenario,
        horizonYears,
        privateCapitalCase,
        terminalValueUsdM: includeTerminalValue ? terminalValueUsdM : 0,
        fppEligible: true,
      }),
    [
      investmentUsdM,
      vehicle,
      entryYear,
      commercialScenario,
      horizonYears,
      privateCapitalCase,
      includeTerminalValue,
      terminalValueUsdM,
    ],
  );
  const contributorExample = useMemo(
    () =>
      buildContributorIllustration({
        contributorPoolUsdM: waterfall.pools.contributorUsdM,
        holderVestedUnits: 10,
        totalVestedUnits: 100,
      }),
    [waterfall.pools.contributorUsdM],
  );

  const contextLine = `${summary.scopeLabel} · ${scenarioLabel(commercialScenario)} · ${horizonYears} years · Projection`;
  const statusLine = t('settings.adminFundingEconomicsStatus').replace(
    '{version}',
    ECONOMICS_MODEL_VERSION,
  );

  void ECONOMICS_PAGE_SECTION_ORDER;

  return (
    <div className="min-w-0 space-y-3 overflow-x-clip" data-build-key="fundingEconomicsAdmin">
      {/* Title + controls + summary */}
      <Card className="min-w-0 space-y-3 p-4" data-section="controls_and_summary">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">{t('settings.adminFundingEconomicsTitle')}</h2>
            <Badge variant="outline">{t('settings.adminFundingEconomicsBadge')}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{statusLine}</p>
          <p className="text-sm text-muted-foreground">{t('settings.adminFundingEconomicsLead')}</p>
        </div>

        <div className="grid min-w-0 gap-2 rounded-md border border-border/60 p-2 sm:grid-cols-2 lg:grid-cols-4">
          <ControlSelect
            id="econ-scenario"
            label={t('settings.adminFundingEconomicsScenarioCommercial')}
            value={commercialScenario}
            onChange={(v) => setCommercialScenario(v as CommercialPerformanceScenario)}
            options={[
              ['conservative', t('settings.adminFundingEconomicsScenarioConservative')],
              ['base', t('settings.adminFundingEconomicsScenarioBase')],
              ['growth', t('settings.adminFundingEconomicsScenarioGrowth')],
            ]}
          />
          <ControlSelect
            id="econ-horizon"
            label={t('settings.adminFundingEconomicsHorizon')}
            value={String(horizonYears)}
            onChange={(v) => setHorizonYears(Number(v) as EconomicsHorizonYears)}
            options={[
              ['5', '5 years'],
              ['10', '10 years'],
              ['15', '15 years'],
            ]}
          />
          <div className="min-w-0 space-y-1">
            <Label className="text-xs text-muted-foreground">{t('settings.adminFundingEconomicsCurrency')}</Label>
            <div className="flex h-9 items-center rounded-md border border-border/60 px-2 text-sm">
              {ECONOMICS_CURRENCY}
            </div>
          </div>
          <div className="min-w-0 space-y-1">
            <Label className="text-xs text-muted-foreground">{t('settings.adminFundingEconomicsModelMeta')}</Label>
            <div className="flex h-9 items-center rounded-md border border-border/60 px-2 text-xs">
              v{ECONOMICS_MODEL_VERSION} · {ECONOMICS_MODEL_AS_OF}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{contextLine}</p>
        <dl className="grid min-w-0 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCell label={t('settings.adminFundingEconomicsGrossRevenue')} value={formatUsdM(summary.grossCommercialRevenueUsdM)} />
          <SummaryCell label={t('settings.adminFundingEconomicsOperatingCosts')} value={formatUsdM(summary.operatingAndDeliveryCostsUsdM)} />
          <SummaryCell label={t('settings.adminFundingEconomicsRequiredDeductions')} value={formatUsdM(summary.requiredTaxesObligationsReservesReinvestmentUsdM)} />
          <SummaryCell
            label={t('settings.adminFundingEconomicsDistributable')}
            value={formatUsdM(summary.eligibleDistributableCommercialCashUsdM)}
          />
          <SummaryCell label={t('settings.adminFundingEconomicsBreakEven')} value={String(summary.breakEvenYear)} />
          <SummaryCell
            label={t('settings.adminFundingEconomicsPeakDeficit')}
            value={formatUsdM(summary.peakAccumulatedDeficitUsdM)}
          />
        </dl>
      </Card>

      {/* 1. Selected-model waterfall */}
      <Card className="min-w-0 space-y-2 p-4" data-section="selected_model_waterfall">
        <h3 className="text-sm font-medium">{t('settings.adminFundingEconomicsWaterfallTitle')}</h3>
        <p className="text-xs text-muted-foreground">{contextLine}</p>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-0 text-left text-sm">
            <tbody>
              {waterfall.rows.map((row) => (
                <tr key={row.id} className="border-b border-border/40">
                  <th
                    scope="row"
                    className={`py-1 pr-3 font-normal ${
                      row.id === 'eligible' || row.id.startsWith('invest') || row.id === 'contributor' || row.id === 'ecosystem'
                        ? 'font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {row.label}
                  </th>
                  <td className="py-1 text-right tabular-nums">{formatUsdM(row.amountUsdM)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{t('settings.adminFundingEconomicsNoFounderInProfit')}</p>
        <p className="text-xs text-muted-foreground">{t('settings.adminFundingEconomicsDeficitNote')}</p>

        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <SummaryCell label={t('settings.adminFundingEconomicsColInvestor')} value={formatUsdM(waterfall.pools.investorUsdM)} />
          <SummaryCell label={t('settings.adminFundingEconomicsColContributor')} value={formatUsdM(waterfall.pools.contributorUsdM)} />
          <SummaryCell label={t('settings.adminFundingEconomicsColEcosystem')} value={formatUsdM(waterfall.pools.ecosystemUsdM)} />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('settings.adminFundingEconomicsContributorExample')}: {formatUsdM(contributorExample.amountUsdM)} ·{' '}
          {t('settings.adminFundingEconomicsNoCivicPower')}
        </p>

        <Button type="button" size="sm" variant="outline" onClick={() => setShowEcosystemDetail((v) => !v)}>
          {showEcosystemDetail
            ? t('settings.adminFundingEconomicsHideEcosystem')
            : t('settings.adminFundingEconomicsShowEcosystem')}
        </Button>
        {showEcosystemDetail ? (
          <div className="min-w-0 space-y-1 text-xs">
            {waterfall.ecosystemDetail.map((row) => (
              <div key={row.id} className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="min-w-0 text-muted-foreground">{row.label}</span>
                <span className="tabular-nums">
                  {(row.shareOfDistributable * 100).toFixed(0)}% · {formatUsdM(row.amountUsdM)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {/* 2. Investor illustration */}
      <Card className="min-w-0 space-y-3 p-4" data-section="investor_illustration">
        <h3 className="text-sm font-medium">{t('settings.adminFundingEconomicsInvestorTitle')}</h3>
        <p className="text-xs text-muted-foreground">
          {contextLine} · {t('settings.adminFundingEconomicsInvestorFormula')}
        </p>

        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            id="econ-invest"
            label={t('settings.adminFundingEconomicsInvestAmount')}
            value={String(investmentUsdM)}
            onChange={(v) => setInvestmentUsdM(Math.max(0, Number(v) || 0))}
          />
          <ControlSelect
            id="econ-vehicle"
            label={t('settings.adminFundingEconomicsVehicle')}
            value={vehicle}
            onChange={(v) => setVehicle(v as EconomicsVehicleId)}
            options={(Object.keys(BASE_FPP_ELIGIBLE_BY_VEHICLE_USD_M) as EconomicsVehicleId[]).map((id) => [
              id,
              id,
            ])}
          />
          <Field
            id="econ-entry"
            label={t('settings.adminFundingEconomicsEntryYear')}
            value={String(entryYear)}
            onChange={(v) => setEntryYear(Math.max(1, Math.min(horizonYears, Number(v) || 1)))}
          />
        </div>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={includeTerminalValue}
            onChange={(e) => setIncludeTerminalValue(e.target.checked)}
          />
          {t('settings.adminFundingEconomicsIncludeTv')}
        </label>
        {includeTerminalValue ? (
          <Field
            id="econ-tv"
            label={t('settings.adminFundingEconomicsTerminalValue')}
            value={String(terminalValueUsdM)}
            onChange={(v) => setTerminalValueUsdM(Math.max(0, Number(v) || 0))}
          />
        ) : null}

        {investor.capacityWarning ? (
          <div
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100"
            role="status"
          >
            {investor.capacityWarning}
          </div>
        ) : null}

        <dl className="grid min-w-0 gap-2 text-sm sm:grid-cols-2">
          <SummaryCell label={t('settings.adminFundingEconomicsModeledVehicleCapital')} value={formatUsdM(investor.modeledVehicleCapitalUsdM, 0)} />
          <SummaryCell label={t('settings.adminFundingEconomicsFppEligibleVehicle')} value={formatUsdM(investor.fppEligibleVehicleCapitalUsdM, 0)} />
          <SummaryCell label={t('settings.adminFundingEconomicsGrossInvest')} value={formatUsdM(investor.grossInvestmentUsdM, 0)} />
          <SummaryCell label={t('settings.adminFundingEconomicsFppAttributable')} value={`${formatUsdM(investor.founderAllocationAttributableUsdM)} · Accrued`} />
          <SummaryCell label={t('settings.adminFundingEconomicsNetDeployableCapital')} value={formatUsdM(investor.netDeployableCapitalUsdM)} />
          <SummaryCell label={t('settings.adminFundingEconomicsInvestorUnits')} value={String(investor.investorParticipationUnits)} />
          <SummaryCell label={t('settings.adminFundingEconomicsTotalEligibleUnits')} value={String(investor.totalActiveEligibleUnits)} />
          <SummaryCell
            label={t('settings.adminFundingEconomicsPoolShare')}
            value={investor.inScenario ? `${(investor.shareOfActiveInvestorPoolUnits * 100).toFixed(1)}%` : 'N/A'}
          />
          <SummaryCell
            label={t('settings.adminFundingEconomicsCumDist')}
            value={
              investor.modeledCumulativeDistributionsUsdM === null
                ? 'N/A'
                : formatUsdM(investor.modeledCumulativeDistributionsUsdM)
            }
          />
          <SummaryCell label={t('settings.adminFundingEconomicsCashMoic')} value={formatRatio(investor.cashMoic)} />
          <SummaryCell
            label={t('settings.adminFundingEconomicsTvMoic')}
            value={includeTerminalValue ? formatRatio(investor.moicIncludingTerminalValue) : 'N/A'}
          />
          <SummaryCell label={t('settings.adminFundingEconomicsIrr')} value={formatIrr(investor.irr)} />
          <SummaryCell label={t('settings.adminFundingEconomicsPayback')} value={formatYear(investor.paybackYear)} />
        </dl>
        <p className="text-xs text-muted-foreground">{t('settings.adminFundingEconomicsNotTenPctEach')}</p>
      </Card>

      {/* 3. Receipt / FPP */}
      <Card className="min-w-0 space-y-2 p-4" data-section="receipt_fpp_reconciliation">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">{t('settings.adminFundingEconomicsFppTitle')}</h3>
            <p className="text-xs text-muted-foreground">
              Capital-formation · {privateCapitalCase} eligibility case · Accrued allocation
            </p>
          </div>
          <ControlSelect
            id="econ-private-case"
            label={t('settings.adminFundingEconomicsPrivateCapitalCase')}
            value={privateCapitalCase}
            onChange={(v) => setPrivateCapitalCase(v as PrivateCapitalEligibilityCase)}
            options={[
              ['low', t('settings.adminFundingEconomicsCaseLow')],
              ['base', t('settings.adminFundingEconomicsCaseBase')],
              ['high', t('settings.adminFundingEconomicsCaseHigh')],
            ]}
          />
        </div>

        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-0 text-left text-sm">
            <tbody>
              <CalcRow label={t('settings.adminFundingEconomicsScopeEcosystem')} value={formatUsdM(fpp.ecosystemInvestmentUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsScopeEntering')} value={formatUsdM(fpp.receiptsEnteringParticipatingEntitiesUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsScopePrivate')} value={formatUsdM(fpp.privatelyInvestableVehicleCapitalUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsExcludedRestricted')} value={formatUsdM(fpp.excludedRestrictedUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsExcludedDebt')} value={formatUsdM(fpp.excludedDebtUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsEligibleReceipts')} value={formatUsdM(fpp.fppEligibleReceiptsUsdM)} emphasize />
              <CalcRow label={t('settings.adminFundingEconomicsFppOnePct')} value={formatUsdM(fpp.founderParticipationPoolUsdM)} emphasize />
              <CalcRow label={t('settings.adminFundingEconomicsNetDeployable')} value={formatUsdM(fpp.netDeployableReceiptsUsdM)} />
            </tbody>
          </table>
        </div>

        <div className="grid gap-2 text-xs sm:grid-cols-4">
          <LifecycleCell label={t('settings.adminFundingEconomicsAccrued')} value={formatUsdM(fpp.lifecycle.accruedUsdM)} />
          <LifecycleCell label={t('settings.adminFundingEconomicsVested')} value={formatUsdM(fpp.lifecycle.vestedUsdM)} />
          <LifecycleCell label={t('settings.adminFundingEconomicsPayable')} value={formatUsdM(fpp.lifecycle.payableUsdM)} />
          <LifecycleCell label={t('settings.adminFundingEconomicsPaid')} value={formatUsdM(fpp.lifecycle.paidUsdM)} />
        </div>
        <p className="text-xs text-muted-foreground">{t('settings.adminFundingEconomicsFppAccruedOnly')}</p>

        <Button type="button" size="sm" variant="outline" onClick={() => setShowHowRelated((v) => !v)}>
          {showHowRelated
            ? t('settings.adminFundingEconomicsHideHowRelated')
            : t('settings.adminFundingEconomicsShowHowRelated')}
        </Button>
        {showHowRelated ? (
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>{t('settings.adminFundingEconomicsFppNoteEcosystem')}</li>
            <li>{t('settings.adminFundingEconomicsFppNotePrivate')}</li>
            <li>{t('settings.adminFundingEconomicsFppNoteEligible')}</li>
            <li>{t('settings.adminFundingEconomicsFppNoteAllocation')}</li>
            <li>{t('settings.adminFundingEconomicsFppNoteValidation')}</li>
            <li>{t('settings.adminFundingEconomicsFppNoteNoProfitReassess')}</li>
            <li>{FLOORED_ANNUAL_SUM_ASSUMPTION}</li>
          </ul>
        ) : null}
      </Card>

      {/* 3b. Commercial capital sources & uses — planning only */}
      <Card className="min-w-0 space-y-2 p-4" data-section="commercial_capital_sources_uses">
        <h3 className="text-sm font-medium">{t('settings.adminFundingEconomicsCapitalSuTitle')}</h3>
        <p className="text-xs text-muted-foreground">{t('settings.adminFundingEconomicsCapitalSuNote')}</p>
        {(() => {
          const su = commercialCapitalSourcesAndUsesBase();
          return (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <CalcRow label={t('settings.adminFundingEconomicsCapitalCommitted')} value={formatUsdM(su.committedUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsCapitalReceived')} value={formatUsdM(su.receivedUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsCapitalDrawn')} value={formatUsdM(su.drawnUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsCapitalUsedDeficits')} value={formatUsdM(su.usedForAccumulatedDeficitsUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsCapitalUsedAssets')} value={formatUsdM(su.usedForAssetsReservesOtherUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsCapitalUndrawn')} value={formatUsdM(su.undrawnUsdM, 0)} />
              <CalcRow label={t('settings.adminFundingEconomicsCapitalRemaining')} value={formatUsdM(su.remainingUsdM, 0)} />
            </dl>
          );
        })()}
      </Card>

      {/* 4. Annual projection — collapsed */}
      <Card className="min-w-0 space-y-2 p-4" data-section="annual_projection">
        <Button type="button" size="sm" variant="outline" onClick={() => setShowAnnual((v) => !v)}>
          {showAnnual
            ? t('settings.adminFundingEconomicsHideAnnual')
            : t('settings.adminFundingEconomicsShowAnnual')}
        </Button>
        {showAnnual ? (
          <>
            <p className="text-xs text-muted-foreground">{contextLine}</p>
            <div className="space-y-2 md:hidden">
              {projection.rows.map((row) => (
                <div key={row.year} className="rounded-md border border-border/60 p-2 text-xs">
                  <div className="font-medium">
                    {t('settings.adminFundingEconomicsYear')} {row.year}
                  </div>
                  <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1">
                    <dt className="text-muted-foreground">{t('settings.adminFundingEconomicsColRevenue')}</dt>
                    <dd className="text-right tabular-nums">{formatUsdM(row.revenueUsdM)}</dd>
                    <dt className="text-muted-foreground">{t('settings.adminFundingEconomicsOperatingSurplus')}</dt>
                    <dd className="text-right tabular-nums">{formatUsdM(row.operatingSurplusDeficitUsdM)}</dd>
                    <dt className="text-muted-foreground">{t('settings.adminFundingEconomicsAccumulated')}</dt>
                    <dd className="text-right tabular-nums">{formatUsdM(row.accumulatedBalanceUsdM)}</dd>
                    <dt className="text-muted-foreground">{t('settings.adminFundingEconomicsColDistributable')}</dt>
                    <dd className="text-right tabular-nums">{formatUsdM(row.eligibleDistributableUsdM)}</dd>
                    <dt className="text-muted-foreground">{t('settings.adminFundingEconomicsColInvestor')}</dt>
                    <dd className="text-right tabular-nums">{formatUsdM(row.investorPoolUsdM)}</dd>
                  </dl>
                </div>
              ))}
            </div>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[42rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="py-1 pr-2 font-medium">{t('settings.adminFundingEconomicsYear')}</th>
                    <th className="py-1 pr-2 font-medium">{t('settings.adminFundingEconomicsColRevenue')}</th>
                    <th className="py-1 pr-2 font-medium">{t('settings.adminFundingEconomicsOperatingSurplus')}</th>
                    <th className="py-1 pr-2 font-medium">{t('settings.adminFundingEconomicsAccumulated')}</th>
                    <th className="py-1 pr-2 font-medium">{t('settings.adminFundingEconomicsCapitalDrawn')}</th>
                    <th className="py-1 pr-2 font-medium">{t('settings.adminFundingEconomicsColDistributable')}</th>
                    <th className="py-1 pr-2 font-medium">{t('settings.adminFundingEconomicsColInvestor')}</th>
                    <th className="py-1 pr-2 font-medium">{t('settings.adminFundingEconomicsColContributor')}</th>
                    <th className="py-1 font-medium">{t('settings.adminFundingEconomicsColEcosystem')}</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.rows.map((row) => (
                    <tr key={row.year} className="border-b border-border/40">
                      <td className="py-1 pr-2 tabular-nums">{row.year}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatUsdM(row.revenueUsdM)}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatUsdM(row.operatingSurplusDeficitUsdM)}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatUsdM(row.accumulatedBalanceUsdM)}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatUsdM(row.capitalDrawnUsdM, 0)}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatUsdM(row.eligibleDistributableUsdM)}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatUsdM(row.investorPoolUsdM)}</td>
                      <td className="py-1 pr-2 tabular-nums">{formatUsdM(row.contributorPoolUsdM)}</td>
                      <td className="py-1 tabular-nums">{formatUsdM(row.ecosystemUsdM)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Card>

      {/* 5. Policy formula example — collapsed */}
      <Card className="min-w-0 space-y-2 p-4" data-section="policy_formula_example">
        <Button type="button" size="sm" variant="outline" onClick={() => setShowPolicyExample((v) => !v)}>
          {showPolicyExample
            ? t('settings.adminFundingEconomicsHidePolicyExample')
            : t('settings.adminFundingEconomicsShowPolicyExample')}
        </Button>
        {showPolicyExample ? (
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">{t('settings.adminFundingEconomicsPolicyExampleHint')}</p>
            <table className="w-full text-left text-sm">
              <tbody>
                <CalcRow label="Eligible distributable (example)" value={formatUsdM(policy.distributableUsdM, 0)} emphasize />
                <CalcRow label="Investor Pool — 10%" value={formatUsdM(policy.pools.investorUsdM, 0)} />
                <CalcRow label="Contributor Pool — 10%" value={formatUsdM(policy.pools.contributorUsdM, 0)} />
                <CalcRow label="Ecosystem Allocation — 80%" value={formatUsdM(policy.pools.ecosystemUsdM, 0)} />
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {/* 6. Assumptions */}
      <Card className="min-w-0 space-y-2 p-4" data-section="assumptions">
        <Button type="button" size="sm" variant="outline" onClick={() => setShowAssumptions((v) => !v)}>
          {showAssumptions
            ? t('settings.adminFundingEconomicsHideAssumptions')
            : t('settings.adminFundingEconomicsShowAssumptions')}
        </Button>
        {showAssumptions ? (
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            <li>{t('settings.adminFundingEconomicsAssumptionRevenue')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionAdoption')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionMargin')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionVehicles')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionReserves')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionGates')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionDeficit')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionUnits')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionTv')}</li>
            <li>{t('settings.adminFundingEconomicsAssumptionConfidence')}</li>
            <li>
              {t('settings.adminFundingEconomicsAssumptionDocs')}: {ECONOMICS_DOC_REFS.join(', ')}
            </li>
          </ul>
        ) : null}
      </Card>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function CalcRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <tr className="border-b border-border/40">
      <th scope="row" className={`py-1.5 pr-3 font-normal ${emphasize ? 'font-medium' : 'text-muted-foreground'}`}>
        {label}
      </th>
      <td className={`py-1.5 text-right tabular-nums ${emphasize ? 'font-medium' : ''}`}>{value}</td>
    </tr>
  );
}

function LifecycleCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 px-2 py-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <input
        id={id}
        type="number"
        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ControlSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(([v, labelText]) => (
          <option key={v} value={v}>
            {labelText}
          </option>
        ))}
      </select>
    </div>
  );
}
