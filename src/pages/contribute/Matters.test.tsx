import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Matters from '@/pages/contribute/Matters';

const listMatters = vi.fn();
const listPublicMatters = vi.fn();
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

vi.mock('@/lib/matters-api', () => ({
  listMatters: (...args: unknown[]) => listMatters(...args),
  listPublicMatters: (...args: unknown[]) => listPublicMatters(...args),
}));

vi.mock('@/lib/classification', () => ({
  listCurrentAreas: () => [{ id: 'area-education', displayName: 'Education' }],
}));

vi.mock('@/lib/geo-locations', () => ({
  listGeoCountryCodes: () => ['AM', 'US'],
}));

vi.mock('@/lib/countries', () => ({
  getCountryName: (code: string) => (code === 'AM' ? 'Armenia' : code),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Matters list', () => {
  beforeEach(() => {
    listMatters.mockReset();
    listPublicMatters.mockReset();
    listPublicMatters.mockResolvedValue([]);
    listOwnedLinkedProfileIds.mockReset();
    listOwnedLinkedProfileIds.mockResolvedValue([]);
    listMatters.mockResolvedValue([
      {
        matter: {
          id: 'mat-1',
          title: 'How do Areas work?',
          description: 'Please explain.',
          matterType: 'question',
          lifecycleStatus: 'active',
          visibility: 'participants',
          areaNodeId: null,
          initiator: { kind: 'person', profileId: 'user-1', displayName: 'You' },
          addressee: { kind: 'organization', profileId: 'org-1', displayName: 'Civizen Product Team' },
          responsible: { kind: 'organization', profileId: 'org-1', displayName: 'Civizen Product Team' },
          currentActionId: 'act-1',
          waitingCondition: null,
          closeKind: null,
          closeReason: null,
          createdByProfileId: 'user-1',
          createdAt: '2026-09-01T12:00:00.000Z',
          submittedAt: '2026-09-01T12:00:00.000Z',
          closedAt: null,
          lastReopenedAt: null,
          reopenCount: 0,
          updatedAt: '2026-09-01T12:00:00.000Z',
          collaborativeWorkStartedAt: null,
          collaborativeWorkCompletedAt: null,
          collaborativeWorkCompletionKind: null,
          collaborativeWorkCompletionReason: null,
        },
        currentAction: {
          id: 'act-1',
          matterId: 'mat-1',
          actionType: 'respond',
          assignedActor: { kind: 'organization', profileId: 'org-1', displayName: 'Civizen Product Team' },
          createdAt: '2026-09-01T12:00:00.000Z',
          dueAt: '2026-09-04T12:00:00.000Z',
          reminderAt: '2026-09-03T12:00:00.000Z',
          timingPolicyId: 'question_response',
          status: 'pending',
          completedAt: null,
          completedBy: null,
          completionAction: null,
          timeoutAction: 'remind',
          escalationPolicyId: null,
          contextKind: 'matter',
          contextId: null,
        },
        pendingActions: [],
        workSummary: null,
        derivedStatus: 'waiting_for_response',
        ball: {
          headline: 'Waiting on Civizen Product Team',
          detail: 'Review this Matter and respond.',
          dueLine: 'Response due September 4.',
          requiredFromViewer: false,
        },
      },
    ]);
  });

  it('shows Needs your action and ball-is-with copy on cards', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/matters?view=needs_action']}>
        <Matters />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('How do Areas work?')).toBeInTheDocument();
    });
    expect(listMatters).toHaveBeenCalledWith('needs_action', 'user-1', []);
    expect(listPublicMatters).not.toHaveBeenCalled();
    expect(screen.getByText('Waiting on Civizen Product Team')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.matters.create')).toBeInTheDocument();
  });

  it('lands on the public list, shows scope and Area on cards, and searches on the server', async () => {
    const [row] = await listMatters.getMockImplementation()!();
    listPublicMatters.mockResolvedValue([
      {
        ...row,
        matter: {
          ...row.matter,
          id: 'mat-public',
          title: 'Shade trees for bus stops',
          visibility: 'public',
          areaNodeId: 'area-education',
          scopeKind: 'locality',
          scopeCountryCode: 'AM',
          scopeRegionCode: 'ER',
          scopeLocalityCode: 'Yerevan',
        },
        ball: null,
      },
    ]);
    render(
      <MemoryRouter>
        <Matters />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Shade trees for bus stops')).toBeInTheDocument();
    });
    expect(listMatters).not.toHaveBeenCalled();
    expect(listPublicMatters).toHaveBeenLastCalledWith(
      { search: '', areaNodeId: '', scopeCountryCode: '', matterType: '' },
      'user-1',
      [],
    );
    expect(screen.getByText(/Armenia · ER · Yerevan · Education/)).toBeInTheDocument();
    expect(screen.getByTestId('public-matters-filters')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('contribute.matters.publicSearchPlaceholder'), { target: { value: 'shade' } });
    await waitFor(() => {
      expect(listPublicMatters).toHaveBeenLastCalledWith(
        { search: 'shade', areaNodeId: '', scopeCountryCode: '', matterType: '' },
        'user-1',
        [],
      );
    });
  });

  it('explains an empty filtered public list differently from an empty public list', async () => {
    listPublicMatters.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <Matters />
      </MemoryRouter>,
    );
    expect(await screen.findByText('contribute.matters.empty.public')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('contribute.matters.publicSearchPlaceholder'), { target: { value: 'zzz' } });
    expect(await screen.findByText('contribute.matters.empty.publicFiltered')).toBeInTheDocument();
  });
});
