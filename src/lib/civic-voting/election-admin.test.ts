import { describe, expect, it } from 'vitest';

import { availableElectionAdminActions, electionAdminErrorKey, type ElectionAdminItem } from './election-admin';

const base: ElectionAdminItem = {
  electionId: 'e', title: 'T', status: 'open', opensAt: null, closesAt: null, proposalId: null, countableBallots: 0,
  certificationRequestedBy: null, certificationRequestedAt: null, certificationRequestedByMe: false, cancelReason: null,
};
const now = Date.parse('2026-10-13T00:00:00Z');

describe('availableElectionAdminActions', () => {
  it('lets a scheduled consultation be rescheduled, extended or cancelled', () => {
    expect(availableElectionAdminActions({ ...base, status: 'scheduled' }, now)).toEqual(['reschedule', 'extend', 'cancel']);
  });

  it('lets an open consultation be extended or cancelled until it closes', () => {
    expect(availableElectionAdminActions({ ...base, closesAt: '2026-10-14T00:00:00Z' }, now)).toEqual(['extend', 'cancel']);
    expect(availableElectionAdminActions({ ...base, closesAt: '2026-10-12T00:00:00Z' }, now)).toEqual([]);
  });

  it('needs two different people to certify a closed result', () => {
    expect(availableElectionAdminActions({ ...base, status: 'closed' }, now)).toEqual(['requestCertification']);
    const requested = { ...base, status: 'closed' as const, certificationRequestedAt: '2026-10-12T00:00:00Z' };
    expect(availableElectionAdminActions({ ...requested, certificationRequestedByMe: true }, now)).toEqual([]);
    expect(availableElectionAdminActions(requested, now)).toEqual(['certify']);
  });

  it('offers nothing for certified or cancelled consultations', () => {
    expect(availableElectionAdminActions({ ...base, status: 'certified' }, now)).toEqual([]);
    expect(availableElectionAdminActions({ ...base, status: 'cancelled' }, now)).toEqual([]);
  });
});

describe('electionAdminErrorKey', () => {
  it('maps server codes to messages', () => {
    expect(electionAdminErrorKey('second_person_required')).toBe('electionAdmin.errors.second_person_required');
    expect(electionAdminErrorKey('boom')).toBe('electionAdmin.errors.generic');
  });
});
