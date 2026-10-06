// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/untyped', () => ({ supabaseUntyped: {} }));

import { excerptAroundMatch, toSearchPostHit } from '@/lib/search-posts';

describe('search posts', () => {
  it('keeps short posts whole', () => {
    expect(excerptAroundMatch('Garden  opening\nSaturday', 'garden')).toBe('Garden opening Saturday');
  });

  it('centres long posts on the match', () => {
    const text = `${'a '.repeat(200)}community garden ${'b '.repeat(200)}`;
    const excerpt = excerptAroundMatch(text, 'garden', 60);
    expect(excerpt).toContain('garden');
    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('maps rows and falls back to the username', () => {
    const hit = toSearchPostHit(
      {
        id: 'p1',
        content: '<p>Hello garden</p>',
        created_at: '2026-10-06T00:00:00Z',
        author_id: 'a1',
        author_full_name: null,
        author_username: 'ana',
        author_avatar_url: null,
      },
      'garden',
    );
    expect(hit).toMatchObject({ id: 'p1', excerpt: 'Hello garden', authorName: '@ana' });
  });
});
