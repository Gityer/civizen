import { supabase } from '@/integrations/supabase/client';

export type PostViewStats = {
  uniqueVisitors: number;
  totalViews: number;
};

type PostViewRow = {
  post_id: string;
  viewer_id: string;
  view_count: number | null;
};

type RecordPostViewRow = {
  unique_visitors: number | string | null;
  total_views: number | string | null;
};

const emptyStats = (): PostViewStats => ({ uniqueVisitors: 0, totalViews: 0 });

const toCount = (value: number | string | null | undefined): number => {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) && (n as number) > 0 ? Math.floor(n as number) : 0;
};

export const isRecordablePostId = (postId: string): boolean => {
  return Boolean(postId) && !postId.startsWith('local-');
};

export function aggregatePostViewStats(rows: PostViewRow[] | null | undefined): Record<string, PostViewStats> {
  const next: Record<string, PostViewStats> = {};
  (rows || []).forEach((row) => {
    if (!row?.post_id) return;
    const current = next[row.post_id] || emptyStats();
    current.uniqueVisitors += 1;
    current.totalViews += Math.max(1, toCount(row.view_count) || 1);
    next[row.post_id] = current;
  });
  return next;
}

export async function fetchPostViewStats(postIds: string[]): Promise<Record<string, PostViewStats>> {
  const ids = postIds.filter(isRecordablePostId);
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from('post_views')
    .select('post_id, viewer_id, view_count')
    .in('post_id', ids);

  if (error) {
    throw error;
  }

  return aggregatePostViewStats(data as PostViewRow[] | null);
}

export async function recordPostView(postId: string): Promise<PostViewStats | null> {
  if (!isRecordablePostId(postId)) return null;

  const { data, error } = await supabase.rpc('record_post_view', {
    p_post_id: postId,
  });

  if (error) {
    throw error;
  }

  const row = (Array.isArray(data) ? data[0] : data) as RecordPostViewRow | null | undefined;
  if (!row) return emptyStats();

  return {
    uniqueVisitors: toCount(row.unique_visitors),
    totalViews: toCount(row.total_views),
  };
}
