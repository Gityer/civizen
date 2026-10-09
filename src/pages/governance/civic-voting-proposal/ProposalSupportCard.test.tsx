import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { VotingProposal } from '@/lib/civic-voting';
import { ProposalSupportCard } from './ProposalSupportCard';
import { fromLocalInput, toLocalInput } from './proposal-settings-time';

const draft = {
  id: 'p1',
  status: 'draft',
  createdByProfileId: 'author',
  openForSupport: false,
  supportThreshold: 10,
  scopeKind: 'global',
  scopeCountryCode: null,
  votingOpensAt: null,
  votingClosesAt: null,
} as unknown as VotingProposal;

describe('ProposalSupportCard', () => {
  it('lets the author open the draft for support with a threshold', () => {
    const onOpenForSupport = vi.fn();
    render(
      <ProposalSupportCard
        t={(k) => k}
        proposal={draft}
        support={null}
        isAuthorOrManager
        signedIn
        busy={false}
        onOpenForSupport={onOpenForSupport}
        onToggleSupport={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('proposalSupport.thresholdLabel'), { target: { value: '25' } });
    fireEvent.click(screen.getByText('proposalSupport.openForSupportAction'));
    expect(onOpenForSupport).toHaveBeenCalledWith(25);
  });

  it('shows progress and a support toggle once open', () => {
    const onToggleSupport = vi.fn();
    render(
      <ProposalSupportCard
        t={(k, p) => (p ? `${k} ${p.count}/${p.threshold}` : k)}
        proposal={{ ...draft, openForSupport: true }}
        support={{ count: 3, threshold: 10, openForSupport: true, supported: false, ready: false, isAuthor: false }}
        isAuthorOrManager={false}
        signedIn
        busy={false}
        onOpenForSupport={vi.fn()}
        onToggleSupport={onToggleSupport}
      />,
    );
    expect(screen.getByText('proposalSupport.progress 3/10')).toBeTruthy();
    fireEvent.click(screen.getByText('proposalSupport.support'));
    expect(onToggleSupport).toHaveBeenCalled();
  });

  it('does not offer the support toggle to the author (their support never counts)', () => {
    render(
      <ProposalSupportCard
        t={(k) => k}
        proposal={{ ...draft, openForSupport: true }}
        support={{ count: 0, threshold: 10, openForSupport: true, supported: false, ready: false, isAuthor: true }}
        isAuthorOrManager
        signedIn
        busy={false}
        onOpenForSupport={vi.fn()}
        onToggleSupport={vi.fn()}
      />,
    );
    expect(screen.queryByText('proposalSupport.support')).toBeNull();
    expect(screen.getByTestId('proposal-support-author-note')).toBeTruthy();
  });

  it('renders nothing once the proposal is published', () => {
    const { container } = render(
      <ProposalSupportCard
        t={(k) => k}
        proposal={{ ...draft, status: 'published' }}
        support={null}
        isAuthorOrManager
        signedIn
        busy={false}
        onOpenForSupport={vi.fn()}
        onToggleSupport={vi.fn()}
      />,
    );
    expect(container.textContent).toBe('');
  });

  it('round-trips datetime-local values', () => {
    const iso = fromLocalInput('2026-11-01T10:30');
    expect(iso).toBeTruthy();
    expect(toLocalInput(iso)).toBe('2026-11-01T10:30');
    expect(fromLocalInput('')).toBeNull();
  });
});

describe('parseOptionLines', () => {
  it('treats the default trio as no custom options and keeps custom labels', async () => {
    const { parseOptionLines } = await import('./proposal-options');
    expect(parseOptionLines('Support\nOppose\nAbstain')).toEqual([]);
    expect(parseOptionLines('support\n oppose \nabstain\n')).toEqual([]);
    expect(parseOptionLines('Keep as is\nChange it\n\nNot sure')).toEqual([
      { label: 'Keep as is' },
      { label: 'Change it' },
      { label: 'Not sure' },
    ]);
    expect(parseOptionLines('')).toEqual([]);
  });
});
