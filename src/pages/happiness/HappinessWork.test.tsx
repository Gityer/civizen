import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const saveWorkContext = vi.fn(async (..._args: unknown[]) => ({
  id: 'ctx-1',
  profileId: 'profile-1',
  roleTitle: 'Facilitator',
  organizationOrContext: null,
  workType: 'employed',
  startDate: null,
  hoursPattern: null,
  locationMode: 'hybrid',
  isPrimary: true,
  description: null,
  status: 'current',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));
const saveWorkAssessment = vi.fn(async (..._args: unknown[]) => ({ id: 'a1' }));
const saveWorkJoyEntry = vi.fn(async (..._args: unknown[]) => ({ id: 'j1' }));
const saveWorkFulfillmentProfile = vi.fn(async (..._args: unknown[]) => undefined);
const updateWorkInterventionStatus = vi.fn(async (..._args: unknown[]) => undefined);

vi.mock('@/lib/work-fulfillment/api', () => ({
  saveWorkContext: (...args: unknown[]) => saveWorkContext(...args),
  saveWorkAssessment: (...args: unknown[]) => saveWorkAssessment(...args),
  saveWorkJoyEntry: (...args: unknown[]) => saveWorkJoyEntry(...args),
  saveWorkFulfillmentProfile: (...args: unknown[]) => saveWorkFulfillmentProfile(...args),
  saveShareablePreferences: vi.fn(async () => undefined),
}));

vi.mock('@/lib/work-fulfillment/persist', () => ({
  recordWorkImprovementAction: vi.fn(async () => ({ id: 'i1' })),
  saveRecommendationFeedback: vi.fn(async () => undefined),
  saveWorkExploration: vi.fn(async () => ({ id: 'e1' })),
  saveWorkTrialLink: vi.fn(async () => undefined),
  saveWorkTransitionPath: vi.fn(async () => ({ id: 't1', target: 'Learning Facilitator' })),
  saveWorkFollowUp: vi.fn(async () => ({ id: 'f1' })),
  updateWorkInterventionStatus: (...args: unknown[]) => updateWorkInterventionStatus(...args),
}));

vi.mock('@/lib/happiness/api', () => ({
  recordActionOutcome: vi.fn(async () => undefined),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOpenOpportunities: async () => [],
}));

const workspaceResult = {
  profile: null as Record<string, unknown> | null,
  contexts: [] as Array<Record<string, unknown>>,
  assessments: [] as Array<Record<string, unknown>>,
  joyEntries: [] as Array<Record<string, unknown>>,
  shareable: { profileId: 'profile-1', approved: false, activitiesSought: [], roleTypesSought: [], environment: {}, locationMode: null, scheduleNote: null, updatedAt: new Date().toISOString() },
  feedback: [] as Array<Record<string, unknown>>,
  interventions: [] as Array<Record<string, unknown>>,
  explorations: [] as Array<Record<string, unknown>>,
  transitions: [] as Array<Record<string, unknown>>,
  followUps: [] as Array<Record<string, unknown>>,
  actions: [] as Array<Record<string, unknown>>,
  outcomes: [] as Array<Record<string, unknown>>,
  backendMissing: false,
};

vi.mock('@/lib/work-fulfillment/use-work-fulfillment', () => ({
  useWorkFulfillmentWorkspace: () => ({
    result: workspaceResult,
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));

vi.mock('@/lib/happiness/workspace', async () => {
  const actual = await vi.importActual<typeof import('@/lib/happiness/workspace')>('@/lib/happiness/workspace');
  return {
    ...actual,
    loadHappinessWorkDomainSummary: async () => ({ workLevel: 'balanced', trendDirection: 'improving' }),
  };
});

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'profile-1', user_id: 'user-1' },
    loading: false,
  }),
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    }),
  };
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

import HappinessWork from '@/pages/happiness/HappinessWork';

describe('Work Fulfillment workspace', () => {
  beforeEach(() => {
    saveWorkContext.mockClear();
    saveWorkJoyEntry.mockClear();
    saveWorkFulfillmentProfile.mockClear();
    updateWorkInterventionStatus.mockClear();
    workspaceResult.contexts = [];
    workspaceResult.interventions = [];
    workspaceResult.actions = [];
    workspaceResult.followUps = [];
  });

  it('shows five-level Work Fulfillment language and no numeric score', async () => {
    render(
      <MemoryRouter>
        <HappinessWork />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Work Fulfillment' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'This is private to you.' })).toHaveAttribute('href', '/happiness/privacy');
    expect(screen.getByText('Balanced')).toBeTruthy();
    expect(screen.queryByText(/tools are being prepared/i)).toBeNull();
    expect(screen.getByText('There is no Work Fulfillment score.')).toBeTruthy();
    for (const label of ['Overview', 'Current', 'Joy', 'Fit', 'Improve']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
  });

  it('saves a current work context from Current', async () => {
    render(
      <MemoryRouter initialEntries={['/happiness/work?section=current']}>
        <Routes>
          <Route path="/happiness/work" element={<HappinessWork />} />
        </Routes>
      </MemoryRouter>,
    );
    const role = await screen.findByLabelText('Role or title');
    fireEvent.click(role);
    fireEvent.change(role, { target: { value: 'Facilitator' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save work context' }));
    await waitFor(() => expect(saveWorkContext).toHaveBeenCalled());
  });

  it('records a Work Joy observation with an activity tag', async () => {
    render(
      <MemoryRouter initialEntries={['/happiness/work?section=joy']}>
        <Routes>
          <Route path="/happiness/work" element={<HappinessWork />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Energizing' }));
    const doing = screen.getByLabelText('What were you doing?');
    fireEvent.change(doing, { target: { value: 'mentoring' } });
    fireEvent.click(screen.getByRole('button', { name: 'Teaching' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Work Joy' }));
    await waitFor(() => expect(saveWorkJoyEntry).toHaveBeenCalled());
    expect(saveWorkJoyEntry.mock.calls[0]?.[1]).toMatchObject({ feeling: 'energizing', activity: 'mentoring' });
  });

  it('lets a member switch the primary work context', async () => {
    workspaceResult.contexts = [
      {
        id: 'ctx-employed',
        profileId: 'profile-1',
        roleTitle: 'Facilitator',
        organizationOrContext: null,
        workType: 'employed',
        startDate: null,
        hoursPattern: null,
        locationMode: 'hybrid',
        isPrimary: true,
        description: null,
        status: 'current',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ctx-volunteer',
        profileId: 'profile-1',
        roleTitle: 'Neighborhood mentor',
        organizationOrContext: null,
        workType: 'volunteer',
        startDate: null,
        hoursPattern: null,
        locationMode: null,
        isPrimary: false,
        description: null,
        status: 'current',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    render(
      <MemoryRouter initialEntries={['/happiness/work?section=current']}>
        <Routes>
          <Route path="/happiness/work" element={<HappinessWork />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Neighborhood mentor')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Make Neighborhood mentor primary' }));
    await waitFor(() => expect(saveWorkContext).toHaveBeenCalled());
    expect(saveWorkContext.mock.calls[0]?.[1]).toMatchObject({ id: 'ctx-volunteer', isPrimary: true, workType: 'volunteer' });
  });

  it('saves environment, autonomy, and lifestyle fit preferences', async () => {
    render(
      <MemoryRouter initialEntries={['/happiness/work?section=fit']}>
        <Routes>
          <Route path="/happiness/work" element={<HappinessWork />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Mostly individual' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'A lot' })[0]!);
    const lifestyle = screen.getByLabelText('Schedule or lifestyle notes (optional)');
    fireEvent.change(lifestyle, { target: { value: 'School pickup at 15:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveWorkFulfillmentProfile).toHaveBeenCalled());
    expect(saveWorkFulfillmentProfile.mock.calls[0]?.[0]).toMatchObject({
      environment: { individualVsTeam: 'individual' },
      autonomy: { methods: 'high' },
      lifestyle: { scheduleNote: 'School pickup at 15:00' },
    });
  });

  it('moves a tracked action from planned to in progress', async () => {
    workspaceResult.interventions = [
      {
        id: 'int-1',
        profileId: 'profile-1',
        actionId: 'act-1',
        ladderStep: 'redesign_tasks',
        area: 'task_mix',
        desiredChange: 'Less reporting',
        status: 'planned',
        createdAt: new Date().toISOString(),
      },
    ];
    workspaceResult.actions = [{ id: 'act-1', title: 'Spend more time mentoring', why: 'Task mix' }];
    render(
      <MemoryRouter initialEntries={['/happiness/work?section=improve']}>
        <Routes>
          <Route path="/happiness/work" element={<HappinessWork />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Planned')).toBeTruthy();
    expect(screen.queryByText('Did this change improve your work experience?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await waitFor(() => expect(updateWorkInterventionStatus).toHaveBeenCalledWith('profile-1', 'int-1', 'in_progress'));
  });
});
