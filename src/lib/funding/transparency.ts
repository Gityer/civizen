import { supabase } from '@/integrations/supabase/client';
import type {
  FundingInterestLane,
  FundingInterestRow,
  LedgerFundingLane,
  RecordFundingCommitmentResult,
} from '@/lib/funding/types';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type ConvertInterestInput = {
  inquiryId: string;
  amountOriginal?: number | null;
  currency?: string;
  amountUsd?: number | null;
  status?: 'pledged' | 'received' | 'partially_received';
  restrictionCode?: string;
  restrictions?: string;
};

export type ConvertInterestResult = RecordFundingCommitmentResult & {
  inquiry_id: string;
  ledger_lane: LedgerFundingLane;
};

export function mapInterestLaneToLedgerLane(lane: FundingInterestLane): LedgerFundingLane {
  switch (lane) {
    case 'investor':
      return 'investor';
    case 'donation':
      return 'donation';
    case 'institutional':
      return 'grant';
    case 'sponsorship':
      return 'sponsorship';
    case 'contributor':
    case 'other':
    default:
      return 'other';
  }
}

export async function convertFundingInterestToCommitment(
  input: ConvertInterestInput,
): Promise<Result<ConvertInterestResult>> {
  const { data, error } = await supabase.rpc('convert_funding_interest_to_commitment' as never, {
    p_inquiry_id: input.inquiryId,
    p_amount_original: input.amountOriginal ?? null,
    p_currency: input.currency ?? null,
    p_amount_usd: input.amountUsd ?? null,
    p_status: input.status ?? 'pledged',
    p_restriction_code: input.restrictionCode ?? null,
    p_restrictions: input.restrictions ?? null,
  } as never);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as ConvertInterestResult };
}

export type FundingTransparencyPublishRow = {
  id: number;
  is_published: boolean;
  published_at: string | null;
  unpublished_at: string | null;
  published_by: string | null;
  note: string | null;
  updated_at: string;
};

export type PublicFundingTransparency = {
  published: boolean;
  published_at: string | null;
  basis?: string;
  lanes: {
    investor?: number;
    donation?: number;
    grants?: number;
    commercial?: number;
    sponsorship?: number;
    other?: number;
    founderReserveEstimate?: number;
  };
};

export async function getFundingTransparencyPublish(): Promise<Result<FundingTransparencyPublishRow>> {
  const { data, error } = await supabase
    .from('funding_transparency_publish' as never)
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: 'Transparency publish settings not found.' };
  return { ok: true, data: data as FundingTransparencyPublishRow };
}

export async function setFundingTransparencyPublished(
  isPublished: boolean,
  note?: string,
): Promise<Result<FundingTransparencyPublishRow>> {
  const { data, error } = await supabase.rpc('set_funding_transparency_published' as never, {
    p_is_published: isPublished,
    p_note: note ?? null,
  } as never);

  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as FundingTransparencyPublishRow };
}

export async function getPublicFundingTransparency(): Promise<Result<PublicFundingTransparency>> {
  const { data, error } = await supabase.rpc('get_public_funding_transparency' as never);
  if (error) return { ok: false, message: error.message };
  return { ok: true, data: data as PublicFundingTransparency };
}

export function interestNeedsAmount(row: FundingInterestRow): boolean {
  return row.indicated_amount_usd == null || Number(row.indicated_amount_usd) <= 0;
}
