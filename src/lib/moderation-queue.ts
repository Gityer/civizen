import { supabaseUntyped } from '@/integrations/supabase/untyped';

/** Reports as reviewers see them. Reading and updating rely on RLS (report.review). */

export const REPORT_STATUSES = ['pending', 'reviewed', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ModerationFilter = 'open' | 'closed';
export type ReportSource = 'post' | 'profile' | 'message' | 'other';

export type ModerationReport = {
  id: string;
  status: ReportStatus;
  reason: string;
  category: string | null;
  source: ReportSource;
  excerpt: string | null;
  postId: string | null;
  conversationId: string | null;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporterName: string | null;
  reportedName: string | null;
  reportedUsername: string | null;
};

export const MODERATION_PAGE_SIZE = 100;

type PersonPreview = { full_name?: unknown; username?: unknown } | null;

function nameOf(person: PersonPreview): string | null {
  if (!person) return null;
  if (typeof person.full_name === 'string' && person.full_name.trim()) return person.full_name;
  return typeof person.username === 'string' && person.username ? `@${person.username}` : null;
}

function firstPerson(value: unknown): PersonPreview {
  const person = Array.isArray(value) ? value[0] : value;
  return person && typeof person === 'object' ? (person as PersonPreview) : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function sourceOf(context: Record<string, unknown>): ReportSource {
  if (context.source === 'post') return 'post';
  if (context.source === 'profile') return 'profile';
  if (context.source === 'private_message' || context.source === 'private_contact') return 'message';
  return 'other';
}

export function toModerationReport(row: Record<string, unknown>): ModerationReport {
  const context = row.report_context && typeof row.report_context === 'object'
    ? (row.report_context as Record<string, unknown>)
    : {};
  const status = REPORT_STATUSES.find((value) => value === row.status) ?? 'pending';
  const reported = firstPerson(row.reported);
  return {
    id: String(row.id),
    status,
    reason: typeof row.reason === 'string' ? row.reason : '',
    category: text(context.category),
    source: sourceOf(context),
    excerpt: text(context.post_excerpt) ?? text(context.message_excerpt),
    postId: text(context.post_id),
    conversationId: text(context.conversation_id),
    adminNotes: text(row.admin_notes),
    createdAt: String(row.created_at),
    resolvedAt: text(row.resolved_at),
    reporterName: nameOf(firstPerson(row.reporter)),
    reportedName: nameOf(reported),
    reportedUsername: reported && typeof reported.username === 'string' ? reported.username : null,
  };
}

export function isOpenReport(status: ReportStatus) {
  return status === 'pending' || status === 'reviewed';
}

export async function fetchModerationReports(filter: ModerationFilter) {
  const statuses: ReportStatus[] = filter === 'open' ? ['pending', 'reviewed'] : ['resolved', 'dismissed'];
  const { data, error } = await supabaseUntyped
    .from('reports')
    .select(
      'id, reason, status, admin_notes, report_context, created_at, resolved_at, '
        + 'reporter:profiles!reports_reporter_id_fkey(full_name, username), '
        + 'reported:profiles!reports_reported_user_id_fkey(full_name, username)',
    )
    .in('status', statuses)
    .order('created_at', { ascending: filter === 'open' })
    .limit(MODERATION_PAGE_SIZE);
  const rows = Array.isArray(data) ? (data as unknown as Record<string, unknown>[]) : [];
  return { data: rows.map(toModerationReport), error };
}

export async function setReportStatus(reportId: string, status: ReportStatus, adminNotes: string | null) {
  const { error } = await supabaseUntyped
    .from('reports')
    .update({ status, admin_notes: adminNotes?.trim() || null })
    .eq('id', reportId);
  return { error };
}

export async function removeReportedPost(reportId: string, note: string | null) {
  const { error } = await supabaseUntyped.rpc('moderation_remove_reported_post', {
    p_report_id: reportId,
    p_note: note?.trim() || null,
  });
  return { error };
}
