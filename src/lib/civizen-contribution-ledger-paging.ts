import { supabase } from '@/integrations/supabase/client';
import type { SupabaseDbClient } from '@/integrations/supabase/client-type';

type DbClient = SupabaseDbClient;

/**
 * PostgREST silently caps a single response (default 1000 rows). Score inputs must
 * page the ledger or older verified roots (e.g. opportunity_participations) drop out
 * and Home categories change without a real activity change.
 */
export const CONTRIBUTION_LEDGER_PAGE_SIZE = 1000;

type LedgerSelectBuilder = {
  select: (columns: string) => LedgerSelectBuilder;
  eq: (column: string, value: string) => LedgerSelectBuilder;
  order: (column: string, options: { ascending: boolean }) => LedgerSelectBuilder;
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: Record<string, unknown>[] | null; error: { message?: string } | null }>;
};

/** Fetch every ledger row for a profile, paging past the PostgREST max-rows cap. */
export async function fetchAllContributionEventRows(
  profileId: string,
  client: DbClient = supabase,
  pageSize: number = CONTRIBUTION_LEDGER_PAGE_SIZE,
): Promise<Record<string, unknown>[]> {
  const size = Math.max(1, pageSize);
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += size) {
    const query = client
      .from('profile_contribution_events')
      .select('*')
      .eq('profile_id', profileId)
      .order('occurred_at', { ascending: false }) as unknown as LedgerSelectBuilder;
    const { data, error } = await query.range(from, from + size - 1);
    if (error) {
      console.error('fetchAllContributionEventRows failed', error);
      return rows;
    }
    const batch = (data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < size) break;
  }
  return rows;
}
