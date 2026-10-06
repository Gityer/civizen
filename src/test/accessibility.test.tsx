import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

import { HelpSupportLinks } from '@/pages/settings/HelpSupport';
import { NotificationList } from '@/pages/Notifications';
import { CivicVotingObserverPanel } from '@/pages/governance/CivicVotingObserver';
import { StudyOpenVotesList } from '@/components/study/StudyOpenVotesCard';
import { CivicVotingConsultationVote } from '@/pages/governance/civic-voting-election/CivicVotingConsultationVote';

const t = (key: string) => key.split('.').pop() ?? key;

async function expectNoViolations(container: HTMLElement) {
  const results = await axe(container);
  expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
}

describe('accessibility of the governance and settings surfaces', () => {
  it('Help and support links', async () => {
    const { container } = render(<HelpSupportLinks t={t} onOpen={vi.fn()} />);
    await expectNoViolations(container);
  });

  it('Notification list', async () => {
    const { container } = render(
      <NotificationList
        t={t}
        language="en"
        rows={[
          { id: '1', type: 'x', title: 'Published', body: 'Open for voting', entityType: 'civic_election', entityId: 'e1', readAt: null, createdAt: '2026-10-06T00:00:00Z', metadata: {} },
        ]}
        onOpen={vi.fn()}
      />,
    );
    await expectNoViolations(container);
  });

  it('Observer panel', async () => {
    const { container } = render(
      <CivicVotingObserverPanel
        t={t}
        snapshot={{ eligibleRosterCount: 0, ballotsCountable: 2, ballotsWithdrawn: 0, sessionsByStatus: { cast: 2 }, averageAttemptsCast: 1, gateChecks: [], riskFindingsBySeverity: {}, canvassSamples: 0, canvassReviewed: 0, eventsRecorded: 3, isSample: false }}
      />,
    );
    await expectNoViolations(container);
  });

  it('Study open votes', async () => {
    const { container } = render(<StudyOpenVotesList t={t} elections={[]} loading={false} error={false} onOpen={vi.fn()} />);
    await expectNoViolations(container);
  });

  it('Consultation ballot', async () => {
    const model = {
      myOption: 'support',
      myReceipt: 'abcd1234abcd1234abcd1234',
      eligibilityReason: null,
      votingWindow: { state: 'open', opensAt: new Date('2026-09-30T00:00:00Z'), closesAt: new Date('2027-09-30T00:00:00Z') },
      casting: false,
      withdrawing: false,
      t,
      language: 'en',
      user: { id: 'u1' },
      votingOpen: true,
      votingClosed: false,
      castConsultation: vi.fn(),
      withdrawConsultation: vi.fn(),
      verifyReceipt: vi.fn(),
      directoryVisible: false,
      directoryBusy: false,
      toggleDirectoryPresence: vi.fn(),
      detail: { election: { status: 'open', metadata: {} }, contests: [] },
    } as unknown as Parameters<typeof CivicVotingConsultationVote>[0]['model'];
    const { container } = render(
      <MemoryRouter>
        <CivicVotingConsultationVote model={model} />
      </MemoryRouter>,
    );
    await expectNoViolations(container);
  });
});
