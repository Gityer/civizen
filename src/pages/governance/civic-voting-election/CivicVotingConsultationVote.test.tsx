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
