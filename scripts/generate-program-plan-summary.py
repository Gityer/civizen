#!/usr/bin/env python3
"""Generate versioned Program plan summary from canonical funding-and-budget metas/CSVs."""

from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs" / "04-operations" / "funding-and-budget"


def read_json(name: str) -> dict:
    return json.loads((DOCS / name).read_text(encoding="utf-8"))


def read_csv(name: str) -> list[dict]:
    with (DOCS / name).open(encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def main() -> None:
    meta14 = read_json("14-validation-workstreams-and-budget-v0.1.meta.json")
    meta_v03 = read_json("validation-budget-v0.3.meta.json")
    meta11 = read_json("11-program-financial-model-v0.1.meta.json")
    meta13 = read_json("13-ten-and-twenty-year-program-cost-v0.1.meta.json")
    rows14 = read_csv("14-validation-workstreams-and-budget-v0.1.csv")

    # Historical v0.1 CSV still reconciles to historical meta (provenance).
    csv_low = round(sum(float(r["low_usd_m"]) for r in rows14))
    csv_base = round(sum(float(r["base_usd_m"]) for r in rows14))
    csv_high = round(sum(float(r["high_usd_m"]) for r in rows14))
    if (
        csv_low != meta14["totals_usd_m"]["low"]
        or csv_base != meta14["totals_usd_m"]["base"]
        or csv_high != meta14["totals_usd_m"]["high"]
    ):
        raise SystemExit(
            f"Validation CSV/meta mismatch: csv={csv_low}/{csv_base}/{csv_high} "
            f"meta={meta14['totals_usd_m']['low']}/{meta14['totals_usd_m']['base']}/{meta14['totals_usd_m']['high']}"
        )

    years = list(meta11["years_base_usd_b"])
    year_sum = sum(years)
    if abs(year_sum - 37.5) > 0.01:
        raise SystemExit(f"Five-year cashflow does not sum to 37.5B (got {year_sum})")

    base13 = next(s for s in meta13["scenarios"] if s["scenario"] == "base")

    fc = meta_v03["by_funding_control_base_usd_m"]
    fc_sum = fc["core"] + fc["independent"] + fc["grant_pass_through"] + fc["reserve"]
    if abs(fc_sum - meta_v03["totals_usd_m"]["base"]) > 0.05:
        raise SystemExit(
            f"v0.3 funding-control split does not sum to Base: {fc_sum} vs {meta_v03['totals_usd_m']['base']}"
        )

    direct = meta_v03["direct_usd_m"]
    cont = meta_v03["contingency_usd_m"]
    pause = meta_v03["safe_pause_usd_m"]
    if abs(direct + cont + pause - meta_v03["totals_usd_m"]["base"]) > 0.05:
        raise SystemExit("v0.3 direct+contingency+safe-pause must equal Base")

    tranche = meta_v03["tranche_direct_usd_m"]
    tranche_sum = sum(tranche.values())
    if abs(tranche_sum - meta_v03["totals_usd_m"]["base"]) > 0.05:
        raise SystemExit(f"v0.3 tranche direct sum {tranche_sum} != Base")

    base_total = meta_v03["totals_usd_m"]["base"]

    summary = {
        "modelVersion": "0.3",
        "generatedAt": "2026-08-11",
        "currency": "USD",
        "status": "non_approved_planning_estimates",
        "disclaimer": (
            "Read-only strategic estimates and scenarios. Not approved budgets, commitments, "
            "receipts, or actual spending. Not worldwide completion or one organization’s budget. "
            "Validation Base is provisional owner-selected Recommended v0.3 exact $634.4M (~$634M); "
            "same-scope range ~$552–833M pending quotations. Historical: v0.1 $446M; early v0.2 $524M; "
            "v0.2 coverage draft $530.2M. Constrained (~$374M) and Expanded (~$1.03B) are different scopes."
        ),
        "hierarchy": {
            "detailedOperatingPlan": "validation_18_24_months",
            "primaryProgramPlan": "five_year_first_wave",
            "years6to10": "strategic_outlook_only",
            "years11to20": "directional_lifecycle_scenario",
        },
        "validation": {
            "status": "provisional_working_draft",
            "durationMonths": "18-24",
            "sourceDoc": "33-validation-scope-priority-tranche-decision.md",
            "sourceMeta": "validation-budget-v0.3.meta.json",
            "reconciliationDoc": "33-validation-scope-priority-tranche-decision.md",
            "modelVersion": meta_v03["version"],
            "updatedAt": meta_v03["date"],
            "totalsUsdM": {
                "low": meta_v03["totals_usd_m"]["low"],
                "base": meta_v03["totals_usd_m"]["base"],
                "high": meta_v03["totals_usd_m"]["high"],
            },
            "scopeAlternativesUsdM": meta_v03["scope_alternatives_usd_m"],
            "historicalV01TotalsUsdM": meta_v03["historical_v01_totals_usd_m"],
            "historicalV02CoverageDraftUsdM": meta_v03["historical_v02_coverage_draft_usd_m"],
            "fundingControlBaseUsdM": meta_v03["by_funding_control_base_usd_m"],
            "directContingencySafePauseUsdM": {
                "direct": direct,
                "contingency": cont,
                "safePause": pause,
            },
            "scenarioDiffNote": (
                "Same-scope Low (~$552.4M) / Base (exact $634.4M / ~$634M) / High (~$833.2M): unit-cost "
                "and quotation variance for the Recommended deliverable set — not scope cuts. "
                "Constrained (~$373.8M) and Expanded (~$1.0327B) are different scopes and must not be "
                "presented as equally capable cheaper/same programs. VAL-EX16 is quote-dependent. "
                "Historical: v0.1 $446M; early v0.2 $524M; v0.2 coverage $530.2M."
            ),
            "baseTranchePacing": [
                {
                    "id": "T1",
                    "label": "Formation & quotation (first required legal commitment ~$132M)",
                    "shareOfBase": round(tranche["T1_formation_quotation"] / base_total, 4),
                    "indicativeDirectUsdM": tranche["T1_formation_quotation"],
                },
                {
                    "id": "T2",
                    "label": "Core research & design",
                    "shareOfBase": round(tranche["T2_core_research_design"] / base_total, 4),
                    "indicativeDirectUsdM": tranche["T2_core_research_design"],
                },
                {
                    "id": "T3",
                    "label": "Participation & domain studies",
                    "shareOfBase": round(tranche["T3_participation_domain"] / base_total, 4),
                    "indicativeDirectUsdM": tranche["T3_participation_domain"],
                },
                {
                    "id": "T5",
                    "label": "Independent assurance",
                    "shareOfBase": round(tranche["T5_independent_assurance"] / base_total, 4),
                    "indicativeDirectUsdM": tranche["T5_independent_assurance"],
                },
                {
                    "id": "T4",
                    "label": "Controlled prototypes (after insurance bind path)",
                    "shareOfBase": round(tranche["T4_controlled_prototypes"] / base_total, 4),
                    "indicativeDirectUsdM": tranche["T4_controlled_prototypes"],
                },
                {
                    "id": "T6",
                    "label": "Safe-pause & continuity (tranche-specific)",
                    "shareOfBase": round(tranche["T6_safe_pause_continuity"] / base_total, 4),
                    "indicativeDirectUsdM": tranche["T6_safe_pause_continuity"],
                },
            ],
            "fundingControlsNote": (
                "Distinguish expression of interest, pledge, conditional commitment, legally binding "
                "commitment, received cash, escrowed cash, and available cash. Do not begin T1 on "
                "nonbinding interest alone. Initial received/escrowed working floor provisional $60M. "
                "No obligations dependent on an uncommitted later tranche. Insurance binding or an "
                "approved binding path before field activity. Receiving-entity path unresolved — "
                "do not accept funds until authorized."
            ),
            "workstreamCount": meta_v03["line_count"],
            "groupCount": meta_v03["group_count"],
            "workstreamsDoc": "33-validation-scope-priority-tranche-decision.md",
            "appBudgetName": meta_v03["app_budget_name"],
        },
        "fiveYearFirstWave": {
            "status": "preliminary_ecosystem_hypothesis",
            "sourceDoc": "11-program-financial-model-and-funding-responsibility-v0.1.md",
            "sourceMeta": "11-program-financial-model-v0.1.meta.json",
            "modelVersion": meta11["version"],
            "updatedAt": meta11["date"],
            "rangeUsdB": {"lowRounded": 30, "highRounded": 50},
            "modeledBaseUsdB": 37.5,
            "modeledBaseExactUsdB": meta11["five_year_base_usd_b"],
            "reconciledBaseUsdB": "37.5-38.0",
            "annualBaseCashflowUsdB": [
                {"year": i + 1, "amountUsdB": amount} for i, amount in enumerate(years)
            ],
            "corePrimaryResponsibleUsdB": meta11["core_primary_responsible_usd_b"],
            "coreMustRaiseUsdB": meta11["core_must_raise_usd_b"],
            "notWorldwideCompletion": True,
            "notSingleOrganizationBudget": True,
            "domainLayers": {
                "frameworkVsDeployment": (
                    "SD-* lines are shared frameworks/standards only. "
                    "Domain production deployment is attributed inside JP/II, not added on top of SD-*."
                ),
                "health": {
                    "frameworkSdHeaUsdM": 280,
                    "jpIiProvisionalDeploymentUsdM": 1870,
                    "jpIiShareOf17bPct": 11,
                    "notWorldwideHealthImplementation": True,
                    "confidence": "low",
                    "quoteRequired": True,
                },
                "insuranceSystems": {
                    "sdInsFrameworkUsdM": 120,
                    "fundingSource": "carve_from_SD-FIN_80_plus_SD-ADD_40",
                    "sdFinAfterCarveUsdM": 270,
                    "sdAddAfterCarveUsdM": 90,
                    "jpIiProvisionalIntegrationUsdM": 680,
                    "jpIiShareOf17bPct": 4,
                    "notUnderwriterOrClaimsStore": True,
                    "confidence": "low",
                    "quoteRequired": True,
                },
                "responsibility": {
                    "shared": "frameworks, standards, federation patterns, independent assurance",
                    "jurisdictionalInstitutional": "local adaptation, production systems, clinical/insurance operation",
                },
            },
        },
        "longRangeOutlook": {
            "status": "internal_lifecycle_scenarios",
            "confidence": "low",
            "defaultStatement": (
                "Years 6–20 are maintained as internal lifecycle scenarios and will be "
                "replaced by rolling evidence-based plans."
            ),
            "sourceDoc": "13-ten-and-twenty-year-program-cost-framework-v0.1.md",
            "advancedDisclosureOnly": True,
            "sensitivityNote": (
                "Highly sensitive to adoption, scope, technology, jurisdiction participation, "
                "inflation, and institutional design. Not accepted by governments, funders, or "
                "institutions. Not a budget, forecast, promise, or current funding request."
            ),
            "scenariosUsdB": {
                "baseYears1to10": base13["years_1_10_usd_b"],
                "baseYears1to20": base13["years_1_20_usd_b"],
            },
        },
        "reconciliation": {
            "historicalValidationCsvMatchesMetaV01": True,
            "validationWorkingDraft": "v0.3",
            "fiveYearCashflowSumsToBase": True,
            "sdInsCarveNetZeroToFiveYearTotal": True,
        },
    }

    json_path = DOCS / "program-plan-summary-v0.1.json"
    json_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    ts_path = ROOT / "src" / "lib" / "funding" / "program-plan-summary.generated.ts"
    ts_body = (
        "/** AUTO-GENERATED by scripts/generate-program-plan-summary.py — do not edit by hand. */\n"
        f"export const PROGRAM_PLAN_SUMMARY = {json.dumps(summary, indent=2)} as const;\n\n"
        "export type ProgramPlanSummary = typeof PROGRAM_PLAN_SUMMARY;\n"
    )
    ts_path.write_text(ts_body, encoding="utf-8")
    print(f"Wrote {json_path}")
    print(f"Wrote {ts_path}")


if __name__ == "__main__":
    main()
