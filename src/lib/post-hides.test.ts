// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { filterHiddenFeedItems } from './post-hides';
import type { HomeFeedItem, PostPreview } from './post-reposts';

const post = (id: string, authorId: string) => ({ id, author_id: authorId, content: 'x', created_at: '2026-10-06T00:00:00Z' }) as PostPreview;

const original = (id: string, authorId: string): HomeFeedItem => ({
  kind: 'original',
  key: `post:${id}`,
  sortAt: '2026-10-06T00:00:00Z',
  interactionPostId: id,
  repostTargetPostId: id,
  post: post(id, authorId),
  embeddedOriginal: null,
  repost: null,
});

describe('filterHiddenFeedItems', () => {
  const items = [original('p1', 'a'), original('p2', 'b'), original('p3', 'c')];

  it('returns the same list when nothing is hidden', () => {
    expect(filterHiddenFeedItems(items, { hiddenPostIds: new Set(), blockedProfileIds: new Set() })).toBe(items);
  });

  it('drops hidden posts and posts by blocked people', () => {
    const result = filterHiddenFeedItems(items, { hiddenPostIds: new Set(['p1']), blockedProfileIds: new Set(['c']) });
    expect(result.map((item) => item.post.id)).toEqual(['p2']);
  });

  it('drops reposts made by a blocked person', () => {
    const repost: HomeFeedItem = {
      kind: 'plain_repost',
      key: 'repost:r1',
      sortAt: '2026-10-06T00:00:00Z',
      interactionPostId: 'p2',
      repostTargetPostId: 'p2',
      post: post('p2', 'b'),
      embeddedOriginal: post('p2', 'b'),
      repost: { id: 'r1', original_post_id: 'p2', reposter_profile_id: 'c', commentary_post_id: null, created_at: '2026-10-06T00:00:00Z' },
    };
    expect(filterHiddenFeedItems([repost], { hiddenPostIds: new Set(), blockedProfileIds: new Set(['c']) })).toEqual([]);
  });
});
