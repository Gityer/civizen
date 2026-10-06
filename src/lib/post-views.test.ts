// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { aggregatePostViewStats, isRecordablePostId } from '@/lib/post-views';

describe('post-views helpers', () => {
  it('rejects local-only post ids', () => {
    expect(isRecordablePostId('local-123')).toBe(false);
    expect(isRecordablePostId('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });

  it('aggregates unique visitors and total views', () => {
    const stats = aggregatePostViewStats([
      { post_id: 'p1', viewer_id: 'u1', view_count: 2 },
      { post_id: 'p1', viewer_id: 'u2', view_count: 1 },
      { post_id: 'p2', viewer_id: 'u1', view_count: 5 },
    ]);

    expect(stats.p1).toEqual({ uniqueVisitors: 2, totalViews: 3 });
    expect(stats.p2).toEqual({ uniqueVisitors: 1, totalViews: 5 });
  });
});
