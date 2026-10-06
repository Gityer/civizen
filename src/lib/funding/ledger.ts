import { supabase } from '@/integrations/supabase/client';
import type {
  FundingCommitmentRow,
  FundingLaneTotalRow,
  FunderRow,
  LedgerCommitmentStatus,
  RecordFundingCommitmentInput,
  RecordFundingCommitmentResult,
} from '@/lib/funding/types';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export async function listFundingCommitments(limit = 200): Promise<Result<FundingCommitmentRow[]>> {
  const { data, error } = await supabase
    .from('funding_commitments' as never)
    .select(
      'id, funder_id, lane, amount_original, currency, amount_usd, payment_method, status, restrictions, restriction_code, agreement_id, receipt_id, date_pledged, date_received, notes, created_at, funders(legal_name, public_display_name, funder_type, country, email)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FundingCommitmentRow[] | null) ?? [] };
}

export async function listFunders(limit = 200): Promise<Result<FunderRow[]>> {
  const { data, error } = await supabase
    .from('funders' as never)
    .select(
      'id, legal_name, public_display_name, funder_type, country, email, kyc_status, accredited_investor_status, sanctions_status, tax_profile_status, created_at',
    )
    .order('legal_name', { ascending: true })
    .limit(limit);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FunderRow[] | null) ?? [] };
}

export async function listFundingLaneTotals(): Promise<Result<FundingLaneTotalRow[]>> {
  const { data, error } = await supabase.from('funding_lane_totals' as never).select('*');
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FundingLaneTotalRow[] | null) ?? [] };
}

export async function markFundingCommitmentStatus(args: {
  commitmentId: string;
  status: LedgerCommitmentStatus;
  amountUsd?: number | null;
  bankReference?: string;
  transactionHash?: string;
  dateReceived?: string;
}): Promise<Result<{ commitment_id: string; status: string; amount_usd: number | null; ledger_entry_id: string | null; investor_position_id: string | null }>> {
  const { data, error } = await supabase.rpc('mark_funding_commitment_status' as never, {
    p_commitment_id: args.commitmentId,
    p_status: args.status,
    p_amount_usd: args.amountUsd ?? null,
    p_bank_reference: args.bankReference ?? null,
    p_transaction_hash: args.transactionHash ?? null,
    p_date_received: args.dateReceived ?? null,
  } as never);

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    data: data as {
      commitment_id: string;
      status: string;
      amount_usd: number | null;
      ledger_entry_id: string | null;
      investor_position_id: string | null;
    },
  };
}

export type FundingAuditEventRow = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  actor_user_id: string | null;
  created_at: string;
};

export async function listFundingAuditEvents(limit = 200): Promise<Result<FundingAuditEventRow[]>> {
  const { data, error } = await supabase
    .from('funding_ledger_audit_events' as never)
    .select('id, event_type, entity_type, entity_id, payload, actor_user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: (data as FundingAuditEventRow[] | null) ?? [] };
}

export async function recordFundingCommitment(
  input: RecordFundingCommitmentInput,
): Promise<Result<RecordFundingCommitmentResult>> {
  const legalName = input.legalName.trim();
  if (!legalName) return { ok: false, message: 'Legal name is required.' };
  if (!Number.isFinite(input.amountOriginal) || input.amountOriginal <= 0) {
    return { ok: false, message: 'Amount must be greater than zero.' };
  }

  const { data, error } = await supabase.rpc('record_funding_commitment' as never, {
    p_legal_name: legalName,
    p_funder_type: input.funderType,
    p_lane: input.lane,
    p_amount_original: input.amountOriginal,
    p_currency: input.currency?.trim() || 'USD',
    p_amount_usd: input.amountUsd ?? null,
    p_public_display_name: input.publicDisplayName?.trim() || null,
    p_country: input.country?.trim() || null,
    p_email: input.email?.trim() || null,
    p_payment_method: input.paymentMethod || null,
    p_status: input.status || 'pledged',
    p_restrictions: input.restrictions?.trim() || null,
    p_restriction_code: input.restrictionCode?.trim() || null,
    p_agreement_id: input.agreementId?.trim() || null,
    p_receipt_id: input.receiptId?.trim() || null,
    p_date_pledged: input.datePledged || null,
    p_date_received: input.dateReceived || null,
    p_bank_reference: input.bankReference?.trim() || null,
    p_transaction_hash: input.transactionHash?.trim() || null,
    p_kyc_status: input.kycStatus || 'not_started',
    p_accredited_investor_status: input.accreditedInvestorStatus || 'unknown',
    p_sanctions_status: input.sanctionsStatus || 'not_screened',
    p_tax_profile_status: input.taxProfileStatus || 'unknown',
    p_debit_account: input.debitAccount?.trim() || 'treasury_clearing',
    p_notes: input.notes?.trim() || null,
    p_existing_funder_id: input.existingFunderId || null,
    p_interest_inquiry_id: input.interestInquiryId || null,
    p_round_id: input.roundId?.trim() || null,
    p_legal_instrument_id: input.legalInstrumentId?.trim() || null,
  } as never);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as RecordFundingCommitmentResult };
}

export function fundingCommitmentsToCsv(rows: FundingCommitmentRow[]): string {
  const headers = [
    'id',
    'lane',
    'status',
    'legal_name',
    'funder_type',
    'amount_original',
    'currency',
    'amount_usd',
    'payment_method',
    'restriction_code',
    'restrictions',
    'agreement_id',
    'receipt_id',
    'date_pledged',
    'date_received',
    'created_at',
  ];

  const escape = (value: string) => (/[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.lane,
        row.status,
        row.funders?.legal_name ?? '',
        row.funders?.funder_type ?? '',
        String(row.amount_original),
        row.currency,
        row.amount_usd == null ? '' : String(row.amount_usd),
        row.payment_method ?? '',
        row.restriction_code ?? '',
        row.restrictions ?? '',
        row.agreement_id ?? '',
        row.receipt_id ?? '',
        row.date_pledged ?? '',
        row.date_received ?? '',
        row.created_at,
      ]
        .map((cell) => escape(cell))
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}
