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

/** Posts matching the query (two characters or more), debounced like the directory search. */
export function useSearchPosts(query: string, enabled: boolean): SearchPostHit[] {
  const [hits, setHits] = useState<SearchPostHit[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || trimmed.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data, error } = await supabaseUntyped.rpc('search_posts', { p_query: trimmed, p_limit: 20 });
      if (cancelled) return;
      const rows = !error && Array.isArray(data) ? (data as SearchPostRow[]) : [];
      setHits(rows.map((row) => toSearchPostHit(row, trimmed)));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, enabled]);

  return hits;
}
