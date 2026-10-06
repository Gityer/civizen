import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import KnowledgeSpaceDetail from '@/pages/contribute/KnowledgeSpaceDetail';

const auth = vi.hoisted(() => ({ profileId: 'user-1' }));

const getKnowledgeSpace = vi.fn();
const getContributionProgram = vi.fn();
const listKnowledgeResources = vi.fn();
const listKnowledgeGaps = vi.fn();
const listResourceAttributionIdentities = vi.fn();
const listOwnedLinkedProfileIds = vi.fn();
const listManagedSolutionRecords = vi.fn();
const convertGapToOpportunity = vi.fn();
const convertGapToChallenge = vi.fn();
const createKnowledgeGap = vi.fn();
const resolveKnowledgeGap = vi.fn();

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
    profile: { id: auth.profileId },
  }),
}));

vi.mock('@/lib/agreements-api', () => ({
  listAgreementsForEntity: async () => [],
}));

vi.mock('@/lib/challenges-api', () => ({
  getContributionProgram: (...args: unknown[]) => getContributionProgram(...args),
}));

vi.mock('@/lib/knowledge-api', () => ({
  getKnowledgeSpace: (...args: unknown[]) => getKnowledgeSpace(...args),
  listKnowledgeResources: (...args: unknown[]) => listKnowledgeResources(...args),
  listKnowledgeGaps: (...args: unknown[]) => listKnowledgeGaps(...args),
  listResourceAttributionIdentities: (...args: unknown[]) => listResourceAttributionIdentities(...args),
  listManagedSolutionRecords: (...args: unknown[]) => listManagedSolutionRecords(...args),
  convertGapToOpportunity: (...args: unknown[]) => convertGapToOpportunity(...args),
  convertGapToChallenge: (...args: unknown[]) => convertGapToChallenge(...args),
  createKnowledgeGap: (...args: unknown[]) => createKnowledgeGap(...args),
  resolveKnowledgeGap: (...args: unknown[]) => resolveKnowledgeGap(...args),
  publishSolutionRecordAsResource: vi.fn(),
  setKnowledgeSpaceStatus: vi.fn(),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const space = {
  id: 'space-1',
  publisherProfileId: 'coord-1',
  programId: 'prog-1',
  title: 'Neighborhood practical knowledge',
  summary: 'Short reusable notes neighbors can actually use.',
  description: null,
  areaNodeId: null,
  status: 'shared',
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

const resource = {
  id: 'res-1',
  spaceId: 'space-1',
  publisherProfileId: 'coord-1',
  programId: 'prog-1',
  title: 'How to set up a surplus-food table',
  summary: 'A one-evening method for sharing leftover market food.',
  resourceType: 'guide',
  bodyText: null,
  externalUrl: null,
  relatedSkills: [],
  status: 'reviewed',
  reviewerNotes: 'Checked against two market evenings.',
  sourceEvidence: null,
  uncertaintyNotes: null,
  challengeId: null,
  opportunityId: null,
  solutionRecordId: null,
  pathwayOrder: 1,
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

const openGap = {
  id: 'gap-1',
  spaceId: 'space-1',
  publisherProfileId: 'coord-1',
  programId: 'prog-1',
  title: 'After-school session notes are still thin',
  description: 'Families still need a short, reusable plan for the first hour after school.',
  gapKind: 'weak',
  status: 'open',
  opportunityId: null,
  challengeId: null,
  resultResourceId: null,
  resultSolutionRecordId: null,
  resolutionNotes: null,
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

const linkedGap = {
  ...openGap,
  id: 'gap-2',
  title: 'Safe walking after dark is still undocumented',
  description: 'Neighbors still lack a short note on which streets stay dark.',
  opportunityId: 'opp-1',
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/contribute/knowledge/space-1']}>
      <Routes>
        <Route path="/contribute/knowledge/:spaceId" element={<KnowledgeSpaceDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('KnowledgeSpaceDetail', () => {
  beforeEach(() => {
    auth.profileId = 'user-1';
    getKnowledgeSpace.mockResolvedValue(space);
    getContributionProgram.mockResolvedValue({
      id: 'prog-1',
      publisherProfileId: 'coord-1',
      title: 'Shared Knowledge Challenge',
      summary: 'Collect practical neighborhood knowledge.',
      description: null,
      status: 'active',
      programKind: 'shared_knowledge',
      areaNodeId: null,
      seedKey: 'shared-knowledge-challenge',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    });
    listKnowledgeResources.mockResolvedValue([resource]);
    listKnowledgeGaps.mockResolvedValue([openGap, linkedGap]);
    listResourceAttributionIdentities.mockResolvedValue([
      {
        id: 'attr-1',
        resourceId: 'res-1',
        attributionKind: 'organization',
        profileId: null,
        organizationName: 'Neighborhood Health Circle',
        displayName: 'Neighborhood Health Circle',
      },
    ]);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
    listManagedSolutionRecords.mockResolvedValue([]);
    convertGapToOpportunity.mockResolvedValue('opp-2');
    convertGapToChallenge.mockResolvedValue('ch-2');
    createKnowledgeGap.mockResolvedValue('gap-3');
    resolveKnowledgeGap.mockResolvedValue(undefined);
  });

  it('lets participants browse resources, attribution, and linked gap work without coordinator controls', async () => {
    renderDetail();

    expect((await screen.findAllByText('How to set up a surplus-food table')).length).toBeGreaterThan(0);
    expect(screen.getByText('contribute.knowledge.resourceType.guide')).toBeInTheDocument();
    expect(screen.getByText('Neighborhood Health Circle')).toBeInTheDocument();
    expect(screen.getByText(/Shared Knowledge Challenge/)).toBeInTheDocument();
    expect(screen.getByText('contribute.knowledge.joinOpportunity')).toBeInTheDocument();
    expect(screen.queryByText('contribute.knowledge.convertOpportunity')).not.toBeInTheDocument();
    expect(screen.queryByText('contribute.knowledge.addResource')).not.toBeInTheDocument();
    expect(screen.queryByText(resource.reviewerNotes as string)).not.toBeInTheDocument();
  });

  it('lets coordinators convert a gap into an opportunity or challenge and add a new gap', async () => {
    auth.profileId = 'coord-1';
    renderDetail();

    expect(await screen.findByText('contribute.knowledge.addResource')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('contribute.knowledge.coordinateGap')[0]);
    expect(await screen.findByText('contribute.knowledge.convertOpportunity')).toBeInTheDocument();
    fireEvent.click(screen.getByText('contribute.knowledge.convertOpportunity'));
    await waitFor(() => {
      expect(convertGapToOpportunity).toHaveBeenCalledWith(
        'gap-1',
        expect.objectContaining({
          title: 'After-school session notes are still thin',
        }),
      );
    });

    // The conversion reloads the space; wait for that reload to finish so the next click
    // targets the re-rendered coordinator controls instead of nodes that are about to unmount.
    await waitFor(() => expect(getKnowledgeSpace).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('common.loading')).not.toBeInTheDocument());
    // Whether the coordinator panel stays open across the reload is a rendering detail;
    // only toggle it when it is currently collapsed.
    const coordinateTrigger = screen.getAllByText('contribute.knowledge.coordinateGap')[0].closest('button');
    if (coordinateTrigger?.getAttribute('aria-expanded') !== 'true') fireEvent.click(coordinateTrigger as HTMLElement);
    fireEvent.click(await screen.findByText('contribute.knowledge.convertChallenge'));
    await waitFor(() => {
      expect(convertGapToChallenge).toHaveBeenCalledWith(
        'gap-1',
        expect.objectContaining({
          problemStatement: 'Families still need a short, reusable plan for the first hour after school.',
        }),
      );
    });

    fireEvent.change(screen.getByLabelText('contribute.knowledge.titleLabel'), {
      target: { value: 'Garden watering notes are still missing' },
    });
    fireEvent.change(screen.getByLabelText('contribute.knowledge.gapDescription'), {
      target: { value: 'Beds dry out between volunteer visits and nobody has written the routine down.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'contribute.knowledge.addGap' }));
    await waitFor(() => {
      expect(createKnowledgeGap).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 'space-1',
          title: 'Garden watering notes are still missing',
        }),
      );
    });
  });
});
