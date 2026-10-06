import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/untyped', () => ({ supabaseUntyped: {} }));

import { isOpenReport, toModerationReport } from './moderation-queue';

describe('toModerationReport', () => {
  it('reads post reports with their excerpt and people', () => {
    const report = toModerationReport({
      id: 'r1',
      status: 'pending',
      reason: 'Spam link',
      report_context: { source: 'post', category: 'spam', post_id: 'p1', post_excerpt: 'Buy now' },
      created_at: '2026-10-06T00:00:00Z',
      resolved_at: null,
      admin_notes: null,
      reporter: { full_name: 'Ana', username: 'ana' },
      reported: [{ full_name: '', username: 'spammer' }],
    });
    expect(report).toMatchObject({
      source: 'post',
      category: 'spam',
      postId: 'p1',
      excerpt: 'Buy now',
      reporterName: 'Ana',
      reportedName: '@spammer',
      reportedUsername: 'spammer',
    });
  });

  it('treats chat reports as messages and unknown statuses as pending', () => {
    const report = toModerationReport({
      id: 'r2',
      status: 'weird',
      reason: 'x',
      report_context: { source: 'private_message', message_excerpt: 'hi', conversation_id: 'c1' },
      created_at: '2026-10-06T00:00:00Z',
    });
    expect(report.source).toBe('message');
    expect(report.status).toBe('pending');
    expect(report.excerpt).toBe('hi');
    expect(report.conversationId).toBe('c1');
    expect(report.reporterName).toBeNull();
  });
});

describe('isOpenReport', () => {
  it('keeps pending and reviewed in the queue', () => {
    expect(isOpenReport('pending')).toBe(true);
    expect(isOpenReport('reviewed')).toBe(true);
    expect(isOpenReport('dismissed')).toBe(false);
  });
});
