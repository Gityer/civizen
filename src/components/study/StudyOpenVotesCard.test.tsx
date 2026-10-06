import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CivicElection } from '@/lib/civic-voting';
import { StudyOpenVotesList } from './StudyOpenVotesCard';
import { selectOpenVotes } from './study-open-votes';

function election(overrides: Partial<CivicElection>): CivicElection {
  return {
    id: 'e1',
    title: 'A Single World Citizenship',
    summary: 'Should humanity work toward a single world citizenship?',
    body: '',
    tier: 'supranational',
    securityClass: 'ordinary',
    status: 'open',
    scopeCountryCode: 'GLOBAL',
    scopeRegionCode: null,
    scopeLocalityCode: null,
    votingOpensAt: '2026-09-30T00:00:00Z',
    votingClosesAt: '2027-09-30T00:00:00Z',
    primaryWindowSeconds: 900,
    maxAttempts: 5,
    retrySpacingHours: 24,
    requireHomePresence: false,
    requireSolitude: false,
    requireFaceLiveness: false,
    sampleBatch: null,
    metadata: {},
    ...overrides,
  } as CivicElection;
}

describe('StudyOpenVotesCard', () => {
  it('keeps only live open elections, never samples or closed ones', () => {
    const picked = selectOpenVotes([
      election({ id: 'live' }),
      election({ id: 'sample', sampleBatch: 'public-historical-v1' }),
      election({ id: 'closed', status: 'closed' }),
      election({ id: 'scheduled', status: 'scheduled' }),
    ]);
    expect(picked.map((row) => row.id)).toEqual(['live']);
  });

  it('shows the empty state when nothing is open', () => {
    render(<StudyOpenVotesList t={(k) => k} elections={[]} loading={false} error={false} onOpen={vi.fn()} />);
    expect(screen.getByText('study.openVotesEmpty')).toBeTruthy();
  });

  it('opens the real ballot for a listed election', () => {
    const onOpen = vi.fn();
    render(
      <StudyOpenVotesList
        t={(k) => k}
        elections={[election({ id: 'e1' })]}
        loading={false}
        error={false}
        onOpen={onOpen}
      />,
    );
    expect(screen.getByText('A Single World Citizenship')).toBeTruthy();
    fireEvent.click(screen.getByText('study.openBallot'));
    expect(onOpen).toHaveBeenCalledWith('e1');
  });
});
