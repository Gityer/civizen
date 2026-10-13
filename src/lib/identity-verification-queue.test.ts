import { describe, expect, it } from 'vitest';

import {
  filterIdentityReviewQueue,
  isIdentityReviewOverdue,
  readLastIdentityDecision,
  type IdentityReviewQueueItem,
} from './identity-verification-queue';

const item = (caseId: string, ageHours: number, assignedTo: string | null): IdentityReviewQueueItem => ({
  caseId, profileId: `p-${caseId}`, username: null, fullName: null, country: null, status: 'submitted', submittedAt: null,
  ageHours, assignedTo, assignedUsername: null, infoRequestCount: 0, resubmission: false, noteCount: 0, artifacts: [],
});

describe('identity review queue', () => {
  const queue = [item('a', 2, null), item('b', 50, 'me'), item('c', 49, 'other')];

  it('marks cases over the 48-hour target', () => {
    expect(isIdentityReviewOverdue(47.9)).toBe(false);
    expect(isIdentityReviewOverdue(48)).toBe(true);
  });

  it('filters by assignment and age', () => {
    expect(filterIdentityReviewQueue(queue, 'all', 'me').map((x) => x.caseId)).toEqual(['a', 'b', 'c']);
    expect(filterIdentityReviewQueue(queue, 'unassigned', 'me').map((x) => x.caseId)).toEqual(['a']);
    expect(filterIdentityReviewQueue(queue, 'mine', 'me').map((x) => x.caseId)).toEqual(['b']);
    expect(filterIdentityReviewQueue(queue, 'mine', null)).toEqual([]);
    expect(filterIdentityReviewQueue(queue, 'overdue', 'me').map((x) => x.caseId)).toEqual(['b', 'c']);
  });

  it('reads what the member was last told', () => {
    expect(readLastIdentityDecision({ last_decision: { kind: 'info_requested', reason_code: 'document_unreadable', message: 'Retake' } }))
      .toEqual({ kind: 'info_requested', reasonCode: 'document_unreadable', message: 'Retake' });
    expect(readLastIdentityDecision({})).toBeNull();
    expect(readLastIdentityDecision({ last_decision: { kind: 'forged' } })).toBeNull();
    expect(readLastIdentityDecision(null)).toBeNull();
  });
});
