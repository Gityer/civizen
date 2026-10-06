import { supabase } from '@/integrations/supabase/client';
import { assertNoInternalFieldsInPublic } from '@/lib/finance/budget-rules';

type Result<T> = { ok: true; data: T; message?: undefined } | { ok: false; message: string };

export type PublicProjectFinanceSummary = {
  published: boolean;
  last_published_at: string | null;
  published_version: number | null;
  is_demonstration: boolean;
  budget: {
    name: string;
    purpose: string | null;
    currency: string;
    version: number;
    period_start: string | null;
    period_end: string | null;
    published_at: string | null;
    is_demonstration?: boolean;
    groups: Array<{
      name: string;
      description: string | null;
      display_order: number;
      planned_minor: number;
      committed_minor: number;
      actual_minor: number;
      line_items: Array<{
        title: string;
        public_description: string | null;
        planned_minor: number;
        committed_minor: number;
        actual_minor: number;
        currency: string;
      }>;
    }>;
  } | null;
  funding: {
    received_by_currency: Record<string, number>;
    published_sources: Array<{
      display_name: string;
      category: string;
      requested_minor: number | null;
      currency: string;
    }>;
  } | null;
};

/**
 * Public service boundary: SECURITY DEFINER RPC returns allowlisted fields only.
 * Client also asserts no internal field names slipped into the payload.
 */
export async function getPublicProjectFinanceSummary(): Promise<Result<PublicProjectFinanceSummary>> {
  const { data, error } = await supabase.rpc('get_public_project_finance_summary' as never);
  if (error) return { ok: false, message: error.message };
  const payload = (data ?? {
    published: false,
    budget: null,
    funding: null,
    last_published_at: null,
    published_version: null,
    is_demonstration: false,
  }) as PublicProjectFinanceSummary;
  try {
    assertNoInternalFieldsInPublic(payload);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'public payload validation failed' };
  }
  return { ok: true, data: payload };
}
