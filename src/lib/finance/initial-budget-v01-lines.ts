import type { InitialBudgetLineV01 } from './initial-budget-v01';

/** Line items of Draft Budget v0.1; groups, phases and the summary live in initial-budget-v01.ts. */
function line(
  partial: Omit<InitialBudgetLineV01, 'plannedMinor' | 'committedMinor' | 'actualMinor' | 'currency' | 'publishFlag'>,
): InitialBudgetLineV01 {
  return {
    ...partial,
    plannedMinor: 0,
    committedMinor: 0,
    actualMinor: 0,
    currency: 'USD',
    publishFlag: false,
  };
}

export const INITIAL_BUDGET_LINES_V01: readonly InitialBudgetLineV01[] = [
  // Product and engineering
  line({
    groupKey: 'product_engineering',
    title: 'Core platform engineering (Phase 1)',
    description:
      'Planning estimate TBD — engineering capacity to maintain and extend the working Civizen platform during foundation/prototype continuity. Basis: active development evidenced in repo; no contracted rate on file.',
    publicDescription: 'Product engineering for the working Civizen platform (planning amount TBD).',
    phaseId: 'phase1',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 1 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'product_engineering',
    title: 'Core platform engineering (Phase 2)',
    description:
      'Planning estimate TBD — engineering for pilot-ready features and hardening support. No staffing contracts documented in-repo.',
    publicDescription: 'Engineering support for limited pilot readiness (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'product_engineering',
    title: 'Core platform engineering (Phase 3)',
    description:
      'Planning estimate TBD — engineering for production readiness and institutional integration work. Not funded.',
    publicDescription: 'Engineering for production-readiness work (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'product_engineering',
    title: 'Automated test and release quality capacity',
    description:
      'Planning estimate TBD — sustained Vitest/CI/release verification capacity. Repo has verify:ci and Vitest; no separate vendor quote.',
    publicDescription: 'Quality and release verification capacity (planning amount TBD).',
    phaseId: 'phase1',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 1 · Timing TBD · one_time',
  }),

  // Design and accessibility
  line({
    groupKey: 'design_accessibility',
    title: 'UX/UI and accessibility review (Phase 1–2)',
    description:
      'Planning estimate TBD — accessibility and UX polish for public and member surfaces. No agency quote in-repo.',
    publicDescription: 'Design and accessibility improvements (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · personnel_or_service',
  }),

  // Security
  line({
    groupKey: 'security_privacy',
    title: 'Security hardening sprint',
    description:
      'Planning estimate TBD — focused hardening before limited pilot. No third-party audit quote in-repo.',
    publicDescription: 'Security hardening before limited pilot (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · one_time',
  }),
  line({
    groupKey: 'security_privacy',
    title: 'Independent security / privacy review',
    description:
      'Planning estimate TBD — external review when pilot or institutional partners require it. No vendor selected.',
    publicDescription: 'Independent security or privacy review (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · one_time',
  }),
  line({
    groupKey: 'security_privacy',
    title: 'Ongoing security monitoring and incident readiness',
    description:
      'Planning estimate TBD — annual monitoring/retainer capacity. Recurring; not a live contract.',
    publicDescription: 'Ongoing security monitoring capacity (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'recurring',
    periodLabel: 'Conceptual annual · Timing TBD · recurring',
  }),

  // Infrastructure
  line({
    groupKey: 'infrastructure_tools',
    title: 'Application hosting and database (annual)',
    description:
      'Planning estimate TBD — VPS/nginx production host and Supabase-managed database/auth implied by ops docs and stack. No invoice amounts in public repo.',
    publicDescription: 'Hosting and managed database operations (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'infrastructure_or_vendor',
    periodLabel: 'Conceptual annual · Timing TBD · infrastructure_or_vendor',
  }),
  line({
    groupKey: 'infrastructure_tools',
    title: 'DNS, edge, and CI tooling (annual)',
    description:
      'Planning estimate TBD — Cloudflare DNS/edge keys and GitHub Actions CI referenced in ops docs. Plan tier unknown.',
    publicDescription: 'DNS/edge and continuous integration tooling (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'infrastructure_or_vendor',
    periodLabel: 'Conceptual annual · Timing TBD · infrastructure_or_vendor',
  }),
  line({
    groupKey: 'infrastructure_tools',
    title: 'AI model/API usage for in-app agents',
    description:
      'Planning estimate TBD — OpenAI / Gemini / Anthropic usage implied by solutions-council and messaging agent docs. Usage-based; no spend history published in-repo.',
    publicDescription: 'AI API usage for product features (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'infrastructure_or_vendor',
    periodLabel: 'Conceptual annual · Timing TBD · infrastructure_or_vendor',
  }),
  line({
    groupKey: 'infrastructure_tools',
    title: 'Environment bootstrap and staging capacity',
    description:
      'Planning estimate TBD — one-time staging/isolation improvements aligned with ENVIRONMENT_LIFECYCLE. No vendor quote.',
    publicDescription: 'Staging and environment bootstrap (planning amount TBD).',
    phaseId: 'phase1',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 1 · Timing TBD · one_time',
  }),

  // Legal
  line({
    groupKey: 'legal_governance',
    title: 'Legal entity and counsel engagement',
    description:
      'Planning estimate TBD — receiving-entity architecture remains an open legal question (open-legal-questions.md). Not an accepted counsel engagement.',
    publicDescription: 'Legal entity and counsel preparation (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'legal_governance',
    title: 'Accounting setup and bookkeeping readiness',
    description:
      'Planning estimate TBD — software ledger ≠ legal books (funding integrity policy). No accountant engaged in-repo.',
    publicDescription: 'Accounting and bookkeeping readiness (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'legal_governance',
    title: 'Compliance preparation (KYC/AML outline readiness)',
    description:
      'Planning estimate TBD — policy outline exists; live providers gated. Preparation only, not provider fees.',
    publicDescription: 'Compliance preparation work (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · one_time',
  }),

  // Research / pilots
  line({
    groupKey: 'research_pilots',
    title: 'Limited pilot facilitation (Phase 2)',
    description:
      'Planning estimate TBD — scoped pilot facilitation per funding-readiness Stage 3. No partner or pilot budget locked.',
    publicDescription: 'Limited pilot facilitation (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · one_time',
  }),
  line({
    groupKey: 'research_pilots',
    title: 'Evaluation and research partnership support',
    description:
      'Planning estimate TBD — university/NGO evaluation capacity. No MoU or award in-repo.',
    publicDescription: 'Research and evaluation support (planning amount TBD).',
    phaseId: 'phase2',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 2 · Timing TBD · personnel_or_service',
  }),

  // Operations
  line({
    groupKey: 'operations',
    title: 'Project coordination and administration (annual)',
    description:
      'Planning estimate TBD — founder-led coordination capacity. Not a payroll commitment.',
    publicDescription: 'Project coordination and administration (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual annual · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'operations',
    title: 'Administrative tooling and productivity software (annual)',
    description:
      'Planning estimate TBD — generic ops tooling. No SaaS spend register in-repo.',
    publicDescription: 'Administrative tooling (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'recurring',
    periodLabel: 'Conceptual annual · Timing TBD · recurring',
  }),

  // Partnerships / comms
  line({
    groupKey: 'partnerships_comms',
    title: 'Public documentation and messaging capacity',
    description:
      'Planning estimate TBD — documentation/messaging aligned with funding readiness Stages 1–2. No agency retainers documented.',
    publicDescription: 'Public documentation and messaging (planning amount TBD).',
    phaseId: 'phase1',
    costClass: 'personnel_or_service',
    periodLabel: 'Conceptual Phase 1 · Timing TBD · personnel_or_service',
  }),
  line({
    groupKey: 'partnerships_comms',
    title: 'Targeted institutional outreach (Phase 2–3)',
    description:
      'Planning estimate TBD — selective conversations after pilot readiness; not indiscriminate fundraising. No campaign budget.',
    publicDescription: 'Targeted institutional outreach (planning amount TBD).',
    phaseId: 'phase3',
    costClass: 'one_time',
    periodLabel: 'Conceptual Phase 3 · Timing TBD · one_time',
  }),

  // Contingency
  line({
    groupKey: 'contingency',
    title: 'Planning contingency reserve',
    description:
      'Planning estimate TBD — reserve percentage/amount to be set by owner once base estimates exist. Not spent funds.',
    publicDescription: 'Contingency reserve (planning amount TBD).',
    phaseId: 'annual',
    costClass: 'reserve',
    periodLabel: 'Conceptual annual · Timing TBD · reserve',
  }),
];
