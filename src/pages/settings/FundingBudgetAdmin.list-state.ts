import type { ProjectBudgetRow } from '@/lib/finance/budget-api';
import { VALIDATION_BUDGET_V01 } from '@/lib/finance/validation-budget-v01';
import { VALIDATION_BUDGET_V02 } from '@/lib/finance/validation-budget-v02';
import { VALIDATION_BUDGET_V03 } from '@/lib/finance/validation-budget-v03';

export type WorkflowAction = 'submit' | 'approve' | 'revise' | 'publish' | 'unpublish';

/** Classify budget list outcome for empty/error UI (pure; unit-tested). */
export function classifyBudgetListState(args: {
  loading: boolean;
  allowView: boolean;
  error: string | null;
  budgetCount: number;
  selectedId: string | null;
}): 'loading' | 'access_denied' | 'load_failed' | 'empty' | 'no_selection' | 'ready' {
  if (args.loading) return 'loading';
  if (!args.allowView) return 'access_denied';
  if (args.error) {
    const msg = args.error.toLowerCase();
    if (
      msg.includes('permission')
      || msg.includes('not allowed')
      || msg.includes('403')
      || msg.includes('42501')
      || msg.includes('rls')
      || msg.includes('jwt')
    ) {
      return 'access_denied';
    }
    return 'load_failed';
  }
  if (args.budgetCount === 0) return 'empty';
  if (!args.selectedId) return 'no_selection';
  return 'ready';
}

/** Partition helper (tests / historical views). Ordinary UI uses ordinaryBudgetsForSelector. */
export function partitionBudgetsForSelector(budgets: ProjectBudgetRow[]): {
  active: ProjectBudgetRow[];
  demonstration: ProjectBudgetRow[];
} {
  const active: ProjectBudgetRow[] = [];
  const demonstration: ProjectBudgetRow[] = [];
  for (const budget of budgets) {
    if (budget.is_demonstration) demonstration.push(budget);
    else active.push(budget);
  }
  return { active, demonstration };
}

/** Budgets shown in ordinary Settings → Funding → Budget selection. */
export function ordinaryBudgetsForSelector(budgets: ProjectBudgetRow[]): ProjectBudgetRow[] {
  return budgets.filter(
    (budget) => !budget.is_demonstration && budget.lifecycle_status !== 'superseded',
  );
}

/** Superseded drafts retained for history (not primary selector clutter). */
export function historicalBudgetsForSelector(budgets: ProjectBudgetRow[]): ProjectBudgetRow[] {
  return budgets.filter((budget) => budget.lifecycle_status === 'superseded');
}

/** Preferred current working validation revision. */
export function preferredWorkingBudgetId(budgets: ProjectBudgetRow[]): string | null {
  const ordinary = ordinaryBudgetsForSelector(budgets);
  return (
    ordinary.find((b) => b.name === VALIDATION_BUDGET_V03.name)?.id
    ?? ordinary.find((b) => b.name === VALIDATION_BUDGET_V02.name)?.id
    ?? ordinary.find((b) => b.name === VALIDATION_BUDGET_V01.name)?.id
    ?? ordinary[0]?.id
    ?? null
  );
}

/** Use a dropdown only when the user can choose among multiple ordinary budgets. */
export function shouldUseBudgetSelector(ordinaryBudgetCount: number): boolean {
  return ordinaryBudgetCount > 1;
}

/** Longest ordinary budget name — used to size the selector to its contents. */
export function budgetSelectorSizingLabel(
  budgets: Pick<ProjectBudgetRow, 'name'>[],
  selectedName: string,
): string {
  return budgets.reduce(
    (longest, budget) => (budget.name.length > longest.length ? budget.name : longest),
    selectedName,
  );
}

/** Human lifecycle label key suffix for badges (Draft / Review / Approved). */
export function budgetLifecycleBadgeKey(
  status: ProjectBudgetRow['lifecycle_status'],
): 'draft' | 'review' | 'approved' | 'other' {
  if (status === 'draft') return 'draft';
  if (status === 'under_review') return 'review';
  if (status === 'approved') return 'approved';
  return 'other';
}

/** Primary consequential action for the selected budget status/permissions. */
export function primaryBudgetWorkflowAction(args: {
  lifecycleStatus: ProjectBudgetRow['lifecycle_status'];
  publishedAt: string | null;
  editable: boolean;
  canApproveSelected: boolean;
  allowEdit: boolean;
  allowPublish: boolean;
}): WorkflowAction | null {
  if (args.editable) return 'submit';
  if (args.lifecycleStatus === 'under_review' && args.canApproveSelected) return 'approve';
  if (args.lifecycleStatus === 'approved') {
    if (args.allowPublish && !args.publishedAt) return 'publish';
    if (args.allowEdit) return 'revise';
    if (args.allowPublish && args.publishedAt) return 'unpublish';
  }
  return null;
}
