import { supabase } from '@/integrations/supabase/client';
import { supabaseUntyped } from '@/integrations/supabase/untyped';
import { postHtmlToPlainText } from '@/lib/posts-html';

export const REPORT_CATEGORIES = ['harassment', 'spam', 'impersonation', 'hate', 'other'] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export type ReportTargetKind = 'user' | 'post';

/** The person a report is about, plus the post when a post is reported. */
export type ReportTarget = {
  kind: ReportTargetKind;
  profileId: string;
  displayName: string | null;
  postId: string | null;
  excerpt: string | null;
};

/** Same minimum as the chat report dialog, so reviewers always get a usable description. */
export const MIN_REPORT_REASON_LENGTH = 6;
const EXCERPT_LENGTH = 300;

export function isReportReasonLongEnough(reason: string) {
  return reason.trim().length >= MIN_REPORT_REASON_LENGTH;
}

export function excerptForReport(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH - 1)}…` : flat;
}

type AuthorPreview = { id: string; full_name: string | null; username: string | null };

function displayNameOf(author: AuthorPreview | null | undefined): string | null {
  if (!author) return null;
  return author.full_name || (author.username ? `@${author.username}` : null);
}

export async function loadReportTarget(kind: ReportTargetKind, targetId: string): Promise<ReportTarget | null> {
  if (kind === 'post') {
    const { data } = await supabaseUntyped
      .from('posts')
      .select('id, content, author_id, author:profiles!posts_author_id_fkey(id, full_name, username)')
      .eq('id', targetId)
      .maybeSingle();
    if (!data) return null;
    const row = data as unknown as {
      id: string;
      content: string;
      author_id: string;
      author: AuthorPreview | AuthorPreview[] | null;
    };
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    return {
      kind,
      profileId: row.author_id,
      displayName: displayNameOf(author),
      postId: row.id,
      excerpt: excerptForReport(postHtmlToPlainText(row.content)),
    };
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username')
    .eq('id', targetId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data) return null;
  return { kind, profileId: data.id, displayName: displayNameOf(data), postId: null, excerpt: null };
}

export function buildReportContext(target: ReportTarget, category: ReportCategory): Record<string, unknown> {
  return target.kind === 'post'
    ? { source: 'post', category, post_id: target.postId, post_excerpt: target.excerpt }
    : { source: 'profile', category };
}

/** Files a report. RLS checks the reporter is the caller and holds report.create. */
export async function submitContentReport(input: {
  reporterProfileId: string;
  target: ReportTarget;
  category: ReportCategory;
  reason: string;
}) {
  const { error } = await supabaseUntyped.from('reports').insert({
    reporter_id: input.reporterProfileId,
    reported_user_id: input.target.profileId,
    reason: input.reason.trim(),
    status: 'pending',
    report_context: buildReportContext(input.target, input.category),
  });
  return { error };
}
