/**
 * Client-side idempotent seed for Civizen Pre-Major-Build Validation Program v0.2.
 * Does not overwrite v0.1. Creates no commitments/receipts/allocations.
 */
import { supabaseUntyped } from '@/integrations/supabase/untyped';
import {
  VALIDATION_BUDGET_GROUPS_V02,
  VALIDATION_BUDGET_LINES_V02,
  VALIDATION_BUDGET_V02,
} from '@/lib/finance/validation-budget-v02';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type SeedValidationBudgetV02Result = {
  budgetId: string;
  created: boolean;
  groupCount: number;
  lineCount: number;
  plannedMinor: number;
};

export async function seedValidationBudgetV02(): Promise<Result<SeedValidationBudgetV02Result>> {
  const existing = await supabaseUntyped
    .from('project_budgets')
    .select('id')
    .eq('name', VALIDATION_BUDGET_V02.name)
    .eq('version', VALIDATION_BUDGET_V02.version)
    .maybeSingle();

  if (existing.error) return { ok: false, message: existing.error.message };
  if (existing.data) {
    const budgetId = (existing.data as { id: string }).id;
    return {
      ok: true,
      data: {
        budgetId,
        created: false,
        groupCount: VALIDATION_BUDGET_GROUPS_V02.length,
        lineCount: VALIDATION_BUDGET_LINES_V02.length,
        plannedMinor: VALIDATION_BUDGET_V02.plannedTotalMinor,
      },
    };
  }

  const prior = await supabaseUntyped
    .from('project_budgets')
    .select('id')
    .eq('name', VALIDATION_BUDGET_V02.supersedesName)
    .eq('version', 1)
    .maybeSingle();

  const supersedesId = prior.data ? (prior.data as { id: string }).id : null;
  const { data: userData } = await supabaseUntyped.auth.getUser();
  const actor = userData.user?.id ?? null;

  const inserted = await supabaseUntyped
    .from('project_budgets')
    .insert({
      name: VALIDATION_BUDGET_V02.name,
      purpose: VALIDATION_BUDGET_V02.purpose,
      currency: VALIDATION_BUDGET_V02.currency,
      version: VALIDATION_BUDGET_V02.version,
      lifecycle_status: VALIDATION_BUDGET_V02.lifecycleStatus,
      internal_notes: VALIDATION_BUDGET_V02.internalNotes,
      is_demonstration: VALIDATION_BUDGET_V02.isDemonstration,
      supersedes_budget_id: supersedesId,
      created_by: actor,
      updated_by: actor,
    })
    .select('id')
    .single();

  if (inserted.error) {
    if (inserted.error.code === '23505') return seedValidationBudgetV02();
    return { ok: false, message: inserted.error.message };
  }

  const budgetId = (inserted.data as { id: string }).id;
  const groupIdByKey = new Map<string, string>();

  for (const group of VALIDATION_BUDGET_GROUPS_V02) {
    const g = await supabaseUntyped
      .from('budget_expense_groups')
      .insert({
        budget_id: budgetId,
        name: group.name,
        description: group.description,
        display_order: group.displayOrder,
      })
      .select('id')
      .single();
    if (g.error) return { ok: false, message: g.error.message };
    groupIdByKey.set(group.key, (g.data as { id: string }).id);
  }

  for (const line of VALIDATION_BUDGET_LINES_V02) {
    const groupId = groupIdByKey.get(line.groupKey);
    if (!groupId) return { ok: false, message: `Missing group ${line.groupKey}` };
    const li = await supabaseUntyped.from('budget_line_items').insert({
      group_id: groupId,
      title: line.title,
      description: line.description,
      public_description: line.publicDescription,
      planned_minor: line.plannedMinor,
      committed_minor: line.committedMinor,
      actual_minor: line.actualMinor,
      currency: line.currency,
      period_label: line.periodLabel,
      publish_flag: line.publishFlag,
      status: 'active',
      owner_label: line.ownerLabel,
      created_by: actor,
      updated_by: actor,
    });
    if (li.error) return { ok: false, message: li.error.message };
  }

  await supabaseUntyped.from('budget_revisions').insert({
    budget_id: budgetId,
    change_summary: 'Seeded Validation Budget v0.2 (exact $530,200,000.00 Base)',
    changed_fields: ['seed', 'validation-budget-v0.2', 'base-530.2'],
    reason: 'Provisional working draft from docs 29/30 reconciliation. No commitments/receipts/publication.',
    actor_user_id: actor,
  });

  if (supersedesId) {
    await supabaseUntyped
      .from('project_budgets')
      .update({ lifecycle_status: 'superseded' })
      .eq('id', supersedesId)
      .eq('lifecycle_status', 'draft');
  }

  return {
    ok: true,
    data: {
      budgetId,
      created: true,
      groupCount: VALIDATION_BUDGET_GROUPS_V02.length,
      lineCount: VALIDATION_BUDGET_LINES_V02.length,
      plannedMinor: VALIDATION_BUDGET_V02.plannedTotalMinor,
    },
  };
}
