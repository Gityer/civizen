import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const saveQuickCheckIn = vi.fn(async (..._args: unknown[]) => ({
  id: 'c1',
  profileId: 'profile-1',
  feeling: 'good',
    affectingMost: null,
    areas: [],
    note: null,
  createdAt: new Date().toISOString(),
}));

vi.mock('@/lib/happiness/api', () => ({
  saveQuickCheckIn: (...args: unknown[]) => saveQuickCheckIn(...args),
  loadHappinessWorkspace: async () => ({
    view: {
      modelVersion: 'happiness-level-v1',
      overallLevel: null,
      trend: { direction: 'unknown' },
      confidence: 'insufficient',
      strongestDomains: [],
      attentionDomains: [],
      domainLevels: {},
      latestCheckIn: null,
      pendingFollowUp: null,
      observationCount: 0,
      computedAt: new Date().toISOString(),
    },
    privacy: {
      profileId: 'profile-1',
      checkinsEnabled: true,
      recommendationsEnabled: true,
      optionalSharingEnabled: false,
      updatedAt: new Date().toISOString(),
    },
    checkIns: [],
    pulses: [],
    reviews: [],
    causes: [],
    actions: [],
    outcomes: [],
    selections: [],
    backendMissing: false,
  }),
}));

vi.mock('@/lib/happiness/fulfillment/api', () => ({
  listFulfillmentPlans: async () => [],
}));

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

import Happiness from '@/pages/happiness/Happiness';
import HappinessCheckIn from '@/pages/happiness/HappinessCheckIn';

describe('Happiness pages', () => {
  beforeEach(() => {
    saveQuickCheckIn.mockClear();
  });

  it('shows five-level language without a numeric happiness score', async () => {
    render(
      <MemoryRouter initialEntries={['/happiness']}>
        <Happiness />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Happiness & Fulfillment' })).toBeTruthy();
    expect(screen.queryByTestId('app-page-header-back')).toBeNull();
    expect(screen.getByRole('link', { name: 'This is private to you.' })).toHaveAttribute('href', '/happiness/privacy');
    expect(screen.queryByText(/happiness score/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Improve an area' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Privacy' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Improvement' })).toBeNull();
    for (const label of ['Overview', 'Life areas', 'Check-ins', 'Trends', 'Improve']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
  });

  it('lets a member check in from the Check-ins tab', async () => {
    render(
      <MemoryRouter initialEntries={['/happiness?section=checkins']}>
        <Happiness />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Happiness & Fulfillment' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Check-ins' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('button', { name: 'Check in' })).toBeTruthy();
    expect(screen.getByText('No check-ins yet.')).toBeTruthy();
  });

  it('saves a feeling-only check-in from the first page', async () => {
    render(
      <MemoryRouter>
        <HappinessCheckIn />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
    await waitFor(() =>
      expect(saveQuickCheckIn).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({ feeling: 'good', areas: [], tags: [] }),
      ),
    );
  });

  it('completes a quick check-in with click then type', async () => {
    render(
      <MemoryRouter>
        <HappinessCheckIn />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Good' }));
    fireEvent.click(screen.getByRole('button', { name: 'Something else' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Helping' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const note = screen.getByLabelText('Want to add anything?') as HTMLTextAreaElement;
    fireEvent.click(note);
    note.focus();
    fireEvent.change(note, { target: { value: 'walked outside' } });
    expect(note.value).toContain('walked');
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
    await waitFor(() => expect(saveQuickCheckIn).toHaveBeenCalled());
  });

  it('lets a member mark more than one area and a specific work cause', async () => {
    render(
      <MemoryRouter>
        <HappinessCheckIn />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Okay' }));
    fireEvent.click(screen.getByRole('button', { name: 'Work' }));
    fireEvent.click(screen.getByRole('button', { name: 'Relationships' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Making things harder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Helping' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Workload' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save check-in' }));
    await waitFor(() =>
      expect(saveQuickCheckIn).toHaveBeenCalledWith(
        'profile-1',
        expect.objectContaining({
          feeling: 'okay',
          areas: [
            { category: 'work', polarity: 'problem' },
            { category: 'relationships', polarity: 'support' },
          ],
          tags: expect.arrayContaining([
            { category: 'work', polarity: 'problem', tag: 'tasks' },
            { category: 'work', polarity: 'problem', tag: 'workload' },
          ]),
        }),
      ),
    );
  });
});
