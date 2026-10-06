/**
 * Client-side idempotent seed for Civizen Pre-Major-Build Validation Program v0.1.
 * Does not recreate Civizen Draft Budget v0.1 (retired). Creates no commitments/receipts/allocations.
 */
import { supabaseUntyped } from '@/integrations/supabase/untyped';
import {
  VALIDATION_BUDGET_GROUPS_V01,
  VALIDATION_BUDGET_LINES_V01,
  VALIDATION_BUDGET_V01,
  VALIDATION_FUNDING_CONTROL_LABELS_V01,
  validationLineDescription,
  validationLinePeriodLabel,
  validationLineTitle,
} from '@/lib/finance/validation-budget-v01';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type SeedValidationBudgetResult = {
  budgetId: string;
  created: boolean;
  groupCount: number;
  lineCount: number;
  plannedTotalMinor: number;
};

export async function seedValidationBudgetV01(): Promise<Result<SeedValidationBudgetResult>> {
  const existing = await supabaseUntyped
    .from('project_budgets')
    .select('id')
    .eq('name', VALIDATION_BUDGET_V01.name)
    .eq('version', VALIDATION_BUDGET_V01.version)
    .maybeSingle();

  if (existing.error) return { ok: false, message: existing.error.message };
  if (existing.data) {
    const budgetId = (existing.data as { id: string }).id;
    const groups = await supabaseUntyped
      .from('budget_expense_groups')
      .select('id')
      .eq('budget_id', budgetId);
    const groupIds = ((groups.data as { id: string }[] | null) ?? []).map((g) => g.id);
    let lineCount = 0;
    let plannedTotalMinor = 0;
    if (groupIds.length > 0) {
      const lines = await supabaseUntyped
        .from('budget_line_items')
        .select('id, planned_minor')
        .in('group_id', groupIds);
      const rows = (lines.data as { id: string; planned_minor: number }[] | null) ?? [];
      lineCount = rows.length;
      plannedTotalMinor = rows.reduce((acc, row) => acc + Number(row.planned_minor), 0);
    }
    return {
      ok: true,
      data: {
        budgetId,
        created: false,
        groupCount: groupIds.length,
        lineCount,
        plannedTotalMinor,
      },
    };
  }

  const { data: userData } = await supabaseUntyped.auth.getUser();
  const actor = userData.user?.id ?? null;

  const inserted = await supabaseUntyped
    .from('project_budgets')
    .insert({
      name: VALIDATION_BUDGET_V01.name,
      purpose: VALIDATION_BUDGET_V01.purpose,
      currency: VALIDATION_BUDGET_V01.currency,
      version: VALIDATION_BUDGET_V01.version,
      lifecycle_status: VALIDATION_BUDGET_V01.lifecycleStatus,
      internal_notes: VALIDATION_BUDGET_V01.internalNotes,
      is_demonstration: VALIDATION_BUDGET_V01.isDemonstration,
      created_by: actor,
      updated_by: actor,
    })
    .select('id')
    .single();

  if (inserted.error) {
    if (inserted.error.code === '23505') {
      return seedValidationBudgetV01();
    }
    return { ok: false, message: inserted.error.message };
  }

  const budgetId = (inserted.data as { id: string }).id;
  const groupIdByKey = new Map<string, string>();

  for (const group of VALIDATION_BUDGET_GROUPS_V01) {
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

  for (const line of VALIDATION_BUDGET_LINES_V01) {
    const groupId = groupIdByKey.get(line.groupKey);
    if (!groupId) return { ok: false, message: `Missing group ${line.groupKey}` };
    const li = await supabaseUntyped.from('budget_line_items').insert({
      group_id: groupId,
      title: validationLineTitle(line),
      description: validationLineDescription(line),
      public_description: line.publicDescription,
      planned_minor: line.plannedMinor,
      committed_minor: 0,
      actual_minor: 0,
      currency: VALIDATION_BUDGET_V01.currency,
      period_label: validationLinePeriodLabel(line),
      owner_label: VALIDATION_FUNDING_CONTROL_LABELS_V01[line.fundingControl],
      funding_restriction_tag: line.fundingControl,
      publish_flag: false,
      status: 'active',
      created_by: actor,
      updated_by: actor,
    });
    if (li.error) return { ok: false, message: li.error.message };
  }

  await supabaseUntyped.from('budget_revisions').insert({
    budget_id: budgetId,
    change_summary: 'Seeded Pre-Major-Build Validation Program v0.1 (base scenario working estimates)',
    changed_fields: ['seed', 'validation-budget-v0.1'],
    reason:
      'Idempotent import from document 14 CSV base scenario. Draft only; no approval, publication, commitments, receipts, or allocations.',
    actor_user_id: actor,
  });

  await supabaseUntyped.rpc('finance_write_audit', {
    p_event_type: 'budget_seeded_validation_v01',
    p_entity_type: 'project_budget',
    p_entity_id: budgetId,
    p_payload: {
      name: VALIDATION_BUDGET_V01.name,
      version: VALIDATION_BUDGET_V01.version,
      planned_total_minor: VALIDATION_BUDGET_V01.plannedTotalMinor,
      line_count: VALIDATION_BUDGET_LINES_V01.length,
      draft: true,
      published: false,
    },
    p_actor: actor,
  });

  return {
    ok: true,
    data: {
      budgetId,
      created: true,
      groupCount: VALIDATION_BUDGET_GROUPS_V01.length,
      lineCount: VALIDATION_BUDGET_LINES_V01.length,
      plannedTotalMinor: VALIDATION_BUDGET_V01.plannedTotalMinor,
    },
  };
}
