import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { countByStatus, isReviewStatus } from './market-job-admin';

describe('market job admin helpers', () => {
  it('counts postings by review status and ignores unknown statuses', () => {
    expect(countByStatus([{ status: 'new' }, { status: 'new' }, { status: 'spam' }, { status: 'weird' }])).toEqual({ new: 2, reviewing: 0, contacted: 0, closed: 0, spam: 1 });
    expect(isReviewStatus('contacted')).toBe(true);
    expect(isReviewStatus('weird')).toBe(false);
  });
});
