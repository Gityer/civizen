import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CivicVotingConsultationVote } from './CivicVotingConsultationVote';
import { formatReceipt } from './consultation-receipt';

type VoteModel = Parameters<typeof CivicVotingConsultationVote>[0]['model'];

const window = {
  state: 'open' as const,
  opensAt: new Date('2026-09-30T00:00:00Z'),
  closesAt: new Date('2027-09-30T00:00:00Z'),
};

function makeModel(overrides: Partial<Record<string, unknown>> = {}): VoteModel {
  return {
    myOption: null,
    myReceipt: null,
    eligibilityReason: null,
    votingWindow: window,
    casting: false,
    withdrawing: false,
    t: (key: string) => key,
    language: 'en',
    user: null,
    votingOpen: true,
    votingClosed: false,
    castConsultation: vi.fn(),
    withdrawConsultation: vi.fn(),
    verifyReceipt: vi.fn(),
    directoryVisible: false,
    directoryBusy: false,
    toggleDirectoryPresence: vi.fn(),
    detail: { election: { status: 'open' } },
    ...overrides,
  } as unknown as VoteModel;
}

function ReturnProbe() {
  const location = useLocation();
  return <div data-testid="return">{JSON.stringify(location.state)}</div>;
}

function renderAt(model: VoteModel) {
  return render(
    <MemoryRouter initialEntries={['/governance/voting/e1']}>
      <Routes>
        <Route path="/governance/voting/:id" element={<CivicVotingConsultationVote model={model} />} />
        <Route path="/signup" element={<ReturnProbe />} />
        <Route path="/login" element={<ReturnProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CivicVotingConsultationVote', () => {
  it('guest sees a create-account call to action that carries the ballot as the return path', () => {
    renderAt(makeModel());
    fireEvent.click(screen.getByText('civicVoting.consultation.createAccountToVote'));
    expect(screen.getByTestId('return').textContent).toContain('/governance/voting/e1');
  });

  it('guest sign-in link also returns to the ballot', () => {
    renderAt(makeModel());
    fireEvent.click(screen.getByText('civicVoting.publicLanding.signIn'));
    expect(screen.getByTestId('return').textContent).toContain('/governance/voting/e1');
  });

  it('signed-in member can cast a choice directly', () => {
    const castConsultation = vi.fn();
    renderAt(makeModel({ user: { id: 'u1' }, castConsultation }));
    fireEvent.click(screen.getByText('civicVoting.proposals.castSupport'));
    expect(castConsultation).toHaveBeenCalledWith('support');
  });

  it('explains a server-side eligibility block and disables the ballot buttons', () => {
    const castConsultation = vi.fn();
    renderAt(makeModel({ user: { id: 'u1' }, eligibilityReason: 'verification_required', castConsultation }));
    expect(screen.getByText('civicBallot.reason.verification_required')).toBeTruthy();
    const support = screen.getByText('civicVoting.proposals.castSupport').closest('button');
    expect(support?.disabled).toBe(true);
    fireEvent.click(screen.getByText('civicVoting.proposals.castSupport'));
    expect(castConsultation).not.toHaveBeenCalled();
  });

  it('tells an unverified member the ballot is advisory and keeps the receipt off the counted-list check', () => {
    const verifyReceipt = vi.fn();
    renderAt(makeModel({ user: { id: 'u1' }, advisoryVoter: true, myBallotAdvisory: true, myOption: 'support', myReceipt: 'abcd1234abcd1234abcd1234', verifyReceipt }));
    expect(screen.getByTestId('consultation-advisory')).toBeTruthy();
    expect(screen.getByText('civicBallot.advisoryReceiptTitle')).toBeTruthy();
    expect(screen.queryByText('civicBallot.verifyReceipt')).toBeNull();
    expect(screen.getByText('civicBallot.advisoryVerifyLink').closest('a')?.getAttribute('href')).toBe('/settings/profile');
  });

  it('warns an unverified member before casting that the ballot will be advisory', () => {
    renderAt(makeModel({ user: { id: 'u1' }, advisoryVoter: true }));
    expect(screen.getByTestId('consultation-advisory')).toBeTruthy();
    expect(screen.getByText('civicVoting.proposals.castSupport').closest('button')?.disabled).toBe(false);
  });

  it('shows the receipt after voting and lets the member check it', () => {
    const verifyReceipt = vi.fn();
    renderAt(makeModel({ user: { id: 'u1' }, myOption: 'support', myReceipt: 'abcd1234abcd1234abcd1234', verifyReceipt }));
    expect(screen.getByText('ABCD-1234-ABCD-1234-ABCD-1234')).toBeTruthy();
    fireEvent.click(screen.getByText('civicBallot.verifyReceipt'));
    expect(verifyReceipt).toHaveBeenCalled();
  });

  it('shows the closed message, keeps the receipt, and offers no vote buttons when voting is closed', () => {
    renderAt(
      makeModel({
        user: { id: 'u1' },
        votingOpen: false,
        votingClosed: true,
        votingWindow: { ...window, state: 'closed' },
        myOption: 'oppose',
        myReceipt: 'abcd1234abcd1234abcd1234',
      }),
    );
    expect(screen.getByText('civicBallot.closedOn')).toBeTruthy();
    expect(screen.getByTestId('consultation-receipt')).toBeTruthy();
    expect(screen.queryByText('civicVoting.proposals.castSupport')).toBeNull();
  });

  it('formats receipts in readable groups', () => {
    expect(formatReceipt('abcd1234abcd1234abcd1234')).toBe('ABCD-1234-ABCD-1234-ABCD-1234');
  });
});

describe('CivicVotingConsultationVote with custom options', () => {
  it('renders one button per election option and casts its key', () => {
    const castConsultation = vi.fn();
    renderAt(
      makeModel({
        user: { id: 'u1' },
        castConsultation,
        detail: {
          election: { status: 'open', metadata: {} },
          contests: [
            {
              candidates: [
                { optionKey: 'keep_as_is', displayName: 'Keep as is' },
                { optionKey: 'change_it', displayName: 'Change it' },
              ],
            },
          ],
        },
      }),
    );
    expect(screen.queryByText('civicVoting.proposals.castSupport')).toBeNull();
    fireEvent.click(screen.getByText('Change it'));
    expect(castConsultation).toHaveBeenCalledWith('change_it');
  });

  it('shows the published outcome once voting is closed', () => {
    renderAt(
      makeModel({
        user: { id: 'u1' },
        votingOpen: false,
        votingClosed: true,
        votingWindow: { ...window, state: 'closed' },
        detail: {
          election: {
            status: 'closed',
            metadata: { final_outcome: { total_countable: 10, quorum: null, quorum_met: true, pass_threshold_percent: 50, support_share_percent: 70, passed: true, leading_option_key: 'support' } },
          },
          contests: [],
        },
      }),
    );
    expect(screen.getByTestId('consultation-outcome').textContent).toContain('civicBallot.outcomePassed');
  });
});

describe('CivicVotingConsultationVote approval ballots', () => {
  const approvalDetail = {
    election: { status: 'open', metadata: { ballot_method: 'approval', max_selections: 2 } },
    contests: [{
      candidates: [
        { optionKey: 'park', displayName: 'Park' },
        { optionKey: 'library', displayName: 'Library' },
        { optionKey: 'clinic', displayName: 'Clinic' },
      ],
    }],
  };

  it('lets a member pick up to the maximum and casts the picks together', () => {
    const castConsultation = vi.fn();
    renderAt(makeModel({ user: { id: 'u1' }, myOptions: [], castConsultation, detail: approvalDetail }));
    expect(screen.getByTestId('consultation-approval')).toBeTruthy();
    fireEvent.click(screen.getByText('Park'));
    fireEvent.click(screen.getByText('Library'));
    expect(screen.getByText('Clinic').closest('button')?.disabled).toBe(true);
    fireEvent.click(screen.getByTestId('consultation-cast-approval'));
    expect(castConsultation).toHaveBeenCalledWith(['park', 'library']);
  });

  it('shows the current picks and keeps the cast button idle until something changes', () => {
    const castConsultation = vi.fn();
    renderAt(makeModel({ user: { id: 'u1' }, myOption: 'park', myOptions: ['park', 'clinic'], myReceipt: 'abc', castConsultation, detail: approvalDetail }));
    expect(screen.getByText('Park, Clinic')).toBeTruthy();
    expect((screen.getByTestId('consultation-cast-approval') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Clinic'));
    expect((screen.getByTestId('consultation-cast-approval') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId('consultation-cast-approval'));
    expect(castConsultation).toHaveBeenCalledWith(['park']);
  });
});

describe('CivicVotingConsultationVote ranked ballots', () => {
  const rankedDetail = {
    election: { status: 'open', metadata: { ballot_method: 'ranked' } },
    contests: [{
      candidates: [
        { optionKey: 'hall', displayName: 'Hall' },
        { optionKey: 'park', displayName: 'Park' },
        { optionKey: 'school', displayName: 'School' },
      ],
    }],
  };

  it('keeps the tap order as the ranking and casts it', () => {
    const castConsultation = vi.fn();
    renderAt(makeModel({ user: { id: 'u1' }, myOptions: [], castConsultation, detail: rankedDetail }));
    expect(screen.getByTestId('consultation-ranked')).toBeTruthy();
    fireEvent.click(screen.getByText('Park'));
    fireEvent.click(screen.getByText('Hall'));
    fireEvent.click(screen.getByTestId('consultation-cast-ranked'));
    expect(castConsultation).toHaveBeenCalledWith(['park', 'hall']);
  });

  it('shows the stored ranking in order and treats a reorder as a change', () => {
    const castConsultation = vi.fn();
    renderAt(makeModel({ user: { id: 'u1' }, myOption: 'park', myOptions: ['park', 'hall'], myReceipt: 'abc', castConsultation, detail: rankedDetail }));
    expect(screen.getByText('1. Park, 2. Hall')).toBeTruthy();
    expect((screen.getByTestId('consultation-cast-ranked') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Park'));
    fireEvent.click(screen.getByText('Park'));
    expect((screen.getByTestId('consultation-cast-ranked') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId('consultation-cast-ranked'));
    expect(castConsultation).toHaveBeenCalledWith(['hall', 'park']);
  });
});
