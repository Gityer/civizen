import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/integrations/supabase/untyped', () => ({ supabaseUntyped: {} }));

import { buildReportContext, excerptForReport, isReportReasonLongEnough, type ReportTarget } from '@/lib/user-reports';

const postTarget: ReportTarget = {
  kind: 'post',
  profileId: 'author-1',
  displayName: 'Ana',
  postId: 'post-1',
  excerpt: 'Hello there',
};

describe('user reports', () => {
  it('requires a short description', () => {
    expect(isReportReasonLongEnough('   spam ')).toBe(false);
    expect(isReportReasonLongEnough('posting spam links')).toBe(true);
  });

  it('flattens and trims long post excerpts', () => {
    expect(excerptForReport('a\n\n  b')).toBe('a b');
    const long = excerptForReport('x'.repeat(500));
    expect(long).toHaveLength(300);
    expect(long.endsWith('…')).toBe(true);
  });

  it('records the post for post reports and only the category for people', () => {
    expect(buildReportContext(postTarget, 'spam')).toEqual({
      source: 'post',
      category: 'spam',
      post_id: 'post-1',
      post_excerpt: 'Hello there',
    });
    expect(buildReportContext({ ...postTarget, kind: 'user', postId: null, excerpt: null }, 'hate')).toEqual({
      source: 'profile',
      category: 'hate',
    });
  });
});
