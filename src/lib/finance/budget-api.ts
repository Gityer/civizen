import { supabase } from '@/integrations/supabase/client';
import type { BudgetLifecycle } from '@/lib/finance/budget-rules';
import { canEditBudgetLifecycle } from '@/lib/finance/budget-rules';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type ProjectBudgetRow = {
  id: string;
  name: string;
  purpose: string | null;
  currency: string;
  version: number;
  lifecycle_status: BudgetLifecycle;
  period_start: string | null;
  period_end: string | null;
  internal_notes: string | null;
  supersedes_budget_id: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  is_demonstration: boolean;
  approved_at: string | null;
  approved_by: string | null;
  approval_reason: string | null;
  published_at: string | null;
  published_by: string | null;
  publication_note: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetGroupRow = {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  display_order: number;
  archived_at: string | null;
};

export type BudgetLineRow = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  planned_minor: number;
  committed_minor: number;
  actual_minor: number;
  currency: string;
  period_label: string | null;
  owner_label: string | null;
  funding_restriction_tag: string | null;
  public_description: string | null;
  publish_flag: boolean;
  status: 'active' | 'archived';
};

async function writeAudit(
  eventType: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await supabase.rpc('finance_write_audit' as never, {
    p_event_type: eventType,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_payload: payload,
    p_actor: null,
  } as never);
}

export async function listProjectBudgets(): Promise<Result<ProjectBudgetRow[]>> {
  const { data, error } = await supabase
    .from('project_budgets' as never)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as ProjectBudgetRow[] | null) ?? [] };
}

export async function createProjectBudget(input: {
  name: string;
  purpose?: string;
  currency?: string;
  periodStart?: string;
  periodEnd?: string;
  internalNotes?: string;
}): Promise<Result<ProjectBudgetRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('project_budgets' as never)
    .insert({
      name: input.name.trim(),
      purpose: input.purpose?.trim() || null,
      currency: (input.currency ?? 'USD').toUpperCase(),
      period_start: input.periodStart || null,
      period_end: input.periodEnd || null,
      internal_notes: input.internalNotes?.trim() || null,
      created_by: userData.user?.id ?? null,
      updated_by: userData.user?.id ?? null,
    } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const row = data as ProjectBudgetRow;
  await writeAudit('budget_created', 'project_budget', row.id, { name: row.name, version: row.version });
  return { ok: true, data: row };
}

export async function listBudgetGroups(budgetId: string): Promise<Result<BudgetGroupRow[]>> {
  const { data, error } = await supabase
    .from('budget_expense_groups' as never)
    .select('*')
    .eq('budget_id', budgetId)
    .order('display_order', { ascending: true });
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as BudgetGroupRow[] | null) ?? [] };
}

export async function createBudgetGroup(input: {
  budgetId: string;
  name: string;
  description?: string;
  displayOrder?: number;
}): Promise<Result<BudgetGroupRow>> {
  const budget = await getBudget(input.budgetId);
  if (!budget.ok) return { ok: false, message: budget.message };
  if (!canEditBudgetLifecycle(budget.data.lifecycle_status)) {
    return { ok: false, message: 'Approved budgets are immutable; create a revision draft first' };
  }
  const { data, error } = await supabase
    .from('budget_expense_groups' as never)
    .insert({
      budget_id: input.budgetId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      display_order: input.displayOrder ?? 0,
    } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as BudgetGroupRow };
}

export async function listBudgetLines(groupIds: string[]): Promise<Result<BudgetLineRow[]>> {
  if (groupIds.length === 0) return { ok: true, data: [] };
  const { data, error } = await supabase
    .from('budget_line_items' as never)
    .select('*')
    .in('group_id', groupIds)
    .order('title', { ascending: true });
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as BudgetLineRow[] | null) ?? [] };
}

export async function upsertBudgetLine(input: {
  id?: string;
  groupId: string;
  budgetId: string;
  title: string;
  description?: string;
  plannedMinor: number;
  committedMinor: number;
  actualMinor: number;
  currency: string;
  periodLabel?: string;
  ownerLabel?: string;
  fundingRestrictionTag?: string;
  publicDescription?: string;
  publishFlag?: boolean;
}): Promise<Result<BudgetLineRow>> {
  const budget = await getBudget(input.budgetId);
  if (!budget.ok) return { ok: false, message: budget.message };
  if (!canEditBudgetLifecycle(budget.data.lifecycle_status)) {
    return { ok: false, message: 'Approved budgets are immutable; create a revision draft first' };
  }

  const { data: userData } = await supabase.auth.getUser();
  const payload = {
    group_id: input.groupId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    planned_minor: input.plannedMinor,
    committed_minor: input.committedMinor,
    actual_minor: input.actualMinor,
    currency: input.currency.toUpperCase(),
    period_label: input.periodLabel?.trim() || null,
    owner_label: input.ownerLabel?.trim() || null,
    funding_restriction_tag: input.fundingRestrictionTag?.trim() || null,
    public_description: input.publicDescription?.trim() || null,
    publish_flag: Boolean(input.publishFlag),
    updated_by: userData.user?.id ?? null,
  };

  if (input.id) {
    const before = await supabase.from('budget_line_items' as never).select('*').eq('id', input.id).maybeSingle();
    const { data, error } = await supabase
      .from('budget_line_items' as never)
      .update(payload as never)
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) return { ok: false, message: error.message };
    await supabase.from('budget_revisions' as never).insert({
      budget_id: input.budgetId,
      change_summary: `Updated line item ${input.title.trim()}`,
      changed_fields: [{ before: before.data, after: data }],
      reason: 'line_item_update',
      actor_user_id: userData.user?.id ?? null,
    } as never);
    await writeAudit('budget_line_updated', 'budget_line_item', input.id, {
      title: input.title,
    });
    return { ok: true, data: data as BudgetLineRow };
  }

  const { data, error } = await supabase
    .from('budget_line_items' as never)
    .insert({ ...payload, created_by: userData.user?.id ?? null } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const row = data as BudgetLineRow;
  await supabase.from('budget_revisions' as never).insert({
    budget_id: input.budgetId,
    change_summary: `Created line item ${row.title}`,
    changed_fields: [{ after: row }],
    reason: 'line_item_create',
    actor_user_id: userData.user?.id ?? null,
  } as never);
  await writeAudit('budget_line_created', 'budget_line_item', row.id, { title: row.title });
  return { ok: true, data: row };
}

async function getBudget(id: string): Promise<Result<ProjectBudgetRow>> {
  const { data, error } = await supabase.from('project_budgets' as never).select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: 'budget not found' };
  return { ok: true, data: data as ProjectBudgetRow };
}

export async function submitBudgetForReview(budgetId: string, reason: string): Promise<Result<ProjectBudgetRow>> {
  const { data, error } = await supabase.rpc('finance_submit_budget' as never, {
    p_budget_id: budgetId,
    p_reason: reason.trim() || null,
  } as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as ProjectBudgetRow };
}

export async function returnBudgetToDraft(budgetId: string, reason: string): Promise<Result<ProjectBudgetRow>> {
  return transitionBudget(budgetId, 'draft', reason, 'budget_returned');
}

export async function approveBudget(budgetId: string, reason: string): Promise<Result<ProjectBudgetRow>> {
  const { data, error } = await supabase.rpc('finance_approve_budget' as never, {
    p_budget_id: budgetId,
    p_reason: reason.trim(),
  } as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as ProjectBudgetRow };
}

async function transitionBudget(
  budgetId: string,
  next: BudgetLifecycle,
  reason: string,
  eventType: string,
): Promise<Result<ProjectBudgetRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const current = await getBudget(budgetId);
  if (!current.ok) return current;
  const { data, error } = await supabase
    .from('project_budgets' as never)
    .update({
      lifecycle_status: next,
      updated_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', budgetId)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  await supabase.from('budget_revisions' as never).insert({
    budget_id: budgetId,
    change_summary: `Lifecycle ${current.data.lifecycle_status} → ${next}`,
    changed_fields: [{ field: 'lifecycle_status', before: current.data.lifecycle_status, after: next }],
    reason: reason.trim() || null,
    actor_user_id: userData.user?.id ?? null,
  } as never);
  await writeAudit(eventType, 'project_budget', budgetId, { reason, next });
  return { ok: true, data: data as ProjectBudgetRow };
}

/** Create a new draft version from an approved budget without rewriting history. */
export async function reviseApprovedBudget(budgetId: string, reason: string): Promise<Result<ProjectBudgetRow>> {
  const current = await getBudget(budgetId);
  if (!current.ok) return current;
  if (current.data.lifecycle_status !== 'approved') {
    return { ok: false, message: 'only approved budgets can start a revision draft' };
  }

  const { data: userData } = await supabase.auth.getUser();
  const { data: created, error } = await supabase
    .from('project_budgets' as never)
    .insert({
      name: current.data.name,
      purpose: current.data.purpose,
      currency: current.data.currency,
      version: current.data.version + 1,
      lifecycle_status: 'draft',
      period_start: current.data.period_start,
      period_end: current.data.period_end,
      internal_notes: current.data.internal_notes,
      supersedes_budget_id: current.data.id,
      created_by: userData.user?.id ?? null,
      updated_by: userData.user?.id ?? null,
    } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const draft = created as ProjectBudgetRow;

  const groups = await listBudgetGroups(budgetId);
  if (!groups.ok) return { ok: false, message: groups.message };
  const lines = await listBudgetLines(groups.data.map((g) => g.id));
  if (!lines.ok) return { ok: false, message: lines.message };

  for (const group of groups.data) {
    if (group.archived_at) continue;
    const { data: newGroup, error: gErr } = await supabase
      .from('budget_expense_groups' as never)
      .insert({
        budget_id: draft.id,
        name: group.name,
        description: group.description,
        display_order: group.display_order,
      } as never)
      .select('*')
      .single();
    if (gErr) return { ok: false, message: gErr.message };
    const ng = newGroup as BudgetGroupRow;
    for (const line of lines.data.filter((l) => l.group_id === group.id && l.status === 'active')) {
      const { error: lErr } = await supabase.from('budget_line_items' as never).insert({
        group_id: ng.id,
        title: line.title,
        description: line.description,
        planned_minor: line.planned_minor,
        committed_minor: line.committed_minor,
        actual_minor: line.actual_minor,
        currency: line.currency,
        period_label: line.period_label,
        owner_label: line.owner_label,
        funding_restriction_tag: line.funding_restriction_tag,
        public_description: line.public_description,
        publish_flag: line.publish_flag,
        created_by: userData.user?.id ?? null,
        updated_by: userData.user?.id ?? null,
      } as never);
      if (lErr) return { ok: false, message: lErr.message };
    }
  }

  await supabase.from('budget_revisions' as never).insert({
    budget_id: draft.id,
    change_summary: `Revision draft created from approved v${current.data.version}`,
    changed_fields: [{ from_budget_id: budgetId, to_budget_id: draft.id }],
    reason: reason.trim() || null,
    actor_user_id: userData.user?.id ?? null,
  } as never);
  await writeAudit('budget_revision_drafted', 'project_budget', draft.id, {
    from: budgetId,
    reason,
  });
  return { ok: true, data: draft };
}

export async function publishBudget(
  budgetId: string,
  note: string,
): Promise<Result<ProjectBudgetRow>> {
  const { data, error } = await supabase.rpc('finance_publish_budget' as never, {
    p_budget_id: budgetId,
    p_note: note.trim() || null,
  } as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as ProjectBudgetRow };
}

export async function unpublishBudget(budgetId: string, note: string): Promise<Result<ProjectBudgetRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('project_budgets' as never)
    .update({
      published_at: null,
      published_by: null,
      publication_note: note.trim() || null,
      updated_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', budgetId)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  await supabase.from('budget_publications' as never).insert({
    budget_id: budgetId,
    action: 'unpublish',
    public_snapshot: {},
    actor_user_id: userData.user?.id ?? null,
    note: note.trim() || null,
  } as never);
  await writeAudit('budget_unpublished', 'project_budget', budgetId, { note });
  return { ok: true, data: data as ProjectBudgetRow };
}

export function budgetLinesToCsv(
  budget: ProjectBudgetRow,
  groups: BudgetGroupRow[],
  lines: BudgetLineRow[],
): string {
  const headers = [
    'budget_name',
    'budget_version',
    'group',
    'title',
    'planned_minor',
    'committed_minor',
    'actual_minor',
    'currency',
    'publish_flag',
    'status',
  ];
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const escape = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = lines.map((l) =>
    [
      budget.name,
      String(budget.version),
      groupName.get(l.group_id) ?? '',
      l.title,
      String(l.planned_minor),
      String(l.committed_minor),
      String(l.actual_minor),
      l.currency,
      String(l.publish_flag),
      l.status,
    ]
      .map((c) => escape(c))
      .join(','),
  );
  return `${headers.join(',')}\n${rows.join('\n')}\n`;
}
