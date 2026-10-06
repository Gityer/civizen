import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/integrations/supabase/types';
import type { GovernanceVoteChoice } from '@/lib/governance-ui.types';

/**
 * The single place votes are recorded. The member workspace and the governance dashboard both call
 * this, so eligibility weight, the score snapshot and the audit event can never drift apart.
 */

type Client = SupabaseClient<Database>;

export type GovernanceVoteIdentity = {
  voterId: string;
  /** 0 or 1 from `evaluateGovernanceEligibility`. A weight of 0 is never recorded (see the block reason). */
  influenceWeight: 0 | 1;
  governanceScore: number | null;
  citizenshipStatus: string;
  isVerified: boolean;
  isActiveCitizen: boolean;
};

export type GovernanceVoteBlockReason = 'not_signed_in' | 'sanctioned' | 'not_eligible';

/** Why a vote must not be attempted, or null when the member may vote. Order matches the workspace. */
export function getGovernanceVoteBlockReason(input: {
  signedIn: boolean;
  voteBlockedBySanction: boolean;
  eligible: boolean;
}): GovernanceVoteBlockReason | null {
  if (!input.signedIn) return 'not_signed_in';
  if (input.voteBlockedBySanction) return 'sanctioned';
  if (!input.eligible) return 'not_eligible';
  return null;
}

export function getGovernanceVoteBlockMessageKey(reason: GovernanceVoteBlockReason): string {
  return reason === 'sanctioned' ? 'governanceHub.voteBlockedBySanction' : 'governanceHub.voteBlocked';
}

/** What is stored with each vote so a result can be audited against the voter's standing at the time. */
export function buildGovernanceVoteSnapshot(identity: GovernanceVoteIdentity): Json {
  return {
    governance_score: identity.governanceScore,
    citizenship_status: identity.citizenshipStatus,
    is_verified: identity.isVerified,
    is_active_citizen: identity.isActiveCitizen,
  };
}

export type RecordGovernanceVoteResult =
  | { ok: true; eventRecorded: boolean }
  | { ok: false; error: unknown };

/**
 * Records (or changes) the member's vote on a proposal and writes the `vote.recorded` audit event.
 * One vote per member per proposal: a second call replaces the first (upsert on proposal + voter).
 * A failed audit event does not undo the vote; it is reported through `eventRecorded`.
 */
export async function recordGovernanceVote(
  client: Client,
  input: { proposalId: string; choice: GovernanceVoteChoice; identity: GovernanceVoteIdentity },
): Promise<RecordGovernanceVoteResult> {
  const { proposalId, choice, identity } = input;

  const { error: voteError } = await client.from('governance_proposal_votes').upsert(
    {
      proposal_id: proposalId,
      voter_id: identity.voterId,
      choice,
      weight: identity.influenceWeight,
      rationale: null,
      snapshot: buildGovernanceVoteSnapshot(identity),
    },
    { onConflict: 'proposal_id,voter_id' },
  );

  if (voteError) {
    console.error('Failed to record governance vote:', voteError);
    return { ok: false, error: voteError };
  }

  const { error: eventError } = await client.from('governance_proposal_events').insert({
    proposal_id: proposalId,
    actor_id: identity.voterId,
    event_type: 'vote.recorded',
    payload: { choice, weight: identity.influenceWeight },
  });

  if (eventError) {
    console.error('Failed to record governance vote event:', eventError);
  }

  return { ok: true, eventRecorded: !eventError };
}
