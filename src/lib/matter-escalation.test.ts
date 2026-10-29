import { describe, expect, it } from 'vitest';
import type { MatterActionRequirement } from '@/lib/matters';
import { overdueActionForInitiator } from './matter-escalation';

const action = (extra: Partial<MatterActionRequirement>): MatterActionRequirement => ({
  id: 'a', matterId: 'm', actionType: 'respond', assignedActor: { kind: 'person', profileId: 'other' }, createdAt: '2026-10-01T00:00:00Z',
  dueAt: '2026-10-05T00:00:00Z', reminderAt: '2026-10-04T00:00:00Z', timingPolicyId: 'x', status: 'pending', completedAt: null,
  completedBy: null, completionAction: null, timeoutAction: 'remind', escalationPolicyId: null, contextKind: 'matter', contextId: null,
  ...extra,
} as MatterActionRequirement);

describe('overdueActionForInitiator', () => {
  const now = Date.parse('2026-10-29T00:00:00Z');
  it('finds an overdue action someone else owes the initiator', () => {
    expect(overdueActionForInitiator([action({})], 'me', [], now)?.id).toBe('a');
    expect(overdueActionForInitiator([action({ status: 'overdue' })], 'me', [], now)).not.toBeNull();
  });
  it('ignores actions not yet due, done, or owed by the initiator or an organisation they manage', () => {
    expect(overdueActionForInitiator([action({ dueAt: '2026-11-05T00:00:00Z' })], 'me', [], now)).toBeNull();
    expect(overdueActionForInitiator([action({ status: 'completed' })], 'me', [], now)).toBeNull();
    expect(overdueActionForInitiator([action({ assignedActor: { kind: 'person', profileId: 'me' } })], 'me', [], now)).toBeNull();
    expect(overdueActionForInitiator([action({ assignedActor: { kind: 'organization', profileId: 'org' } })], 'me', ['org'], now)).toBeNull();
  });
});
