import { INITIAL_BUDGET_LINES_V01 } from './initial-budget-v01-lines';
/**
 * Canonical structure for Civizen Draft Budget v0.1 (planning skeleton).
 * Planned/committed/actual monetary values are intentionally zero until the
 * project owner confirms planning estimates. See:
 * docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md
 */

export const INITIAL_BUDGET_V01 = {
  name: 'Civizen Draft Budget v0.1',
  version: 1,
  currency: 'USD',
  purpose:
    'Internal demonstration planning skeleton only. Phase 1–3 labels are conceptual placeholders (Timing TBD), not calendar schedules and not the validation Months 1–24 or five-year Years 1–5 Program plan. Amounts remain zero until an approved operational budget replaces or formally remaps this skeleton.',
  internalNotes:
    'Source: docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md. Currency USD is a planning-display assumption pending owner confirmation. is_demonstration=true until amounts are owner-confirmed. Do not approve or publish until estimates are reviewed.',
  isDemonstration: true,
  lifecycleStatus: 'draft' as const,
} as const;

export const BUDGET_PHASES_V01 = [
  {
    id: 'phase1',
    label: 'Phase 1 — Foundation and working prototype',
    outcome:
      'Credible public identity, working platform continuity, governance/finance documentation, and inquiry-only funding surfaces.',
    timingNote:
      'Conceptual placeholder only — Timing TBD. Not a calendar period and not the 18–24-month validation program or Years 1–5 first-wave plan.',
  },
  {
    id: 'phase2',
    label: 'Phase 2 — Security hardening and limited pilot',
    outcome:
      'Hardened security/privacy posture, measurable pilot with a scoped partner or community, and evidence suitable for targeted funding conversations.',
    timingNote:
      'Conceptual placeholder only — Timing TBD. Not a calendar period and not the validation or five-year program horizons.',
  },
  {
    id: 'phase3',
    label: 'Phase 3 — Production readiness and institutional integration',
    outcome:
      'Counsel-ready receiving-entity posture, operational reporting, and capacity for institutional partnerships without implying those partnerships are funded.',
    timingNote:
      'Conceptual placeholder only — Timing TBD. Not a calendar period and not mapped to Program plan Months 1–24 or Years 1–5.',
  },
  {
    id: 'annual',
    label: 'Ongoing annual operations',
    outcome:
      'Steady-state hosting, tooling, communications, light legal/accounting retainers, and contingency for continuity after foundation work.',
    timingNote: 'Conceptual recurring bucket — Timing TBD until an approved operational budget defines periods.',
  },
] as const;

export type BudgetCostClassV01 = 'one_time' | 'recurring' | 'personnel_or_service' | 'infrastructure_or_vendor' | 'reserve';

export type InitialBudgetLineV01 = {
  groupKey: string;
  title: string;
  description: string;
  publicDescription: string;
  /** Always 0 in v0.1 — TBD until owner-confirmed estimates exist. */
  plannedMinor: 0;
  committedMinor: 0;
  actualMinor: 0;
  currency: 'USD';
  phaseId: (typeof BUDGET_PHASES_V01)[number]['id'];
  costClass: BudgetCostClassV01;
  periodLabel: string;
  publishFlag: false;
};

export type InitialBudgetGroupV01 = {
  key: string;
  name: string;
  description: string;
  displayOrder: number;
};

export const INITIAL_BUDGET_GROUPS_V01: readonly InitialBudgetGroupV01[] = [
  {
    key: 'product_engineering',
    name: 'Product and engineering',
    description: 'Application development, quality, release continuity, and technical delivery.',
    displayOrder: 10,
  },
  {
    key: 'design_accessibility',
    name: 'Design and accessibility',
    description: 'UX/UI refinement, accessibility review, and public-surface clarity.',
    displayOrder: 20,
  },
  {
    key: 'security_privacy',
    name: 'Security, privacy, auditing, and resilience',
    description: 'Hardening, reviews, incident readiness, and privacy-preserving operations.',
    displayOrder: 30,
  },
  {
    key: 'infrastructure_tools',
    name: 'Infrastructure and development tools',
    description: 'Hosting, database, CI, DNS/edge, and developer tooling already implied by the stack.',
    displayOrder: 40,
  },
  {
    key: 'legal_governance',
    name: 'Legal, governance, accounting, and compliance preparation',
    description: 'Entity readiness, counsel, accounting setup, and compliance foundations (not capital acceptance).',
    displayOrder: 50,
  },
  {
    key: 'research_pilots',
    name: 'Research, testing, and pilots',
    description: 'Evaluation, limited pilots, and evidence gathering for adoption and funding conversations.',
    displayOrder: 60,
  },
  {
    key: 'operations',
    name: 'Project and organizational operations',
    description: 'Day-to-day coordination, administration, and founder-led operating capacity.',
    displayOrder: 70,
  },
  {
    key: 'partnerships_comms',
    name: 'Partnerships, communications, and funding outreach',
    description: 'Public messaging, institutional conversations, and targeted outreach (not broad fundraising campaigns).',
    displayOrder: 80,
  },
  {
    key: 'contingency',
    name: 'Contingency',
    description: 'Planning reserve for unknowns; not allocated spending.',
    displayOrder: 90,
  },
] as const;

export function summarizeInitialBudgetV01() {
  const byPhase: Record<string, number> = {};
  const byCostClass: Record<string, number> = {};
  const byGroup: Record<string, number> = {};
  let planned = 0;
  let committed = 0;
  let actual = 0;

  for (const lineItem of INITIAL_BUDGET_LINES_V01) {
    planned += lineItem.plannedMinor;
    committed += lineItem.committedMinor;
    actual += lineItem.actualMinor;
    byPhase[lineItem.phaseId] = (byPhase[lineItem.phaseId] ?? 0) + lineItem.plannedMinor;
    byCostClass[lineItem.costClass] = (byCostClass[lineItem.costClass] ?? 0) + lineItem.plannedMinor;
    byGroup[lineItem.groupKey] = (byGroup[lineItem.groupKey] ?? 0) + lineItem.plannedMinor;
  }

  return {
    currency: INITIAL_BUDGET_V01.currency,
    lineCount: INITIAL_BUDGET_LINES_V01.length,
    groupCount: INITIAL_BUDGET_GROUPS_V01.length,
    plannedMinor: planned,
    committedMinor: committed,
    actualMinor: actual,
    byPhase,
    byCostClass,
    byGroup,
    amountsAreTbd: planned === 0 && committed === 0 && actual === 0,
  };
}

export { INITIAL_BUDGET_LINES_V01 };
