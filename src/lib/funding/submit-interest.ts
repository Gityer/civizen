import { supabase } from '@/integrations/supabase/client';
import type { FundingInterestPayload } from '@/lib/funding/types';

type InsertResult = { ok: true; message?: undefined } | { ok: false; message: string };

export async function submitFundingInterest(payload: FundingInterestPayload): Promise<InsertResult> {
  const fullName = payload.fullName.trim();
  const email = payload.email.trim();

  if (!fullName || !email) {
    return { ok: false, message: 'Name and email are required.' };
  }

  if (payload.lane === 'investor' && !payload.acceptRiskDisclosure) {
    return { ok: false, message: 'Please confirm you have read the risk disclosure.' };
  }

  const { error } = await supabase.from('funding_interest_inquiries' as never).insert({
    lane: payload.lane,
    full_name: fullName,
    email,
    organization: payload.organization?.trim() || null,
    country: payload.country?.trim() || null,
    indicated_amount_usd: payload.indicatedAmountUsd ?? null,
    currency: payload.currency?.trim() || 'USD',
    message: payload.message?.trim() || null,
    accredited_investor_interest: payload.accreditedInvestorInterest ?? null,
    accept_risk_disclosure: Boolean(payload.acceptRiskDisclosure),
    user_id: payload.userId ?? null,
  } as never);

  if (error) {
    return { ok: false, message: error.message || 'Could not submit your interest.' };
  }

  return { ok: true };
}
