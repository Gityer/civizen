import { describe, expect, it } from 'vitest';

import type { CivicElection, VotingProposal } from '@/lib/civic-voting';
import {
  canAccessGovernanceTools,
  groupElections,
  groupProposals,
  readFinalTally,
  readGovernanceTab,
} from './governance-member-model';

const election = (overrides: Partial<CivicElection>): CivicElection =>
  ({
    id: 'e',
    title: 'T',
    summary: '',
    body: '',
    tier: 'supranational',
    securityClass: 'ordinary',
    status: 'open',
    scopeCountryCode: 'GLOBAL',
    scopeRegionCode: null,
    scopeLocalityCode: null,
    votingOpensAt: '2026-01-01T00:00:00Z',
    votingClosesAt: '2026-12-31T00:00:00Z',
    primaryWindowSeconds: 900,
    maxAttempts: 5,
    retrySpacingHours: 24,
    requireHomePresence: false,
    requireSolitude: false,
    requireFaceLiveness: false,
    sampleBatch: null,
    metadata: {},
    ...overrides,
  }) as CivicElection;

const proposal = (overrides: Partial<VotingProposal>): VotingProposal =>
  ({
    id: 'p',
    matterId: 'm',
    title: 'P',
    summary: '',
    body: '',
    status: 'draft',
    consultationKind: 'nonbinding',
    scopeKind: 'global',
    scopeCountryCode: null,
    electionId: null,
    votingOpensAt: null,
    votingClosesAt: null,
    createdByProfileId: 'author',
    publishedAt: null,
    createdAt: '',
    updatedAt: '',
    metadata: {},
    openForSupport: false,
    supportThreshold: 10,
    ...overrides,
  }) as VotingProposal;

describe('governance member model', () => {
  it('groups live elections by their real window and drops samples', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const groups = groupElections(
      [
        election({ id: 'open' }),
        election({ id: 'past', votingClosesAt: '2026-05-01T00:00:00Z' }),
        election({ id: 'closed', status: 'closed' }),
        election({ id: 'future', votingOpensAt: '2026-07-01T00:00:00Z' }),
        election({ id: 'sample', sampleBatch: 'public-historical-v1' }),
      ],
      now,
    );
    expect(groups.open.map((e) => e.id)).toEqual(['open']);
    expect(groups.scheduled.map((e) => e.id)).toEqual(['future']);
    expect(groups.closed.map((e) => e.id).sort()).toEqual(['closed', 'past']);
  });

  it('reads the final tally stored by the close tick', () => {
    expect(readFinalTally({ final_tally: [{ option_key: 'support', display_name: 'Support', vote_count: '3' }] })).toEqual([
      { optionKey: 'support', displayName: 'Support', voteCount: 3 },
    ]);
    expect(readFinalTally({})).toEqual([]);
  });

  it('groups proposals into mine, open for support, published and closed', () => {
    const groups = groupProposals(
      [
        proposal({ id: 'mine', createdByProfileId: 'me' }),
        proposal({ id: 'theirs-open', openForSupport: true }),
        proposal({ id: 'theirs-hidden' }),
        proposal({ id: 'pub', status: 'published' }),
        proposal({ id: 'done', status: 'closed' }),
      ],
      'me',
    );
    expect(groups.mine.map((p) => p.id)).toEqual(['mine']);
    expect(groups.openForSupport.map((p) => p.id)).toEqual(['theirs-open']);
    expect(groups.published.map((p) => p.id)).toEqual(['pub']);
    expect(groups.closed.map((p) => p.id)).toEqual(['done']);
  });

  it('shows tools only to managers, permitted roles and office holders', () => {
    expect(canAccessGovernanceTools({ role: 'member', permissions: [], officeKeys: [] })).toBe(false);
    expect(canAccessGovernanceTools({ role: 'founder', permissions: [], officeKeys: [] })).toBe(true);
    expect(canAccessGovernanceTools({ role: 'member', permissions: ['role.assign'], officeKeys: [] })).toBe(true);
    expect(canAccessGovernanceTools({ role: 'member', permissions: [], officeKeys: ['founder'] })).toBe(true);
    expect(readGovernanceTab('?tab=tools', false)).toBe('votes');
    expect(readGovernanceTab('?tab=proposals', false)).toBe('proposals');
  });
});
