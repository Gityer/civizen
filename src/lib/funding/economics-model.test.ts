import { describe, expect, it } from 'vitest';

import {
  BASE_FPP_ELIGIBLE_TOTAL_USD_M,
  DEFAULT_INVESTOR_ILLUSTRATION_USD_M,
  ECONOMICS_MODEL_VERSION,
  POLICY_FORMULA_EXAMPLE_DISTRIBUTABLE_USD_M,
  VALIDATION_ASK_USD_M,
  VALIDATION_ASK_V01_BASE_USD_M,
  allocateDistributablePools,
  assessFounderParticipation,
  buildAnnualProjection,
  buildContributorIllustration,
  buildInvestorIllustration,
  calculateIrr,
  commercialCapitalSourcesAndUsesBase,
  economicsSummary,
  founderParticipationPoolUsdM,
  paybackYear,
  policyFormulaExample,
  reconcilePrivateCapitalEligibility,
  selectedModelWaterfall,
  vehicleCapitalUsdM,
} from './economics-model';

describe('economics-model v0.1.4 — selected model + deficit recovery', () => {
  it('FPP is exactly 1% and does not reassess internal/already-assessed lots', () => {
    expect(founderParticipationPoolUsdM(1_470)).toBe(14.7);
    expect(
      assessFounderParticipation({
        amountUsdM: 100,
        classification: 'excluded_internal_or_already_assessed',
      }).assessedUsdM,
    ).toBe(0);
    expect(
      assessFounderParticipation({
        amountUsdM: 100,
        classification: 'eligible_external',
        alreadyAssessed: true,
      }).assessedUsdM,
    ).toBe(0);
  });

  it('reconciles cash flow and carries accumulated deficits forward', () => {
    const { cumulative, reconciliation, rows } = buildAnnualProjection('base', 15);

    expect(cumulative.revenueUsdM).toBe(21_327);
    expect(cumulative.costsUsdM).toBe(13_814.3);
    expect(cumulative.requiredDeductionsUsdM).toBe(4_469.3);

    // Revenue − costs − deductions = simple cumulative remainder
    expect(reconciliation.simpleCumulativeRemainderUsdM).toBe(3_043.4);
    expect(
      round1(
        reconciliation.revenueUsdM - reconciliation.costsUsdM - reconciliation.deductionsUsdM,
      ),
    ).toBe(reconciliation.simpleCumulativeRemainderUsdM);

    // Floored annual sum overstates by abs(early deficits)
    expect(reconciliation.flooredAnnualSumUsdM).toBe(3_527.5);
    expect(reconciliation.flooredDeficitAdjustmentUsdM).toBe(484.1);
    expect(
      round1(
        reconciliation.simpleCumulativeRemainderUsdM + reconciliation.flooredDeficitAdjustmentUsdM,
      ),
    ).toBe(reconciliation.flooredAnnualSumUsdM);

    // Primary eligible base recovers deficits before pools
    expect(reconciliation.eligibleDistributableBaseUsdM).toBe(3_043.4);
    expect(cumulative.eligibleDistributableUsdM).toBe(3_043.4);
    expect(reconciliation.peakAccumulatedDeficitUsdM).toBe(484.1);
    expect(reconciliation.cumulativeCapitalDrawnUsdM).toBe(1_200);

    // Y8–Y9 have floored CSV distributable but zero carry-forward eligible
    const y8 = rows.find((r) => r.year === 8)!;
    const y9 = rows.find((r) => r.year === 9)!;
    const y10 = rows.find((r) => r.year === 10)!;
    expect(y8.flooredAnnualDistributableUsdM).toBe(93.3);
    expect(y8.eligibleDistributableUsdM).toBe(0);
    expect(y9.eligibleDistributableUsdM).toBe(0);
    expect(y10.eligibleDistributableUsdM).toBe(127);
  });

  it('Investor + Contributor + Ecosystem equal eligible distributable base', () => {
    const { cumulative } = buildAnnualProjection('base', 15);
    expect(
      round1(
        cumulative.investorPoolUsdM + cumulative.contributorPoolUsdM + cumulative.ecosystemUsdM,
      ),
    ).toBe(cumulative.eligibleDistributableUsdM);

    const pools = allocateDistributablePools(310);
    expect(pools).toEqual({ investorUsdM: 31, contributorUsdM: 31, ecosystemUsdM: 248 });
  });

  it('selected-model waterfall matches annual projection — not the $310M policy example', () => {
    const waterfall = selectedModelWaterfall('base', 15);
    const summary = economicsSummary('base', 15);
    expect(waterfall.pools.investorUsdM).toBe(summary.pools.investorUsdM);
    expect(waterfall.pools.contributorUsdM).toBe(summary.pools.contributorUsdM);
    expect(waterfall.pools.ecosystemUsdM).toBe(summary.pools.ecosystemUsdM);
    expect(waterfall.pools.investorUsdM).not.toBe(31);
    expect(waterfall.pools.ecosystemUsdM).not.toBe(248);

    const eligible = waterfall.rows.find((r) => r.id === 'eligible')!;
    expect(eligible.amountUsdM).toBe(3_043.4);
    expect(eligible.amountUsdM).not.toBe(POLICY_FORMULA_EXAMPLE_DISTRIBUTABLE_USD_M);

    const policy = policyFormulaExample();
    expect(policy.distributableUsdM).toBe(310);
    expect(policy.pools).toEqual({ investorUsdM: 31, contributorUsdM: 31, ecosystemUsdM: 248 });
    expect(policy.amountKind).toBe('policy_example');
    expect(waterfall.amountKind).toBe('projection');
  });

  it('horizon/scenario changes update waterfall and contributor/ecosystem amounts', () => {
    const base15 = selectedModelWaterfall('base', 15);
    const base5 = selectedModelWaterfall('base', 5);
    const cons15 = selectedModelWaterfall('conservative', 15);
    expect(base5.pools.investorUsdM).toBeLessThan(base15.pools.investorUsdM);
    expect(cons15.pools.ecosystemUsdM).toBeLessThan(base15.pools.ecosystemUsdM);

    const contrib = buildContributorIllustration({
      contributorPoolUsdM: base15.pools.contributorUsdM,
      holderVestedUnits: 10,
      totalVestedUnits: 100,
    });
    expect(contrib.amountUsdM).toBe(round3(base15.pools.contributorUsdM * 0.1));
  });

  it('validates vehicle capacity and uses FPP-eligible units as denominator', () => {
    const vEnt = vehicleCapitalUsdM('V-ENT', 'base');
    expect(vEnt.modeledVehicleCapitalUsdM).toBe(700);
    expect(vEnt.fppEligibleVehicleCapitalUsdM).toBe(500);
    expect(DEFAULT_INVESTOR_ILLUSTRATION_USD_M).toBeLessThanOrEqual(
      vEnt.fppEligibleVehicleCapitalUsdM,
    );

    const ok = buildInvestorIllustration({
      investmentUsdM: 100,
      vehicle: 'V-ENT',
      entryYear: 1,
      commercialScenario: 'base',
      horizonYears: 15,
    });
    expect(ok.exceedsVehicleCapacity).toBe(false);
    expect(ok.totalActiveEligibleUnits).toBe(500);
    expect(ok.shareOfActiveInvestorPoolUnits).toBe(0.2);
    expect(ok.inScenario).toBe(true);
    expect(ok.founderAllocationAttributableUsdM).toBe(1);
    expect(ok.netDeployableCapitalUsdM).toBe(99);

    const over = buildInvestorIllustration({
      investmentUsdM: 800,
      vehicle: 'V-ENT',
      entryYear: 1,
      commercialScenario: 'base',
      horizonYears: 15,
    });
    expect(over.exceedsVehicleCapacity).toBe(true);
    expect(over.inScenario).toBe(false);
    expect(over.capacityWarning).toMatch(/exceeds/i);
    expect(over.modeledCumulativeDistributionsUsdM).toBeNull();
    expect(over.shareOfActiveInvestorPoolUnits).toBe(0);
  });

  it('IRR/payback return null when unavailable; cash MOIC excludes TV', () => {
    expect(calculateIrr([1, 1])).toBeNull();
    expect(paybackYear({ investedUsdM: 100, annualDistributionsUsdM: [1, 1] })).toBeNull();
    const inv = buildInvestorIllustration({
      investmentUsdM: 100,
      vehicle: 'V-ENT',
      entryYear: 1,
      commercialScenario: 'base',
      horizonYears: 15,
      terminalValueUsdM: 0,
    });
    expect(inv.moicIncludingTerminalValue).toBeNull();
    expect(ECONOMICS_MODEL_VERSION).toBe('0.1.6');
  });

  it('uses Validation Budget v0.3 restricted ask and keeps FPP eligible base unchanged', () => {
    expect(VALIDATION_ASK_USD_M).toEqual({ low: 552.4, base: 634.4, high: 833.2 });
    expect(VALIDATION_ASK_V01_BASE_USD_M).toBe(446);
    expect(BASE_FPP_ELIGIBLE_TOTAL_USD_M).toBe(1470);
    expect(founderParticipationPoolUsdM(BASE_FPP_ELIGIBLE_TOTAL_USD_M)).toBe(14.7);
    const baseCase = reconcilePrivateCapitalEligibility('base');
    expect(baseCase.validationRestrictedUsdM).toBe(634.4);
    expect(baseCase.receiptsEnteringParticipatingEntitiesUsdM).toBe(3434.4);
    expect(baseCase.excludedRestrictedUsdM).toBe(1164.4);
    expect(baseCase.fppEligibleReceiptsUsdM).toBe(1470);
    expect(baseCase.founderParticipationPoolUsdM).toBe(14.7);
    expect(baseCase.netDeployableReceiptsUsdM).toBe(3419.7);
    expect(baseCase.lifecycle).toEqual({ accruedUsdM: 14.7, vestedUsdM: 0, payableUsdM: 0, paidUsdM: 0 });
    const uses = commercialCapitalSourcesAndUsesBase();
    expect(uses.envelopeUsdM).toBe(1200);
    expect(uses.committedUsdM + uses.receivedUsdM + uses.drawnUsdM).toBe(0);
    expect(uses.undrawnUsdM).toBe(1200);
  });
});

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

describe('economics page section hierarchy contract', () => {
  it('declares desktop section order and mobile stacked projection shape', async () => {
    const { ECONOMICS_PAGE_SECTION_ORDER } = await import('./economics-page-layout');
    expect(ECONOMICS_PAGE_SECTION_ORDER).toEqual([
      'controls_and_summary',
      'selected_model_waterfall',
      'investor_illustration',
      'receipt_fpp_reconciliation',
      'commercial_capital_sources_uses',
      'annual_projection',
      'policy_formula_example',
      'assumptions',
    ]);

    const { rows } = buildAnnualProjection('base', 5);
    for (const row of rows) {
      expect(row).toEqual(
        expect.objectContaining({
          year: expect.any(Number),
          operatingSurplusDeficitUsdM: expect.any(Number),
          eligibleDistributableUsdM: expect.any(Number),
        }),
      );
    }
  });
});
