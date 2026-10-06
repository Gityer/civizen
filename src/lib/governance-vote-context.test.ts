import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MIN_GOVERNANCE_SCORE } from '@/lib/governance-eligibility';
import { loadGovernanceVoteContext } from '@/lib/governance-vote-context';
import { createRecordingClient } from '@/test/create-recording-client';

const scoreMock = vi.hoisted(() => ({ overall: 0 }));
vi.mock('@/lib/scoring', () => ({
  calculateCivizenScore: () => ({ overall: scoreMock.overall }),
}));

const profile = { id: 'me', role: 'member' as const, is_verified: true, is_active_citizen: true };

const activeSanction = (overrides: Record<string, unknown> = {}) => ({
  id: 's-1',
  profile_id: 'me',
  is_active: true,
  starts_at: null,
  ends_at: null,
  blocks_governance_all: false,
  blocks_voting: false,
  blocks_proposal_creation: false,
  blocks_verification_review: false,
  blocks_execution: false,
  ...overrides,
});

describe('loadGovernanceVoteContext', () => {
  beforeEach(() => {
    scoreMock.overall = MIN_GOVERNANCE_SCORE + 5;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('makes a verified member with enough score eligible in the native app', async () => {
    const { client } = createRecordingClient({ endorsements: [{ data: [] }], governance_sanctions: [{ data: [] }] });

    const context = await loadGovernanceVoteContext(client, profile, { isNativeApp: true });

    expect(context.eligibility).toMatchObject({ eligible: true, influenceWeight: 1 });
    expect(context.governanceScore).toBe(MIN_GOVERNANCE_SCORE + 5);
    expect(context.voteBlockedBySanction).toBe(false);
  });

  it('requires the native mobile app, as the member workspace does', async () => {
    const { client } = createRecordingClient({ endorsements: [{ data: [] }], governance_sanctions: [{ data: [] }] });

    const context = await loadGovernanceVoteContext(client, profile, { isNativeApp: false });

    expect(context.eligibility.eligible).toBe(false);
    expect(context.eligibility.reasons).toContain('mobile_app_required');
  });

  it('is not eligible below the minimum score or when unverified', async () => {
    scoreMock.overall = MIN_GOVERNANCE_SCORE - 1;
    const { client } = createRecordingClient({ endorsements: [{ data: [] }], governance_sanctions: [{ data: [] }] });

    const lowScore = await loadGovernanceVoteContext(client, profile, { isNativeApp: true });
    expect(lowScore.eligibility.reasons).toContain('minimum_score_required');

    const unverified = await loadGovernanceVoteContext(client, { ...profile, is_verified: false }, { isNativeApp: true });
    expect(unverified.eligibility.reasons).toContain('verified_required');
  });

  it('reports the score as unavailable (not zero) when endorsements cannot be loaded', async () => {
    const { client } = createRecordingClient({
      endorsements: [{ error: { message: 'down' } }],
      governance_sanctions: [{ data: [] }],
    });

    const context = await loadGovernanceVoteContext(client, profile, { isNativeApp: true });

    expect(context.scoreUnavailable).toBe(true);
    expect(context.governanceScore).toBeNull();
    expect(context.eligibility.reasons).toContain('score_unavailable');
  });

  it('blocks voting only while a voting sanction is currently active', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const { client } = createRecordingClient({
      endorsements: [{ data: [] }],
      governance_sanctions: [
        {
          data: [
            activeSanction({ id: 'expired', blocks_voting: true, ends_at: past }),
            activeSanction({ id: 'not-yet', blocks_voting: true, starts_at: future }),
            activeSanction({ id: 'proposals-only', blocks_proposal_creation: true }),
          ],
        },
      ],
    });

    const context = await loadGovernanceVoteContext(client, profile, { isNativeApp: true });

    expect(context.voteBlockedBySanction).toBe(false);
    expect(context.proposalBlockedBySanction).toBe(true);

    const blocked = createRecordingClient({
      endorsements: [{ data: [] }],
      governance_sanctions: [{ data: [activeSanction({ blocks_voting: true })] }],
    });
    expect((await loadGovernanceVoteContext(blocked.client, profile, { isNativeApp: true })).voteBlockedBySanction).toBe(true);
  });

  it('treats a full governance sanction as blocking both voting and proposing', async () => {
    const { client } = createRecordingClient({
      endorsements: [{ data: [] }],
      governance_sanctions: [{ data: [activeSanction({ blocks_governance_all: true })] }],
    });

    const context = await loadGovernanceVoteContext(client, profile, { isNativeApp: true });

    expect(context.voteBlockedBySanction).toBe(true);
    expect(context.proposalBlockedBySanction).toBe(true);
  });

  it('does not block anyone when the sanctions backend is unavailable, but says so', async () => {
    const { client } = createRecordingClient({
      endorsements: [{ data: [] }],
      governance_sanctions: [{ error: { code: '42P01', message: 'relation "governance_sanctions" does not exist' } }],
    });

    const context = await loadGovernanceVoteContext(client, profile, { isNativeApp: true });

    expect(context.sanctionsUnavailable).toBe(true);
    expect(context.voteBlockedBySanction).toBe(false);
  });
});
