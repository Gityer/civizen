import { useEffect, useState } from 'react';

import { supabaseUntyped } from '@/integrations/supabase/untyped';
import { postHtmlToPlainText } from '@/lib/posts-html';

export type SearchPostHit = {
  id: string;
  excerpt: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
};

const EXCERPT_LENGTH = 220;

type SearchPostRow = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_full_name: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
};

/** Plain-text excerpt centred on the first match, so the reader sees why the post matched. */
export function excerptAroundMatch(text: string, query: string, length = EXCERPT_LENGTH): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= length) return flat;
  const at = flat.toLowerCase().indexOf(query.trim().toLowerCase());
  const start = at < 0 ? 0 : Math.max(0, Math.min(at - Math.floor(length / 3), flat.length - length));
  const slice = flat.slice(start, start + length).trim();
  return `${start > 0 ? '…' : ''}${slice}${start + length < flat.length ? '…' : ''}`;
}

export function toSearchPostHit(row: SearchPostRow, query: string): SearchPostHit {
  return {
    id: row.id,
    excerpt: excerptAroundMatch(postHtmlToPlainText(row.content), query),
    createdAt: row.created_at,
    authorId: row.author_id,
    authorName: row.author_full_name || (row.author_username ? `@${row.author_username}` : ''),
    authorUsername: row.author_username,
    authorAvatarUrl: row.author_avatar_url,
  };
}

export type SearchCivicKind = 'proposal' | 'election' | 'problem' | 'matter';

export type SearchCivicHit = {
  kind: SearchCivicKind;
  id: string;
  title: string;
  summary: string;
  path: string;
};

export type SearchActivity = { posts: SearchPostHit[]; civicItems: SearchCivicHit[] };

const EMPTY_ACTIVITY: SearchActivity = { posts: [], civicItems: [] };

export function toSearchCivicHits(data: unknown): SearchCivicHit[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .filter((row) => ['proposal', 'election', 'problem', 'matter'].includes(String(row.kind)))
    .map((row) => ({
      kind: row.kind as SearchCivicKind,
      id: String(row.id),
      title: String(row.title ?? ''),
      summary: postHtmlToPlainText(String(row.summary ?? '')),
      path: String(row.path ?? '/'),
    }));
}

/**
 * Posts plus proposals, elections, problems and matters matching the query (two characters or
 * more), debounced like the directory search. Row-level security decides what each member sees.
 */
export function useSearchActivity(query: string, enabled: boolean): SearchActivity {
  const [activity, setActivity] = useState<SearchActivity>(EMPTY_ACTIVITY);

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < 2) {
      setActivity(EMPTY_ACTIVITY);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const [posts, civic] = await Promise.all([
        supabaseUntyped.rpc('search_posts', { p_query: trimmed, p_limit: 20 }),
        supabaseUntyped.rpc('search_civic_items', { p_query: trimmed, p_limit: 20 }),
      ]);
      if (cancelled) return;
      const postRows = !posts?.error && Array.isArray(posts?.data) ? (posts.data as SearchPostRow[]) : [];
      setActivity({
        posts: postRows.map((row) => toSearchPostHit(row, trimmed)),
        civicItems: civic?.error ? [] : toSearchCivicHits(civic?.data),
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return activity;
}
