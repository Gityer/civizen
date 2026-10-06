/**
 * Paper / assisted fallback — accessibility path with dual control (assistant + witness).
 */

export type AssistedBallotStatus =
  | 'draft'
  | 'awaiting_witness'
  | 'awaiting_steward'
  | 'accepted'
  | 'rejected'
  | 'voided';

export type AssistedBallotRoles = {
  voterProfileId: string;
  assistantProfileId: string;
  witnessProfileId: string | null;
  stewardProfileId?: string | null;
};

export type AssistedTransition =
  | { ok: true; nextStatus: AssistedBallotStatus; reason?: undefined }
  | { ok: false; reason: string };

export function assertDistinctAssistedRoles(roles: AssistedBallotRoles): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (roles.voterProfileId === roles.assistantProfileId) {
    return { ok: false, reason: 'assistant_same_as_voter' };
  }
  if (roles.witnessProfileId && roles.witnessProfileId === roles.voterProfileId) {
    return { ok: false, reason: 'witness_same_as_voter' };
  }
  if (roles.witnessProfileId && roles.witnessProfileId === roles.assistantProfileId) {
    return { ok: false, reason: 'witness_same_as_assistant' };
  }
  return { ok: true };
}

export function advanceAssistedBallot(input: {
  status: AssistedBallotStatus;
  action: 'assistant_confirm' | 'witness_confirm' | 'steward_accept' | 'steward_reject' | 'void';
  roles: AssistedBallotRoles;
  requireSteward?: boolean;
}): AssistedTransition {
  const distinct = assertDistinctAssistedRoles(input.roles);
  if (!distinct.ok) return { ok: false, reason: distinct.reason };

  const requireSteward = input.requireSteward !== false;

  switch (input.action) {
    case 'void':
      if (input.status === 'accepted') return { ok: false, reason: 'cannot_void_accepted' };
      return { ok: true, nextStatus: 'voided' };
    case 'assistant_confirm':
      if (input.status !== 'draft') return { ok: false, reason: 'invalid_status_for_assistant' };
      return { ok: true, nextStatus: 'awaiting_witness' };
    case 'witness_confirm':
      if (input.status !== 'awaiting_witness') return { ok: false, reason: 'invalid_status_for_witness' };
      if (!input.roles.witnessProfileId) return { ok: false, reason: 'witness_required' };
      return { ok: true, nextStatus: requireSteward ? 'awaiting_steward' : 'accepted' };
    case 'steward_accept':
      if (input.status !== 'awaiting_steward') return { ok: false, reason: 'invalid_status_for_steward' };
      return { ok: true, nextStatus: 'accepted' };
    case 'steward_reject':
      if (input.status !== 'awaiting_steward' && input.status !== 'awaiting_witness') {
        return { ok: false, reason: 'invalid_status_for_reject' };
      }
      return { ok: true, nextStatus: 'rejected' };
    default:
      return { ok: false, reason: 'unknown_action' };
  }
}

export function assistedBallotIsCountable(status: AssistedBallotStatus): boolean {
  return status === 'accepted';
}
