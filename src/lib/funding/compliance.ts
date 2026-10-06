import { supabase } from '@/integrations/supabase/client';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type FundingComplianceCase = {
  id: string;
  funder_id: string | null;
  funding_commitment_id: string | null;
  case_type: string;
  status: string;
  priority: string;
  summary: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FundingPaymentReceipt = {
  id: string;
  funding_commitment_id: string;
  provider: string;
  external_reference: string | null;
  amount_usd: number;
  currency: string;
  received_at: string;
  reconciliation_status: string;
  notes: string | null;
  created_at: string;
};

export async function listFundingComplianceCases(limit = 200): Promise<Result<FundingComplianceCase[]>> {
  const { data, error } = await supabase
    .from('funding_compliance_cases' as never)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FundingComplianceCase[] | null) ?? [] };
}

export async function upsertFundingComplianceCase(input: {
  caseId?: string | null;
  caseType: string;
  summary: string;
  funderId?: string | null;
  fundingCommitmentId?: string | null;
  status?: string;
  priority?: string;
  notes?: string;
}): Promise<Result<FundingComplianceCase>> {
  const { data, error } = await supabase.rpc('upsert_funding_compliance_case' as never, {
    p_case_id: input.caseId ?? null,
    p_case_type: input.caseType,
    p_summary: input.summary,
    p_funder_id: input.funderId ?? null,
    p_funding_commitment_id: input.fundingCommitmentId ?? null,
    p_status: input.status ?? 'open',
    p_priority: input.priority ?? 'normal',
    p_notes: input.notes ?? null,
  } as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as FundingComplianceCase };
}

export async function listFundingPaymentReceipts(limit = 200): Promise<Result<FundingPaymentReceipt[]>> {
  const { data, error } = await supabase
    .from('funding_payment_receipts' as never)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FundingPaymentReceipt[] | null) ?? [] };
}

export async function recordFundingPaymentReceipt(input: {
  fundingCommitmentId: string;
  amountUsd: number;
  provider?: string;
  externalReference?: string;
  currency?: string;
  receivedAt?: string;
  notes?: string;
  markCommitmentReceived?: boolean;
}): Promise<Result<{ receipt_id: string; mark_result: unknown }>> {
  const { data, error } = await supabase.rpc('record_funding_payment_receipt' as never, {
    p_funding_commitment_id: input.fundingCommitmentId,
    p_amount_usd: input.amountUsd,
    p_provider: input.provider ?? 'manual',
    p_external_reference: input.externalReference ?? null,
    p_currency: input.currency ?? 'USD',
    p_received_at: input.receivedAt ?? null,
    p_notes: input.notes ?? null,
    p_mark_commitment_received: Boolean(input.markCommitmentReceived),
  } as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as { receipt_id: string; mark_result: unknown } };
}
