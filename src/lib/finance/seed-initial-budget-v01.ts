/**
 * Explicit local-dev helper to recreate Draft Budget v0.1 demonstration skeleton.
 * Not used by ordinary app startup. Requires force: true (or VITE_ALLOW_DEMO_BUDGET_SEED=true).
 * Prefer SQL: scripts/db/local-dev-only/seed-initial-working-budget-v01.sql
 */
import { supabase } from '@/integrations/supabase/client';
import {
  INITIAL_BUDGET_GROUPS_V01,
  INITIAL_BUDGET_LINES_V01,
  INITIAL_BUDGET_V01,
} from '@/lib/finance/initial-budget-v01';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type SeedInitialBudgetResult = {
  budgetId: string;
  created: boolean;
  groupCount: number;
  lineCount: number;
};

function demoBudgetSeedAllowed(force?: boolean): boolean {
  if (force) return true;
  try {
    return import.meta.env.VITE_ALLOW_DEMO_BUDGET_SEED === 'true';
  } catch {
    return false;
  }
}

export async function seedInitialWorkingBudgetV01(options?: {
  force?: boolean;
}): Promise<Result<SeedInitialBudgetResult>> {
  if (!demoBudgetSeedAllowed(options?.force)) {
    return {
      ok: false,
      message:
        'Civizen Draft Budget v0.1 demonstration seed is retired from ordinary use. Pass { force: true } or set VITE_ALLOW_DEMO_BUDGET_SEED=true for explicit local-only recreation.',
    };
  }

  const existing = await supabase
    .from('project_budgets')
    .select('id')
    .eq('name', INITIAL_BUDGET_V01.name)
    .eq('version', INITIAL_BUDGET_V01.version)
    .maybeSingle();

  if (existing.error) return { ok: false, message: existing.error.message };
  if (existing.data) {
    const budgetId = (existing.data as { id: string }).id;
    const groups = await supabase
      .from('budget_expense_groups')
      .select('id')
      .eq('budget_id', budgetId);
    const groupIds = ((groups.data as { id: string }[] | null) ?? []).map((g) => g.id);
    let lineCount = 0;
    if (groupIds.length > 0) {
      const lines = await supabase
        .from('budget_line_items')
        .select('id')
        .in('group_id', groupIds);
      lineCount = (lines.data as { id: string }[] | null)?.length ?? 0;
    }
    return {
      ok: true,
      data: {
        budgetId,
        created: false,
        groupCount: groupIds.length,
        lineCount,
      },
    };
  }

  const { data: userData } = await supabase.auth.getUser();
  const actor = userData.user?.id ?? null;

  const inserted = await supabase
    .from('project_budgets')
    .insert({
      name: INITIAL_BUDGET_V01.name,
      purpose: INITIAL_BUDGET_V01.purpose,
      currency: INITIAL_BUDGET_V01.currency,
      version: INITIAL_BUDGET_V01.version,
      lifecycle_status: INITIAL_BUDGET_V01.lifecycleStatus,
      internal_notes: INITIAL_BUDGET_V01.internalNotes,
      is_demonstration: INITIAL_BUDGET_V01.isDemonstration,
      created_by: actor,
      updated_by: actor,
    })
    .select('id')
    .single();

  if (inserted.error) {
    // Race: another session created the unique (name, version)
    if (inserted.error.code === '23505') {
      return seedInitialWorkingBudgetV01(options);
    }
    return { ok: false, message: inserted.error.message };
  }

  const budgetId = (inserted.data as { id: string }).id;
  const groupIdByKey = new Map<string, string>();

  for (const group of INITIAL_BUDGET_GROUPS_V01) {
    const g = await supabase
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

  for (const line of INITIAL_BUDGET_LINES_V01) {
    const groupId = groupIdByKey.get(line.groupKey);
    if (!groupId) return { ok: false, message: `Missing group ${line.groupKey}` };
    const li = await supabase.from('budget_line_items').insert({
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
      created_by: actor,
      updated_by: actor,
    });
    if (li.error) return { ok: false, message: li.error.message };
  }

  await supabase.from('budget_revisions').insert({
    budget_id: budgetId,
    change_summary: 'Seeded Draft Budget v0.1 structure (all amounts TBD/0)',
    changed_fields: ['seed', 'initial-working-budget-v0.1'],
    reason:
      'Idempotent planning skeleton; no monetary estimates invented from evidence-insufficient repository search.',
    actor_user_id: actor,
  });

  await supabase.rpc('finance_write_audit', {
    p_event_type: 'budget_seeded_v01',
    p_entity_type: 'project_budget',
    p_entity_id: budgetId,
    p_payload: {
      name: INITIAL_BUDGET_V01.name,
      version: INITIAL_BUDGET_V01.version,
      is_demonstration: true,
      amounts_tbd: true,
    },
    p_actor: actor,
  });

  return {
    ok: true,
    data: {
      budgetId,
      created: true,
      groupCount: INITIAL_BUDGET_GROUPS_V01.length,
      lineCount: INITIAL_BUDGET_LINES_V01.length,
    },
  };
}
