import { supabaseUntyped } from '@/integrations/supabase/untyped';

export const REPORT_CATEGORIES = ['harassment', 'spam', 'impersonation', 'hate', 'other'] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

/** Same minimum as the chat report dialog, so reviewers always get a usable description. */
export const MIN_REPORT_REASON_LENGTH = 6;

export function isReportReasonLongEnough(reason: string) {
  return reason.trim().length >= MIN_REPORT_REASON_LENGTH;
}

/** Files a report about a person from their profile page. RLS checks the reporter is the caller. */
export async function submitProfileReport(input: {
  reporterProfileId: string;
  reportedProfileId: string;
  category: ReportCategory;
  reason: string;
}) {
  const { error } = await supabaseUntyped.from('reports').insert({
    reporter_id: input.reporterProfileId,
    reported_user_id: input.reportedProfileId,
    reason: input.reason.trim(),
    status: 'pending',
    report_context: { source: 'profile', category: input.category },
  });
  return { error };
}
