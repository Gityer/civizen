import { describe, expect, it } from 'vitest';

import { resolveVotingWindow, toConsultationReasonCode } from './voting-window';

const base = { votingOpensAt: '2026-01-01T00:00:00Z', votingClosesAt: '2026-12-31T00:00:00Z' };

describe('resolveVotingWindow', () => {
  it('is open only while the status is open and now is inside the window', () => {
    expect(resolveVotingWindow({ ...base, status: 'open' }, new Date('2026-06-01T00:00:00Z')).state).toBe('open');
  });

  it('treats an open election whose window has passed as closed even before the close tick', () => {
    expect(resolveVotingWindow({ ...base, status: 'open' }, new Date('2027-01-05T00:00:00Z')).state).toBe('closed');
  });

  it('is scheduled before the window opens', () => {
    expect(resolveVotingWindow({ ...base, status: 'open' }, new Date('2025-12-01T00:00:00Z')).state).toBe('scheduled');
    expect(resolveVotingWindow({ ...base, status: 'scheduled' }, new Date('2026-06-01T00:00:00Z')).state).toBe('scheduled');
  });

  it('respects closed, certified and cancelled statuses', () => {
    for (const status of ['closed', 'certified', 'cancelled'] as const) {
      expect(resolveVotingWindow({ ...base, status }, new Date('2026-06-01T00:00:00Z')).state).toBe('closed');
    }
  });
});

describe('toConsultationReasonCode', () => {
  it('maps known RPC error codes and ignores everything else', () => {
    expect(toConsultationReasonCode(new Error('voter_blocked'))).toBe('voter_blocked');
    expect(toConsultationReasonCode('under_age')).toBe('under_age');
    expect(toConsultationReasonCode(new Error('network timeout'))).toBeNull();
    expect(toConsultationReasonCode(undefined)).toBeNull();
  });
});
