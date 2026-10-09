import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type MarketJobInterestRow = Database['public']['Tables']['market_job_interests']['Row'];
export type MarketJobReviewStatus = 'new' | 'reviewing' | 'contacted' | 'closed' | 'spam';
export const MARKET_JOB_REVIEW_STATUSES: MarketJobReviewStatus[] = ['new', 'reviewing', 'contacted', 'closed', 'spam'];

/** Postings for the review screen; RLS limits this to settings, role and market managers. */
export async function listMarketJobInterestsForReview(limit = 200): Promise<MarketJobInterestRow[]> {
  const { data, error } = await supabase
    .from('market_job_interests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as MarketJobInterestRow[];
}

export async function setMarketJobInterestStatus(id: string, status: MarketJobReviewStatus): Promise<void> {
  const { error } = await supabase.from('market_job_interests').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export function countByStatus(rows: Pick<MarketJobInterestRow, 'status'>[]): Record<MarketJobReviewStatus, number> {
  const counts: Record<MarketJobReviewStatus, number> = { new: 0, reviewing: 0, contacted: 0, closed: 0, spam: 0 };
  for (const row of rows) {
    const status = row.status as MarketJobReviewStatus;
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

export function isReviewStatus(value: string): value is MarketJobReviewStatus {
  return (MARKET_JOB_REVIEW_STATUSES as string[]).includes(value);
}
