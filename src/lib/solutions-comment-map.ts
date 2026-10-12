import type { SolutionComment } from './solutions-api';

const text = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

/** Maps a `solution_comments` row (with its author join) to the client shape, including the moderation marker. */
export function mapComment(row: Record<string, unknown>): SolutionComment {
  const author = (row.author ?? row.profiles) as Record<string, unknown> | null | undefined;
  return {
    id: text(row.id),
    problemId: text(row.problem_id),
    authorId: text(row.author_id),
    body: text(row.body),
    createdAt: text(row.created_at),
    authorName: author ? text(author.full_name || author.username, '') || null : null,
    moderationHiddenAt: text(row.moderation_hidden_at) || null,
    moderationReason: text(row.moderation_reason) || null,
  };
}
