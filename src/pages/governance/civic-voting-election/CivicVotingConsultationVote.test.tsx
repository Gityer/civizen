import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CivicVotingConsultationVote } from './CivicVotingConsultationVote';

type VoteModel = Parameters<typeof CivicVotingConsultationVote>[0]['model'];

function makeModel(overrides: Partial<Record<string, unknown>> = {}): VoteModel {
  return {
    myOption: null,
    casting: false,
    withdrawing: false,
    t: (key: string) => key,
    user: null,
    votingOpen: true,
    votingClosed: false,
    castConsultation: vi.fn(),
    withdrawConsultation: vi.fn(),
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

  it('shows the closed message and no vote buttons when voting is closed', () => {
    renderAt(makeModel({ user: { id: 'u1' }, votingOpen: false, votingClosed: true }));
    expect(screen.getByText('civicVoting.proposals.votingClosed')).toBeTruthy();
    expect(screen.queryByText('civicVoting.proposals.castSupport')).toBeNull();
  });
});
