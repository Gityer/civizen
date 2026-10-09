import { supabase } from '@/integrations/supabase/client';

export type MarketJobOwnPatch = {
  pay_amount?: string | null;
  pay_period?: string | null;
  city?: string | null;
  notes?: string | null;
};

function rpcMessage(message: string): string {
  return message.replace(/^.*ERROR:\s*/i, '').split('CONTEXT:')[0].trim();
}

/** The poster closes their own posting; it leaves the public board at once (Phase 6 step 6.2). */
export async function withdrawMarketJobInterest(id: string): Promise<void> {
  const { error } = await supabase.rpc('withdraw_market_job_interest', { p_id: id });
  if (error) throw new Error(rpcMessage(error.message));
}

/** The poster edits pay, city or notes on their own open posting. */
export async function updateMarketJobInterest(id: string, patch: MarketJobOwnPatch): Promise<void> {
  const payload: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) payload[key] = value;
  }
  const { error } = await supabase.rpc('update_market_job_interest', { p_id: id, payload });
  if (error) throw new Error(rpcMessage(error.message));
}
