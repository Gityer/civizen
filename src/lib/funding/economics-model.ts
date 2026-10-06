/**
 * Canonical commercial-economics calculation module for Funding → Economics.
 * Sources: docs 20, 22, 23, 24, 27. Planning only — not an offer or ledger.
 */

import {
  BREAK_EVEN_YEAR,
  COMMERCIAL_ANNUAL_ROWS,
} from './economics-commercial-annual.data';
import type {
  AllocationLifecycle,
  CommercialAnnualRow,
  CommercialPerformanceScenario,
  EconomicsHorizonYears,
  EconomicsVehicleId,
  EcosystemSuballocation,
  PrivateCapitalEligibilityCase,
} from './economics-model.types';

export type {
  AllocationLifecycle,
  CommercialAnnualRow,
  CommercialPerformanceScenario,
  EconomicsHorizonYears,
  EconomicsVehicleId,
  EcosystemSuballocation,
  PrivateCapitalEligibilityCase,
} from './economics-model.types';

export const ECONOMICS_MODEL_VERSION = '0.1.6';
export const ECONOMICS_MODEL_AS_OF = '2026-08-11';
export const ECONOMICS_CURRENCY = 'USD';

export const DEFAULT_COMMERCIAL_SCENARIO: CommercialPerformanceScenario = 'base';
export const DEFAULT_HORIZON_YEARS: EconomicsHorizonYears = 15;
export const DEFAULT_PRIVATE_CAPITAL_CASE: PrivateCapitalEligibilityCase = 'base';
/** Default illustration stays inside V-ENT FPP-eligible capacity ($500M base). */
export const DEFAULT_INVESTOR_ILLUSTRATION_USD_M = 100;

export const INVESTOR_POOL_SHARE = 0.1;
export const CONTRIBUTOR_POOL_SHARE = 0.1;
export const ECOSYSTEM_ALLOCATION_SHARE = 0.8;
export const FOUNDER_PARTICIPATION_SHARE = 0.01;

/** Doc 27 policy formula example only — not the selected-model waterfall base. */
export const POLICY_FORMULA_EXAMPLE_DISTRIBUTABLE_USD_M = 310;

export const ECOSYSTEM_5Y_BASE_USD_M = 37_500;

/**
 * Validation Program restricted ask — v0.3 Recommended working draft (doc 33).
 * Same-scope Low/Base/High; Constrained (~$374M) and Expanded (~$1.03B) are different scopes.
 */
export const VALIDATION_ASK_USD_M: Record<PrivateCapitalEligibilityCase, number> = {
  low: 552.4,
  base: 634.4,
  high: 833.2,
};

/** Completed v0.2 coverage draft Base — superseded by v0.3; provenance only. */
export const VALIDATION_ASK_V02_BASE_USD_M = 530.2;

/** Prior v0.2 working total before coverage adds (superseded estimate). */
export const VALIDATION_ASK_V02_PRE_COVERAGE_BASE_USD_M = 524;

/** Historical Validation Program v0.1 Base — retained for provenance only. */
export const VALIDATION_ASK_V01_BASE_USD_M = 446;

/**
 * Commercial-entity capital planning envelope (doc 20 base ~$1.2B).
 * Scenario model only — no commitments, receipts, or draws have occurred.
 */
export const COMMERCIAL_ENTITY_CAPITAL_BASE_USD_M = 1_200;

export type CommercialCapitalSourcesAndUses = {
  envelopeUsdM: number;
  committedUsdM: number;
  receivedUsdM: number;
  drawnUsdM: number;
  usedForAccumulatedDeficitsUsdM: number;
  usedForAssetsReservesOtherUsdM: number;
  undrawnUsdM: number;
  remainingUsdM: number;
  status: 'planning_scenario_no_actual_capital';
  note: string;
};

/** Concise sources-and-uses for the $1.2B commercial capital planning draw. */
export function commercialCapitalSourcesAndUsesBase(): CommercialCapitalSourcesAndUses {
  const envelopeUsdM = COMMERCIAL_ENTITY_CAPITAL_BASE_USD_M;
  return {
    envelopeUsdM,
    committedUsdM: 0,
    receivedUsdM: 0,
    drawnUsdM: 0,
    usedForAccumulatedDeficitsUsdM: 0,
    usedForAssetsReservesOtherUsdM: 0,
    undrawnUsdM: envelopeUsdM,
    remainingUsdM: envelopeUsdM,
    status: 'planning_scenario_no_actual_capital',
    note:
      'Planning envelope from doc 20 commercial_entity_capital base (~$1.2B). No investor commitments, receipts, or capital draws exist. Scenario cashflow models may illustrate future draws financing early deficits; those are not actual uses.',
  };
}

export const PRIVATE_VEHICLE_STACK_USD_M: Record<PrivateCapitalEligibilityCase, number> = {
  low: 900,
  base: 2_800,
  high: 6_400,
};

/** Full modeled vehicle capital stacks (doc 23 base). */
export const BASE_VEHICLE_CAPITAL_USD_M: Record<EconomicsVehicleId, number> = {
  'V-ENT': 700,
  'V-OPS': 900,
  'V-JUR': 500,
  'V-DISC': 350,
  'V-SEC-EDU': 150,
  'V-SEC-EMP': 200,
};

/** FPP-eligible equity-like layers by vehicle (doc 27 §6.1). */
export const BASE_FPP_ELIGIBLE_BY_VEHICLE_USD_M: Record<EconomicsVehicleId, number> = {
  'V-ENT': 500,
  'V-OPS': 200,
  'V-JUR': 100,
  'V-DISC': 350,
  'V-SEC-EDU': 120,
  'V-SEC-EMP': 200,
};

export const BASE_FPP_ELIGIBLE_TOTAL_USD_M = Object.values(BASE_FPP_ELIGIBLE_BY_VEHICLE_USD_M).reduce(
  (a, b) => a + b,
  0,
);

export const ECOSYSTEM_SUBALLOCATIONS: EcosystemSuballocation[] = [
  { id: 'ECO-20', label: 'Continued core and shared-system development', shareOfDistributable: 0.2 },
  { id: 'ECO-13', label: 'Continuity, security, resilience, and long-term reserves', shareOfDistributable: 0.13 },
  { id: 'ECO-15', label: 'Civilization-domain development fund', shareOfDistributable: 0.15 },
  { id: 'ECO-08', label: 'Operators, jurisdictions, and local implementation', shareOfDistributable: 0.08 },
  { id: 'ECO-07', label: 'Public-interest governance, rights, and open standards', shareOfDistributable: 0.07 },
  { id: 'ECO-06', label: 'Research, innovation, and open-source stewardship', shareOfDistributable: 0.06 },
  { id: 'ECO-05', label: 'Inclusion, accessibility, localization, and nondigital access', shareOfDistributable: 0.05 },
  { id: 'ECO-04', label: 'Ecosystem grants, education, and professional capacity', shareOfDistributable: 0.04 },
  { id: 'ECO-02', label: 'Strategic renewal and emergency adaptation', shareOfDistributable: 0.02 },
];

export const ECONOMICS_DOC_REFS = [
  '20-capital-stack-revenue-and-roi-model-v0.1',
  '22-private-investor-economics-brief-v0.1',
  '23-investable-vehicles-and-private-capital-architecture-v0.1',
  '24-investor-return-and-contributor-waterfall-v0.1',
  '27-founder-investor-and-contributor-participation-policy-v0.1',
] as const;

/**
 * Historical doc-20 annual rows floor negative years to $0 before summing.
 * That overstates cumulative distributable cash versus carrying deficits forward.
 * Primary policy-eligible base uses deficit recovery (carry-forward).
 */
export const FLOORED_ANNUAL_SUM_ASSUMPTION =
  'Alternate presentation only: sum of positive annual operating remainders with early deficits floored to zero (historical capital-stack CSV). Not the primary participation base.';

const round1 = (n: number) => Math.round(n * 10) / 10;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function assertPoolSharesComplete(): void {
  const sum = INVESTOR_POOL_SHARE + CONTRIBUTOR_POOL_SHARE + ECOSYSTEM_ALLOCATION_SHARE;
  if (Math.abs(sum - 1) > 1e-12) throw new Error(`Pool shares must sum to 1; got ${sum}`);
  const eco = ECOSYSTEM_SUBALLOCATIONS.reduce((a, s) => a + s.shareOfDistributable, 0);
  if (Math.abs(eco - ECOSYSTEM_ALLOCATION_SHARE) > 1e-12) {
    throw new Error(`Ecosystem suballocations must sum to ${ECOSYSTEM_ALLOCATION_SHARE}; got ${eco}`);
  }
}

export function allocateDistributablePools(distributableUsdM: number): {
  investorUsdM: number;
  contributorUsdM: number;
  ecosystemUsdM: number;
} {
  const base = Math.max(0, distributableUsdM);
  const investorUsdM = round1(base * INVESTOR_POOL_SHARE);
  const contributorUsdM = round1(base * CONTRIBUTOR_POOL_SHARE);
  const ecosystemUsdM = round1(base - investorUsdM - contributorUsdM);
  return { investorUsdM, contributorUsdM, ecosystemUsdM };
}

export function founderParticipationPoolUsdM(eligibleExternalReceiptsUsdM: number): number {
  return round3(eligibleExternalReceiptsUsdM * FOUNDER_PARTICIPATION_SHARE);
}

export type ReceiptClassification =
  | 'eligible_external'
  | 'excluded_restricted'
  | 'excluded_debt'
  | 'excluded_internal_or_already_assessed'
  | 'excluded_pass_through_custodial_tax_deposit';

export function assessFounderParticipation(args: {
  amountUsdM: number;
  classification: ReceiptClassification;
  alreadyAssessed?: boolean;
}): { assessedUsdM: number; founderAllocationAssessed: boolean } {
  if (args.alreadyAssessed) return { assessedUsdM: 0, founderAllocationAssessed: true };
  if (args.classification !== 'eligible_external') {
    return { assessedUsdM: 0, founderAllocationAssessed: false };
  }
  return {
    assessedUsdM: founderParticipationPoolUsdM(args.amountUsdM),
    founderAllocationAssessed: true,
  };
}

export function privateCapitalEligibilityScale(caseId: PrivateCapitalEligibilityCase): number {
  return PRIVATE_VEHICLE_STACK_USD_M[caseId] / PRIVATE_VEHICLE_STACK_USD_M.base;
}

export function vehicleCapitalUsdM(
  vehicle: EconomicsVehicleId,
  caseId: PrivateCapitalEligibilityCase = 'base',
): { modeledVehicleCapitalUsdM: number; fppEligibleVehicleCapitalUsdM: number } {
  const scale = privateCapitalEligibilityScale(caseId);
  return {
    modeledVehicleCapitalUsdM: round1(BASE_VEHICLE_CAPITAL_USD_M[vehicle] * scale),
    fppEligibleVehicleCapitalUsdM: round1(BASE_FPP_ELIGIBLE_BY_VEHICLE_USD_M[vehicle] * scale),
  };
}

export function fppEligibleReceiptsUsdM(caseId: PrivateCapitalEligibilityCase): number {
  return round1(BASE_FPP_ELIGIBLE_TOTAL_USD_M * privateCapitalEligibilityScale(caseId));
}

export function reconcilePrivateCapitalEligibility(caseId: PrivateCapitalEligibilityCase) {
  const scale = privateCapitalEligibilityScale(caseId);
  const privateStack = PRIVATE_VEHICLE_STACK_USD_M[caseId];
  const validation = VALIDATION_ASK_USD_M[caseId];
  const entering = privateStack + validation;
  const eligible = fppEligibleReceiptsUsdM(caseId);
  const excludedRestrictedInStack = round1(530 * scale);
  const excludedDebt = round1(800 * scale);
  const excludedRestricted = round1(validation + excludedRestrictedInStack);
  const fpp = founderParticipationPoolUsdM(eligible);
  return {
    label: 'Private-capital eligibility case within the ~$37.5B base ecosystem scenario',
    ecosystemInvestmentUsdM: ECOSYSTEM_5Y_BASE_USD_M,
    receiptsEnteringParticipatingEntitiesUsdM: entering,
    privatelyInvestableVehicleCapitalUsdM: privateStack,
    validationRestrictedUsdM: validation,
    excludedRestrictedUsdM: excludedRestricted,
    excludedDebtUsdM: excludedDebt,
    excludedInternalAlreadyAssessedUsdM: 0,
    fppEligibleReceiptsUsdM: eligible,
    founderParticipationPoolUsdM: fpp,
    netDeployableReceiptsUsdM: round1(entering - fpp),
    lifecycle: {
      accruedUsdM: fpp,
      vestedUsdM: 0,
      payableUsdM: 0,
      paidUsdM: 0,
    } satisfies AllocationLifecycle,
  };
}

export function annualRowsForScenario(
  scenario: CommercialPerformanceScenario,
  horizonYears: EconomicsHorizonYears,
): CommercialAnnualRow[] {
  return COMMERCIAL_ANNUAL_ROWS.filter((r) => r.scenario === scenario && r.year <= horizonYears).sort(
    (a, b) => a.year - b.year,
  );
}

export function operatingCostsUsdM(row: CommercialAnnualRow): number {
  return round1(row.costOfSalesUsdM + row.opexUsdM + row.securityUsdM);
}

export function requiredDeductionsUsdM(row: CommercialAnnualRow): number {
  return round1(row.taxUsdM + row.debtServiceUsdM + row.reserveUsdM + row.reinvestUsdM);
}

/** Annual operating surplus/deficit before deficit carry-forward. */
export function annualOperatingRemainderUsdM(row: CommercialAnnualRow): number {
  return round1(row.revenueUsdM - operatingCostsUsdM(row) - requiredDeductionsUsdM(row));
}

export type AnnualProjectionRow = {
  year: number;
  revenueUsdM: number;
  costsUsdM: number;
  requiredDeductionsUsdM: number;
  /** Revenue − costs − deductions (may be negative). */
  operatingSurplusDeficitUsdM: number;
  /** Running sum of operating surplus/deficit after prior years. */
  accumulatedBalanceUsdM: number;
  /** Capital drawn this year (finances cash deficits; from model notes). */
  capitalDrawnUsdM: number;
  /** Cumulative capital drawn through this year. */
  cumulativeCapitalDrawnUsdM: number;
  /** Increase in non-negative accumulated balance this year (deficit-recovered eligible). */
  eligibleDistributableUsdM: number;
  /** Historical floored annual value from source CSV (may ignore accumulated deficit). */
  flooredAnnualDistributableUsdM: number;
  investorPoolUsdM: number;
  contributorPoolUsdM: number;
  ecosystemUsdM: number;
};

export type CashflowReconciliation = {
  revenueUsdM: number;
  costsUsdM: number;
  deductionsUsdM: number;
  /** Revenue − costs − deductions (can be used as check identity). */
  simpleCumulativeRemainderUsdM: number;
  /** Sum of positive annual remainders only (early deficits floored away). */
  flooredAnnualSumUsdM: number;
  /** Documented adjustment = floored sum − simple remainder (= abs early deficits floored). */
  flooredDeficitAdjustmentUsdM: number;
  /** Primary policy-eligible base after carrying deficits forward. */
  eligibleDistributableBaseUsdM: number;
  /** Capital drawn to finance early deficits (cumulative). */
  cumulativeCapitalDrawnUsdM: number;
  peakAccumulatedDeficitUsdM: number;
};

/**
 * Build annual rows with deficit carry-forward.
 * Eligible distributable in a year = increase in max(accumulatedBalance, 0).
 * Participation pools attach only to that eligible amount.
 */
export function buildAnnualProjection(
  scenario: CommercialPerformanceScenario,
  horizonYears: EconomicsHorizonYears,
): {
  rows: AnnualProjectionRow[];
  cumulative: {
    revenueUsdM: number;
    costsUsdM: number;
    requiredDeductionsUsdM: number;
    eligibleDistributableUsdM: number;
    flooredAnnualSumUsdM: number;
    investorPoolUsdM: number;
    contributorPoolUsdM: number;
    ecosystemUsdM: number;
  };
  reconciliation: CashflowReconciliation;
} {
  let accumulated = 0;
  let peakDeficit = 0;
  const rows: AnnualProjectionRow[] = [];

  for (const row of annualRowsForScenario(scenario, horizonYears)) {
    const costs = operatingCostsUsdM(row);
    const deductions = requiredDeductionsUsdM(row);
    const operating = annualOperatingRemainderUsdM(row);
    const before = accumulated;
    accumulated = round1(accumulated + operating);
    if (accumulated < peakDeficit) peakDeficit = accumulated;

    // Capital drawn is reported from source notes (financing), not as P&L income.
    const capitalDrawn = round1(
      // reconstruct from notes via difference in cum when available — stored on row? not directly.
      // Use opex path: commercial annual data doesn't expose cap_drawn as a field.
      // Approximate from CSV via optional extension — see enrich below.
      0,
    );
    void capitalDrawn;

    const eligible = round1(Math.max(0, accumulated) - Math.max(0, before));
    const floored = Math.max(0, row.distributableUsdM);
    const pools = allocateDistributablePools(eligible);

    rows.push({
      year: row.year,
      revenueUsdM: row.revenueUsdM,
      costsUsdM: costs,
      requiredDeductionsUsdM: deductions,
      operatingSurplusDeficitUsdM: operating,
      accumulatedBalanceUsdM: accumulated,
      capitalDrawnUsdM: 0,
      cumulativeCapitalDrawnUsdM: 0,
      eligibleDistributableUsdM: eligible,
      flooredAnnualDistributableUsdM: floored,
      investorPoolUsdM: pools.investorUsdM,
      contributorPoolUsdM: pools.contributorUsdM,
      ecosystemUsdM: pools.ecosystemUsdM,
    });
  }

  // Attach capital-draw series from source notes embedded in COMMERCIAL_ANNUAL_ROWS via raw fields.
  // The extracted data file does not include cap_drawn; enrich from known base series pattern
  // by reading optional fields if present on the typed row (extended at extract time).
  enrichCapitalDraws(rows, scenario);

  const cumulativeCapital = rows.length ? rows[rows.length - 1]!.cumulativeCapitalDrawnUsdM : 0;

  const revenueUsdM = round1(rows.reduce((a, r) => a + r.revenueUsdM, 0));
  const costsUsdM = round1(rows.reduce((a, r) => a + r.costsUsdM, 0));
  const deductionsUsdM = round1(rows.reduce((a, r) => a + r.requiredDeductionsUsdM, 0));
  const simpleCumulativeRemainderUsdM = round1(revenueUsdM - costsUsdM - deductionsUsdM);
  const flooredAnnualSumUsdM = round1(rows.reduce((a, r) => a + r.flooredAnnualDistributableUsdM, 0));
  const eligibleDistributableUsdM = round1(rows.reduce((a, r) => a + r.eligibleDistributableUsdM, 0));
  const pools = allocateDistributablePools(eligibleDistributableUsdM);

  // Identity: simple + flooredDeficitAdjustment = flooredAnnualSum
  // and eligible (carry-forward) equals simple when ending balance >= 0.
  const flooredDeficitAdjustmentUsdM = round1(flooredAnnualSumUsdM - simpleCumulativeRemainderUsdM);

  return {
    rows,
    cumulative: {
      revenueUsdM,
      costsUsdM,
      requiredDeductionsUsdM: deductionsUsdM,
      eligibleDistributableUsdM,
      flooredAnnualSumUsdM,
      investorPoolUsdM: pools.investorUsdM,
      contributorPoolUsdM: pools.contributorUsdM,
      ecosystemUsdM: pools.ecosystemUsdM,
    },
    reconciliation: {
      revenueUsdM,
      costsUsdM,
      deductionsUsdM,
      simpleCumulativeRemainderUsdM,
      flooredAnnualSumUsdM,
      flooredDeficitAdjustmentUsdM,
      eligibleDistributableBaseUsdM: eligibleDistributableUsdM,
      cumulativeCapitalDrawnUsdM: cumulativeCapital,
      peakAccumulatedDeficitUsdM: round1(Math.abs(Math.min(0, peakDeficit))),
    },
  };
}

/** Capital-draw schedule from doc 20 annual CF notes (USD M). */
const CAPITAL_DRAWN_BY_SCENARIO: Record<CommercialPerformanceScenario, number[]> = {
  conservative: [60, 80, 100, 100, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  base: [180, 240, 300, 300, 180, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  growth: [375, 500, 625, 625, 375, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

function enrichCapitalDraws(
  rows: AnnualProjectionRow[],
  scenario: CommercialPerformanceScenario,
): void {
  const schedule = CAPITAL_DRAWN_BY_SCENARIO[scenario];
  let cum = 0;
  for (const row of rows) {
    const drawn = schedule[row.year - 1] ?? 0;
    cum = round1(cum + drawn);
    row.capitalDrawnUsdM = drawn;
    row.cumulativeCapitalDrawnUsdM = cum;
  }
}

export function economicsSummary(
  scenario: CommercialPerformanceScenario,
  horizonYears: EconomicsHorizonYears,
) {
  const { cumulative, reconciliation } = buildAnnualProjection(scenario, horizonYears);
  return {
    scopeLabel: 'Commercial entity projection',
    amountKind: 'projection' as const,
    scenario,
    horizonYears,
    grossCommercialRevenueUsdM: cumulative.revenueUsdM,
    operatingAndDeliveryCostsUsdM: cumulative.costsUsdM,
    requiredTaxesObligationsReservesReinvestmentUsdM: cumulative.requiredDeductionsUsdM,
    eligibleDistributableCommercialCashUsdM: cumulative.eligibleDistributableUsdM,
    flooredAnnualSumUsdM: cumulative.flooredAnnualSumUsdM,
    simpleCumulativeRemainderUsdM: reconciliation.simpleCumulativeRemainderUsdM,
    flooredDeficitAdjustmentUsdM: reconciliation.flooredDeficitAdjustmentUsdM,
    peakAccumulatedDeficitUsdM: reconciliation.peakAccumulatedDeficitUsdM,
    cumulativeCapitalDrawnUsdM: reconciliation.cumulativeCapitalDrawnUsdM,
    breakEvenYear: BREAK_EVEN_YEAR[scenario],
    pools: {
      investorUsdM: cumulative.investorPoolUsdM,
      contributorUsdM: cumulative.contributorPoolUsdM,
      ecosystemUsdM: cumulative.ecosystemUsdM,
    },
  };
}

/** Selected-model waterfall — uses deficit-recovered eligible base for the scenario/horizon. */
export function selectedModelWaterfall(
  scenario: CommercialPerformanceScenario,
  horizonYears: EconomicsHorizonYears,
) {
  const summary = economicsSummary(scenario, horizonYears);
  const { cumulative, reconciliation } = buildAnnualProjection(scenario, horizonYears);
  return {
    scopeLabel: 'Commercial entity projection',
    amountKind: 'projection' as const,
    scenario,
    horizonYears,
    rows: [
      { id: 'revenue', label: 'Commercial revenue', amountUsdM: cumulative.revenueUsdM },
      { id: 'costs', label: 'Operating and delivery costs', amountUsdM: cumulative.costsUsdM },
      {
        id: 'deductions',
        label: 'Taxes, financing, reserves, and reinvestment',
        amountUsdM: cumulative.requiredDeductionsUsdM,
      },
      {
        id: 'simple',
        label: 'Simple cumulative remainder',
        amountUsdM: reconciliation.simpleCumulativeRemainderUsdM,
      },
      {
        id: 'deficit',
        label: 'Early deficits floored in alternate sum (documented adjustment)',
        amountUsdM: reconciliation.flooredDeficitAdjustmentUsdM,
      },
      {
        id: 'floored',
        label: 'Alternate: floored annual sum (not primary)',
        amountUsdM: reconciliation.flooredAnnualSumUsdM,
      },
      {
        id: 'eligible',
        label: 'Eligible distributable commercial cash (deficit-recovered)',
        amountUsdM: cumulative.eligibleDistributableUsdM,
      },
      { id: 'investor', label: 'Investor Pool — 10%', amountUsdM: cumulative.investorPoolUsdM },
      { id: 'contributor', label: 'Contributor Pool — 10%', amountUsdM: cumulative.contributorPoolUsdM },
      {
        id: 'ecosystem',
        label: 'Civizen / Ecosystem Allocation — 80%',
        amountUsdM: cumulative.ecosystemUsdM,
      },
    ],
    pools: summary.pools,
    ecosystemDetail: ECOSYSTEM_SUBALLOCATIONS.map((s) => ({
      ...s,
      amountUsdM: round1(cumulative.eligibleDistributableUsdM * s.shareOfDistributable),
    })),
    reconciliation,
  };
}

/** Collapsed policy formula example — independent of selected scenario totals. */
export function policyFormulaExample() {
  const distributableUsdM = POLICY_FORMULA_EXAMPLE_DISTRIBUTABLE_USD_M;
  const pools = allocateDistributablePools(distributableUsdM);
  return {
    scopeLabel: 'Policy formula example',
    amountKind: 'policy_example' as const,
    distributableUsdM,
    pools,
    ecosystemDetail: ECOSYSTEM_SUBALLOCATIONS.map((s) => ({
      ...s,
      amountUsdM: round1(distributableUsdM * s.shareOfDistributable),
    })),
  };
}

export function investorUnitsFromCapitalUsdM(capitalUsdM: number): number {
  return capitalUsdM;
}

export function participantShareOfPool(args: {
  poolUsdM: number;
  holderActiveUnits: number;
  totalActiveUnits: number;
}): number {
  if (args.totalActiveUnits <= 0 || args.holderActiveUnits <= 0) return 0;
  return round3((args.poolUsdM * args.holderActiveUnits) / args.totalActiveUnits);
}

export function cashMoic(args: { cumulativeDistributionsUsdM: number; investedUsdM: number }): number | null {
  if (args.investedUsdM <= 0) return null;
  return round3(args.cumulativeDistributionsUsdM / args.investedUsdM);
}

export function moicWithTerminalValue(args: {
  cumulativeDistributionsUsdM: number;
  terminalValueUsdM: number;
  investedUsdM: number;
}): number | null {
  if (args.investedUsdM <= 0) return null;
  return round3((args.cumulativeDistributionsUsdM + args.terminalValueUsdM) / args.investedUsdM);
}

export function calculateIrr(cashFlows: number[]): number | null {
  if (cashFlows.length < 2) return null;
  const hasPos = cashFlows.some((c) => c > 0);
  const hasNeg = cashFlows.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;

  const npv = (rate: number) =>
    cashFlows.reduce((acc, cf, t) => acc + cf / (1 + rate) ** t, 0);

  let lo = -0.9999;
  let hi = 10;
  let nLo = npv(lo);
  let nHi = npv(hi);
  if (nLo * nHi > 0) {
    hi = 100;
    nHi = npv(hi);
    if (nLo * nHi > 0) return null;
  }

  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const nMid = npv(mid);
    if (Math.abs(nMid) < 1e-7) return mid;
    if (nLo * nMid <= 0) {
      hi = mid;
    } else {
      lo = mid;
      nLo = nMid;
    }
  }
  return (lo + hi) / 2;
}

export function paybackYear(args: {
  investedUsdM: number;
  annualDistributionsUsdM: number[];
}): number | null {
  if (args.investedUsdM <= 0) return null;
  let cum = 0;
  for (let i = 0; i < args.annualDistributionsUsdM.length; i++) {
    cum += args.annualDistributionsUsdM[i]!;
    if (cum + 1e-9 >= args.investedUsdM) return i + 1;
  }
  return null;
}

export type InvestorIllustrationInput = {
  investmentUsdM: number;
  vehicle: EconomicsVehicleId;
  entryYear: number;
  commercialScenario: CommercialPerformanceScenario;
  horizonYears: EconomicsHorizonYears;
  privateCapitalCase?: PrivateCapitalEligibilityCase;
  terminalValueUsdM?: number;
  fppEligible?: boolean;
};

export type InvestorIllustrationResult = {
  grossInvestmentUsdM: number;
  founderAllocationAttributableUsdM: number;
  netDeployableCapitalUsdM: number;
  modeledVehicleCapitalUsdM: number;
  fppEligibleVehicleCapitalUsdM: number;
  investorParticipationUnits: number;
  totalActiveEligibleUnits: number;
  shareOfActiveInvestorPoolUnits: number;
  exceedsVehicleCapacity: boolean;
  capacityWarning: string | null;
  /** When over capacity, distribution metrics are suppressed. */
  inScenario: boolean;
  modeledCumulativeDistributionsUsdM: number | null;
  cashMoic: number | null;
  moicIncludingTerminalValue: number | null;
  irr: number | null;
  paybackYear: number | null;
  terminalValueUsdM: number;
  annualDistributionsUsdM: number[];
};

export function buildInvestorIllustration(input: InvestorIllustrationInput): InvestorIllustrationResult {
  const privateCase = input.privateCapitalCase ?? 'base';
  const capacity = vehicleCapitalUsdM(input.vehicle, privateCase);
  const fppEligible = input.fppEligible !== false;
  const fpp = fppEligible ? founderParticipationPoolUsdM(input.investmentUsdM) : 0;
  const units = investorUnitsFromCapitalUsdM(input.investmentUsdM);
  const totalActiveEligibleUnits = capacity.fppEligibleVehicleCapitalUsdM;
  const exceeds = input.investmentUsdM > totalActiveEligibleUnits + 1e-9;
  const share = !exceeds && totalActiveEligibleUnits > 0 ? units / totalActiveEligibleUnits : 0;

  const projection = buildAnnualProjection(input.commercialScenario, input.horizonYears);
  const annualDistributions = exceeds
    ? []
    : projection.rows.map((row) => {
        if (row.year < input.entryYear) return 0;
        return round3(row.investorPoolUsdM * share);
      });
  const cumulative = exceeds ? null : round1(annualDistributions.reduce((a, b) => a + b, 0));
  const tv = input.terminalValueUsdM && input.terminalValueUsdM > 0 ? input.terminalValueUsdM : 0;

  let irr: number | null = null;
  let cash: number | null = null;
  let withTv: number | null = null;
  let payback: number | null = null;
  if (!exceeds && cumulative !== null) {
    cash = cashMoic({ cumulativeDistributionsUsdM: cumulative, investedUsdM: input.investmentUsdM });
    withTv =
      tv > 0
        ? moicWithTerminalValue({
            cumulativeDistributionsUsdM: cumulative,
            terminalValueUsdM: tv,
            investedUsdM: input.investmentUsdM,
          })
        : null;
    const flows = [-input.investmentUsdM, ...annualDistributions];
    if (tv > 0) flows[flows.length - 1] = (flows[flows.length - 1] ?? 0) + tv;
    irr = calculateIrr(tv > 0 ? flows : [-input.investmentUsdM, ...annualDistributions]);
    payback = paybackYear({
      investedUsdM: input.investmentUsdM,
      annualDistributionsUsdM: annualDistributions,
    });
  }

  return {
    grossInvestmentUsdM: input.investmentUsdM,
    founderAllocationAttributableUsdM: fpp,
    netDeployableCapitalUsdM: round1(input.investmentUsdM - fpp),
    modeledVehicleCapitalUsdM: capacity.modeledVehicleCapitalUsdM,
    fppEligibleVehicleCapitalUsdM: capacity.fppEligibleVehicleCapitalUsdM,
    investorParticipationUnits: units,
    totalActiveEligibleUnits,
    shareOfActiveInvestorPoolUnits: round3(share),
    exceedsVehicleCapacity: exceeds,
    capacityWarning: exceeds
      ? `Entered investment exceeds modeled FPP-eligible capacity for ${input.vehicle} ($${totalActiveEligibleUnits}M). Not treated as an in-scenario result.`
      : null,
    inScenario: !exceeds,
    modeledCumulativeDistributionsUsdM: cumulative,
    cashMoic: cash,
    moicIncludingTerminalValue: withTv,
    irr,
    paybackYear: payback,
    terminalValueUsdM: tv,
    annualDistributionsUsdM: annualDistributions,
  };
}

export function buildContributorIllustration(args: {
  contributorPoolUsdM: number;
  holderVestedUnits: number;
  totalVestedUnits: number;
}): { amountUsdM: number; formula: string } {
  return {
    amountUsdM: participantShareOfPool({
      poolUsdM: args.contributorPoolUsdM,
      holderActiveUnits: args.holderVestedUnits,
      totalActiveUnits: args.totalVestedUnits,
    }),
    formula:
      'Contributor Pool × contributor’s vested eligible units ÷ total vested eligible contributor units',
  };
}

assertPoolSharesComplete();
