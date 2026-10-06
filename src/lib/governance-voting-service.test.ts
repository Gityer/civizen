import { describe, expect, it, vi } from 'vitest';

import {
  buildGovernanceVoteSnapshot,
  getGovernanceVoteBlockMessageKey,
  getGovernanceVoteBlockReason,
  recordGovernanceVote,
  type GovernanceVoteIdentity,
} from '@/lib/governance-voting-service';
import { argsOf, createRecordingClient } from '@/test/create-recording-client';

const identity: GovernanceVoteIdentity = {
  voterId: 'voter-1',
  influenceWeight: 1,
  governanceScore: 72,
  citizenshipStatus: 'active_citizen',
  isVerified: true,
  isActiveCitizen: true,
};

describe('governance voting service', () => {
  describe('getGovernanceVoteBlockReason', () => {
    it('checks sign-in, then sanctions, then eligibility', () => {
      expect(getGovernanceVoteBlockReason({ signedIn: false, voteBlockedBySanction: true, eligible: false })).toBe('not_signed_in');
      expect(getGovernanceVoteBlockReason({ signedIn: true, voteBlockedBySanction: true, eligible: false })).toBe('sanctioned');
      expect(getGovernanceVoteBlockReason({ signedIn: true, voteBlockedBySanction: false, eligible: false })).toBe('not_eligible');
      expect(getGovernanceVoteBlockReason({ signedIn: true, voteBlockedBySanction: false, eligible: true })).toBeNull();
    });

    it('uses the sanction message only for sanctions', () => {
      expect(getGovernanceVoteBlockMessageKey('sanctioned')).toBe('governanceHub.voteBlockedBySanction');
      expect(getGovernanceVoteBlockMessageKey('not_eligible')).toBe('governanceHub.voteBlocked');
      expect(getGovernanceVoteBlockMessageKey('not_signed_in')).toBe('governanceHub.voteBlocked');
    });
  });

  it('stores the voter standing used for audits', () => {
    expect(buildGovernanceVoteSnapshot(identity)).toEqual({
      governance_score: 72,
      citizenship_status: 'active_citizen',
      is_verified: true,
      is_active_citizen: true,
    });
  });

  describe('recordGovernanceVote', () => {
    it('upserts one weighted vote per proposal and voter, then records the audit event', async () => {
      const { client, calls } = createRecordingClient();

      const result = await recordGovernanceVote(client, { proposalId: 'p-1', choice: 'approve', identity });

      expect(result).toEqual({ ok: true, eventRecorded: true });
      expect(argsOf(calls, 'governance_proposal_votes', 'upsert')).toEqual([
        {
          proposal_id: 'p-1',
          voter_id: 'voter-1',
          choice: 'approve',
          weight: 1,
          rationale: null,
          snapshot: buildGovernanceVoteSnapshot(identity),
        },
        { onConflict: 'proposal_id,voter_id' },
      ]);
      expect(argsOf(calls, 'governance_proposal_events', 'insert')).toEqual([
        {
          proposal_id: 'p-1',
          actor_id: 'voter-1',
          event_type: 'vote.recorded',
          payload: { choice: 'approve', weight: 1 },
        },
      ]);
    });

    it('does not write an audit event when the vote itself fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { client, calls } = createRecordingClient({
        governance_proposal_votes: [{ error: { message: 'denied' } }],
      });

      const result = await recordGovernanceVote(client, { proposalId: 'p-1', choice: 'reject', identity });

      expect(result.ok).toBe(false);
      expect(calls.some((call) => call.table === 'governance_proposal_events')).toBe(false);
    });

    it('keeps the vote when only the audit event fails and reports it', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { client } = createRecordingClient({
        governance_proposal_events: [{ error: { message: 'event write failed' } }],
      });

      const result = await recordGovernanceVote(client, { proposalId: 'p-1', choice: 'abstain', identity });

      expect(result).toEqual({ ok: true, eventRecorded: false });
    });
  });
});
