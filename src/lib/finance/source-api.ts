import { supabase } from '@/integrations/supabase/client';
import { calculateTransactionFee, type LiablePartyType } from '@/lib/finance/fees';
import type {
  CommitmentStatus,
  FundingSourceCategory,
  RelationshipStatus,
} from '@/lib/finance/source-rules';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type FinanceSourceRow = {
  id: string;
  display_name: string;
  category: FundingSourceCategory;
  jurisdiction: string | null;
  website: string | null;
  internal_owner: string | null;
  relationship_status: RelationshipStatus;
  requested_minor: number | null;
  currency: string;
  priority: number | null;
  probability_pct: number | null;
  public_display_name: string | null;
  publish_source: boolean;
  publish_requested_amount: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceSourceEventRow = {
  id: string;
  source_id: string;
  event_type: string;
  event_at: string;
  summary: string;
  next_action: string | null;
  next_action_at: string | null;
  private_notes: string | null;
  evidence_ref: string | null;
  actor_user_id: string | null;
  corrects_event_id: string | null;
  created_at: string;
};

export type FinanceCommitmentRow = {
  id: string;
  source_id: string;
  amount_minor: number;
  currency: string;
  commitment_date: string;
  conditional: boolean;
  conditions: string | null;
  restrictions: string | null;
  intended_period: string | null;
  evidence_ref: string | null;
  status: CommitmentStatus;
  created_at: string;
};

export type FinanceReceiptRow = {
  id: string;
  source_id: string;
  commitment_id: string | null;
  amount_minor: number;
  currency: string;
  received_date: string;
  external_reference: string | null;
  evidence_ref: string | null;
  restriction_tag: string | null;
  reverses_receipt_id: string | null;
  created_at: string;
};

export type FinanceAllocationRow = {
  id: string;
  receipt_id: string;
  line_item_id: string;
  amount_minor: number;
  currency: string;
  allocated_at: string;
  purpose_note: string | null;
  override_reason: string | null;
  reverses_allocation_id: string | null;
  actor_user_id: string | null;
  created_at: string;
};

export type FinanceCostAssessmentRow = {
  id: string;
  related_receipt_id: string | null;
  related_transaction_ref: string | null;
  liable_party_type: LiablePartyType;
  liable_legal_entity_name: string | null;
  processor_cost_minor: number;
  audit_cost_minor: number;
  other_allowed_cost_minor: number;
  adjustment_minor: number;
  currency: string;
  rule_version: string;
  assessed_user_fee_minor: number;
  calculation_note: string;
  reason: string | null;
  actor_user_id: string | null;
  created_at: string;
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

export async function listFinanceSources(): Promise<Result<FinanceSourceRow[]>> {
  const { data, error } = await supabase
    .from('finance_funding_sources' as never)
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FinanceSourceRow[] | null) ?? [] };
}

export async function createFinanceSource(input: {
  displayName: string;
  category: FundingSourceCategory;
  jurisdiction?: string;
  website?: string;
  internalOwner?: string;
  requestedMinor?: number | null;
  currency?: string;
  priority?: number | null;
  probabilityPct?: number | null;
  internalNotes?: string;
}): Promise<Result<FinanceSourceRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('finance_funding_sources' as never)
    .insert({
      display_name: input.displayName.trim(),
      category: input.category,
      jurisdiction: input.jurisdiction?.trim() || null,
      website: input.website?.trim() || null,
      internal_owner: input.internalOwner?.trim() || null,
      requested_minor: input.requestedMinor ?? null,
      currency: (input.currency ?? 'USD').toUpperCase(),
      priority: input.priority ?? null,
      probability_pct: input.probabilityPct ?? null,
      internal_notes: input.internalNotes?.trim() || null,
      created_by: userData.user?.id ?? null,
      updated_by: userData.user?.id ?? null,
    } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const row = data as FinanceSourceRow;
  await writeAudit('source_created', 'finance_funding_source', row.id, {
    display_name: row.display_name,
    category: row.category,
  });
  return { ok: true, data: row };
}

export async function updateFinanceSourceStatus(
  sourceId: string,
  status: RelationshipStatus,
  summary: string,
): Promise<Result<FinanceSourceRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('finance_funding_sources' as never)
    .update({
      relationship_status: status,
      updated_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', sourceId)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  await supabase.from('finance_source_events' as never).insert({
    source_id: sourceId,
    event_type: 'status_change',
    summary: summary.trim() || `Status → ${status}`,
    actor_user_id: userData.user?.id ?? null,
  } as never);
  await writeAudit('source_status_changed', 'finance_funding_source', sourceId, { status });
  // Spec: status committed does not create a receipt.
  return { ok: true, data: data as FinanceSourceRow };
}

export async function logSourceEvent(input: {
  sourceId: string;
  eventType: string;
  summary: string;
  nextAction?: string;
  nextActionAt?: string;
  privateNotes?: string;
  evidenceRef?: string;
}): Promise<Result<FinanceSourceEventRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('finance_source_events' as never)
    .insert({
      source_id: input.sourceId,
      event_type: input.eventType.trim(),
      summary: input.summary.trim(),
      next_action: input.nextAction?.trim() || null,
      next_action_at: input.nextActionAt || null,
      private_notes: input.privateNotes?.trim() || null,
      evidence_ref: input.evidenceRef?.trim() || null,
      actor_user_id: userData.user?.id ?? null,
    } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const row = data as FinanceSourceEventRow;
  await writeAudit('source_event_logged', 'finance_source_event', row.id, {
    source_id: input.sourceId,
    event_type: input.eventType,
  });
  return { ok: true, data: row };
}

export async function listSourceEvents(sourceId: string): Promise<Result<FinanceSourceEventRow[]>> {
  const { data, error } = await supabase
    .from('finance_source_events' as never)
    .select('*')
    .eq('source_id', sourceId)
    .order('event_at', { ascending: false });
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FinanceSourceEventRow[] | null) ?? [] };
}

export async function createFinanceCommitment(input: {
  sourceId: string;
  amountMinor: number;
  currency: string;
  commitmentDate?: string;
  conditional?: boolean;
  conditions?: string;
  restrictions?: string;
  intendedPeriod?: string;
  evidenceRef?: string;
  status?: CommitmentStatus;
}): Promise<Result<FinanceCommitmentRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('finance_commitments' as never)
    .insert({
      source_id: input.sourceId,
      amount_minor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      commitment_date: input.commitmentDate || new Date().toISOString().slice(0, 10),
      conditional: Boolean(input.conditional),
      conditions: input.conditions?.trim() || null,
      restrictions: input.restrictions?.trim() || null,
      intended_period: input.intendedPeriod?.trim() || null,
      evidence_ref: input.evidenceRef?.trim() || null,
      status: input.status ?? 'proposed',
      created_by: userData.user?.id ?? null,
      updated_by: userData.user?.id ?? null,
    } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const row = data as FinanceCommitmentRow;
  await writeAudit('commitment_created', 'finance_commitment', row.id, {
    amount_minor: row.amount_minor,
    status: row.status,
  });
  return { ok: true, data: row };
}

export async function listFinanceCommitments(sourceId?: string): Promise<Result<FinanceCommitmentRow[]>> {
  let q = supabase.from('finance_commitments' as never).select('*').order('created_at', { ascending: false });
  if (sourceId) q = q.eq('source_id', sourceId);
  const { data, error } = await q.limit(200);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FinanceCommitmentRow[] | null) ?? [] };
}

export async function createFinanceReceipt(input: {
  sourceId: string;
  amountMinor: number;
  currency: string;
  commitmentId?: string;
  receivedDate?: string;
  externalReference?: string;
  evidenceRef?: string;
  restrictionTag?: string;
}): Promise<Result<FinanceReceiptRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('finance_receipts' as never)
    .insert({
      source_id: input.sourceId,
      commitment_id: input.commitmentId || null,
      amount_minor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      received_date: input.receivedDate || new Date().toISOString().slice(0, 10),
      external_reference: input.externalReference?.trim() || null,
      evidence_ref: input.evidenceRef?.trim() || null,
      restriction_tag: input.restrictionTag?.trim() || null,
      created_by: userData.user?.id ?? null,
    } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const row = data as FinanceReceiptRow;
  await writeAudit('receipt_created', 'finance_receipt', row.id, {
    amount_minor: row.amount_minor,
    source_id: row.source_id,
  });
  return { ok: true, data: row };
}

export async function reverseFinanceReceipt(
  receiptId: string,
  reason: string,
): Promise<Result<FinanceReceiptRow>> {
  const { data: original, error: loadErr } = await supabase
    .from('finance_receipts' as never)
    .select('*')
    .eq('id', receiptId)
    .maybeSingle();
  if (loadErr) return { ok: false, message: loadErr.message };
  if (!original) return { ok: false, message: 'receipt not found' };
  const src = original as FinanceReceiptRow;
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('finance_receipts' as never)
    .insert({
      source_id: src.source_id,
      commitment_id: src.commitment_id,
      amount_minor: src.amount_minor,
      currency: src.currency,
      received_date: new Date().toISOString().slice(0, 10),
      external_reference: `reversal:${src.id}`,
      evidence_ref: src.evidence_ref,
      restriction_tag: src.restriction_tag,
      reverses_receipt_id: src.id,
      created_by: userData.user?.id ?? null,
    } as never)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  const row = data as FinanceReceiptRow;
  await writeAudit('receipt_reversed', 'finance_receipt', row.id, {
    reverses: src.id,
    reason,
  });
  return { ok: true, data: row };
}

export async function listFinanceReceipts(sourceId?: string): Promise<Result<FinanceReceiptRow[]>> {
  let q = supabase.from('finance_receipts' as never).select('*').order('received_date', { ascending: false });
  if (sourceId) q = q.eq('source_id', sourceId);
  const { data, error } = await q.limit(200);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FinanceReceiptRow[] | null) ?? [] };
}

export async function allocateReceipt(input: {
  receiptId: string;
  lineItemId: string;
  amountMinor: number;
  purposeNote?: string;
  overrideReason?: string;
}): Promise<Result<FinanceAllocationRow>> {
  const { data, error } = await supabase.rpc('finance_allocate_receipt' as never, {
    p_receipt_id: input.receiptId,
    p_line_item_id: input.lineItemId,
    p_amount_minor: input.amountMinor,
    p_purpose_note: input.purposeNote ?? null,
    p_override_reason: input.overrideReason ?? null,
  } as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as FinanceAllocationRow };
}

export async function listFinanceAllocations(receiptId?: string): Promise<Result<FinanceAllocationRow[]>> {
  let q = supabase.from('finance_allocations' as never).select('*').order('created_at', { ascending: false });
  if (receiptId) q = q.eq('receipt_id', receiptId);
  const { data, error } = await q.limit(300);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FinanceAllocationRow[] | null) ?? [] };
}

export async function assessTransactionCost(input: {
  liablePartyType: LiablePartyType;
  liableLegalEntityName?: string;
  processorCostMinor: number;
  auditCostMinor: number;
  otherAllowedCostMinor: number;
  adjustmentMinor?: number;
  currency?: string;
  relatedReceiptId?: string;
  relatedTransactionRef?: string;
  reason?: string;
}): Promise<Result<FinanceCostAssessmentRow>> {
  // Client-side validation mirrors DB rule for tests / early feedback.
  const preview = calculateTransactionFee({
    liablePartyType: input.liablePartyType,
    liableLegalEntityName: input.liableLegalEntityName,
    processorCostMinor: input.processorCostMinor,
    auditCostMinor: input.auditCostMinor,
    otherAllowedCostMinor: input.otherAllowedCostMinor,
    adjustmentMinor: input.adjustmentMinor,
  });
  void preview;

  const { data, error } = await supabase.rpc('finance_assess_transaction_cost' as never, {
    p_liable_party_type: input.liablePartyType,
    p_liable_legal_entity_name: input.liableLegalEntityName ?? null,
    p_processor_cost_minor: input.processorCostMinor,
    p_audit_cost_minor: input.auditCostMinor,
    p_other_allowed_cost_minor: input.otherAllowedCostMinor,
    p_adjustment_minor: input.adjustmentMinor ?? 0,
    p_currency: (input.currency ?? 'USD').toUpperCase(),
    p_related_receipt_id: input.relatedReceiptId ?? null,
    p_related_transaction_ref: input.relatedTransactionRef ?? null,
    p_reason: input.reason ?? null,
  } as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as FinanceCostAssessmentRow };
}

export async function listCostAssessments(): Promise<Result<FinanceCostAssessmentRow[]>> {
  const { data, error } = await supabase
    .from('finance_cost_assessments' as never)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FinanceCostAssessmentRow[] | null) ?? [] };
}

export async function setSourcePublishFlags(input: {
  sourceId: string;
  publishSource: boolean;
  publishRequestedAmount: boolean;
  publicDisplayName?: string;
}): Promise<Result<FinanceSourceRow>> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('finance_funding_sources' as never)
    .update({
      publish_source: input.publishSource,
      publish_requested_amount: input.publishRequestedAmount,
      public_display_name: input.publicDisplayName?.trim() || null,
      updated_by: userData.user?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', input.sourceId)
    .select('*')
    .single();
  if (error) return { ok: false, message: error.message };
  await writeAudit('source_publish_flags', 'finance_funding_source', input.sourceId, {
    publish_source: input.publishSource,
    publish_requested_amount: input.publishRequestedAmount,
  });
  return { ok: true, data: data as FinanceSourceRow };
}
