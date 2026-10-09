import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ContributeImpact from '@/pages/contribute/ContributeImpact';

const listMyParticipations = vi.fn();
const listOpportunitiesByIds = vi.fn();
const listOwnedLinkedProfileIds = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1' },
  }),
}));

vi.mock('@/lib/impact-api', () => ({ listMyKnowledgeResources: async () => [] }));
vi.mock('@/lib/agreements-api', () => ({
  listAgreementsForEntity: async () => [],
  listAccessibleAgreements: async () => [],
}));

vi.mock('@/lib/opportunities-api', () => ({
  listMyParticipations: (...args: unknown[]) => listMyParticipations(...args),
  listOpportunitiesByIds: (...args: unknown[]) => listOpportunitiesByIds(...args),
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

describe('ContributeImpact', () => {
  beforeEach(() => {
    listOwnedLinkedProfileIds.mockResolvedValue([]);
    listMyParticipations.mockResolvedValue([
      {
        id: 'part-1',
        opportunityId: 'opp-1',
        participantProfileId: 'user-1',
        status: 'completed',
        verificationStatus: 'verified',
        applicationMessage: null,
        appliedAt: '2026-08-13T00:00:00.000Z',
        acceptedAt: null,
        acceptedBy: null,
        declinedAt: null,
        declinedBy: null,
        declineNote: null,
        activatedAt: null,
        submittedAt: null,
        completedAt: '2026-08-13T00:00:00.000Z',
        completedBy: null,
        withdrawnAt: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: '2026-08-13T00:00:00.000Z',
        updatedAt: '2026-08-13T00:00:00.000Z',
      },
    ]);
    listOpportunitiesByIds.mockResolvedValue([
      {
        id: 'opp-1',
        publisherProfileId: 'coord-1',
        title: 'Walk the dark stretches and write a one-page safer-route note',
        summary: 'Walk the streets used after the weekly market with two neighbors.',
        description: null,
        status: 'open',
        opportunityKind: 'knowledge_gap',
        areaNodeId: null,
        requiredSkills: [],
        optionalSkills: [],
        locationText: null,
        isRemote: false,
        estimatedEffort: '3 hours',
        applicationDeadline: null,
        workStartsAt: null,
        workEndsAt: null,
        compensationStatus: 'learning',
        expectedOutcome: null,
        evidenceRequirements: null,
        evaluationCriteria: null,
        evaluationDimensions: [],
        createdAt: '2026-08-13T00:00:00.000Z',
        updatedAt: '2026-08-13T00:00:00.000Z',
      },
    ]);
  });

  it('lists the current person contributions across opportunity kinds', async () => {
    render(
      <MemoryRouter>
        <ContributeImpact />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Walk the dark stretches and write a one-page safer-route note'),
    ).toBeInTheDocument();
    expect(screen.getByText('contribute.opportunities.participationStatus.completed')).toBeInTheDocument();
    expect(screen.getByText('contribute.opportunities.verification.verified')).toBeInTheDocument();
    expect(screen.queryByText('contribute.placeholder.comingSoonTitle')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Walk the dark stretches and write a one-page safer-route note/ }),
    ).toHaveAttribute('href', '/contribute/professional/opp-1');
  });
});
