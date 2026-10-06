import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const recordInsightAction = vi.fn(async (..._args: unknown[]) => undefined);

const fixtures = vi.hoisted(() => ({
  mode: 'qualifying' as 'qualifying' | 'suppressed' | 'unauthorized' | 'empty',
}));

vi.mock('@/lib/happiness/insights', async () => {
  const actual = await vi.importActual<typeof import('@/lib/happiness/insights')>('@/lib/happiness/insights');
  const qualifyingSnapshots = [
    {
      kind: 'insight' as const,
      scopeId: 'scope-org-1',
      topic: 'domain_state' as const,
      domain: 'relationships_belonging' as const,
      timeBucket: 'quarter' as const,
      periodStart: '2026-04-01',
      summary: 'Relationships & Belonging appears generally strong among participating members in this qualifying group.',
      sufficiency: 'sufficient' as const,
      confidence: 'moderate' as const,
      sourceTypes: ['structured_domain_state'],
      privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
      aggregationModelVersion: 'wellbeing-aggregate-v1',
      suppression: null,
      participation: 'sufficient' as const,
      groupedDistribution: { flourishing: 'shown' as const, thriving: 'shown' as const },
    },
    {
      kind: 'insight' as const,
      scopeId: 'scope-org-1',
      topic: 'domain_state' as const,
      domain: 'time_life_balance' as const,
      timeBucket: 'quarter' as const,
      periodStart: '2026-04-01',
      summary: 'Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.',
      sufficiency: 'sufficient' as const,
      confidence: 'moderate' as const,
      sourceTypes: ['structured_domain_state'],
      privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
      aggregationModelVersion: 'wellbeing-aggregate-v1',
      suppression: null,
      participation: 'sufficient' as const,
      groupedDistribution: { struggling: 'shown' as const, flourishing: 'grouped' as const },
    },
    {
      kind: 'insight' as const,
      scopeId: 'scope-org-1',
      topic: 'factor_category' as const,
      domain: 'time_life_balance' as const,
      timeBucket: 'quarter' as const,
      periodStart: '2026-04-01',
      summary: 'Transportation is frequently selected as a factor associated with Time & Life Balance concerns among participating members in this qualifying group.',
      sufficiency: 'sufficient' as const,
      confidence: 'moderate' as const,
      sourceTypes: ['structured_factor'],
      privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
      aggregationModelVersion: 'wellbeing-aggregate-v1',
      suppression: null,
      participation: 'sufficient' as const,
    },
    {
      kind: 'insight' as const,
      scopeId: 'scope-org-1',
      topic: 'intervention_helpfulness' as const,
      domain: 'time_life_balance' as const,
      timeBucket: 'quarter' as const,
      periodStart: '2026-04-01',
      summary: 'Flexible scheduling actions were commonly reported as helpful among qualifying participants who tried this type of change.',
      sufficiency: 'sufficient' as const,
      confidence: 'low' as const,
      sourceTypes: ['structured_helpfulness'],
      privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
      aggregationModelVersion: 'wellbeing-aggregate-v1',
      suppression: null,
      participation: 'sufficient' as const,
    },
  ];
  return {
    ...actual,
    listViewableInsightScopes: async () => {
      if (fixtures.mode === 'empty') return [];
      if (fixtures.mode === 'unauthorized') {
        return [{ id: 'scope-org-1', kind: 'organization' as const, enabled: true, viewerProfileIds: ['other'], label: 'Demo organization' }];
      }
      return [{ id: 'scope-org-1', kind: 'organization' as const, enabled: true, viewerProfileIds: ['profile-1'], label: 'Demo organization' }];
    },
    listScopeSnapshots: async () => {
      if (fixtures.mode === 'suppressed') {
        return [
          {
            kind: 'suppressed' as const,
            reason: 'cohort_too_small' as const,
            privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
            aggregationModelVersion: 'wellbeing-aggregate-v1',
            summary: 'This insight is unavailable because the privacy requirements for this group are not currently met.',
          },
        ];
      }
      return qualifyingSnapshots;
    },
    listScopeCandidates: async () =>
      fixtures.mode === 'qualifying'
        ? [
            {
              id: 'cand-1',
              scopeId: 'scope-org-1',
              domain: 'time_life_balance' as const,
              factorCategory: 'transportation',
              status: 'established_pattern' as const,
              evidencePeriods: 3,
              summary: 'Time & Life Balance appears as a recurring pattern across several qualifying periods.',
              privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
              patternModelVersion: 'systemic-pattern-v1',
              publishesChallenge: false as const,
              publishesGovernance: false as const,
            },
          ]
        : [],
    listBrowsableEfforts: async () =>
      fixtures.mode === 'qualifying'
        ? [{ entityType: 'challenge' as const, entityId: 'c1', title: 'Local Transit Access Challenge', path: '/contribute/challenges/c1' }]
        : [],
    recordInsightAction: (...args: unknown[]) => recordInsightAction(...args),
    requestWellbeingAggregate: async () =>
      fixtures.mode === 'suppressed'
        ? {
            kind: 'suppressed' as const,
            reason: 'cohort_too_small' as const,
            privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
            aggregationModelVersion: 'wellbeing-aggregate-v1',
            summary: 'This insight is unavailable because the privacy requirements for this group are not currently met.',
          }
        : qualifyingSnapshots[1],
  };
});

vi.mock('@/lib/happiness/outcomes', async () => {
  const actual = await vi.importActual<typeof import('@/lib/happiness/outcomes')>('@/lib/happiness/outcomes');
  return {
    ...actual,
    listHumanOutcomeReviews: async () => [],
    listPublicOutcomeLessons: async () => [],
  };
});

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/happiness/aggregate/api', () => ({
  requestWellbeingAggregate: async () =>
    fixtures.mode === 'suppressed'
      ? {
          kind: 'suppressed',
          reason: 'cohort_too_small',
          privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
          aggregationModelVersion: 'wellbeing-aggregate-v1',
          summary: 'This insight is unavailable because the privacy requirements for this group are not currently met.',
        }
      : {
          kind: 'insight',
          scopeId: 'scope-org-1',
          topic: 'domain_state',
          domain: 'time_life_balance',
          timeBucket: 'quarter',
          periodStart: '2026-04-01',
          summary: 'Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.',
          sufficiency: 'sufficient',
          confidence: 'moderate',
          sourceTypes: ['structured_domain_state'],
          privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
          aggregationModelVersion: 'wellbeing-aggregate-v1',
          suppression: null,
          participation: 'sufficient',
        },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'profile-1', user_id: 'user-1' }, loading: false }),
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

import WellbeingInsights from '@/pages/wellbeing/WellbeingInsights';

describe('Wellbeing Insights page', () => {
  beforeEach(() => {
    fixtures.mode = 'qualifying';
    recordInsightAction.mockClear();
  });

  it('renders Overview, Patterns, and Action without scores, ranks, or participant lists', async () => {
    const overview = render(
      <MemoryRouter>
        <WellbeingInsights />
      </MemoryRouter>,
    );
    await screen.findByText('Wellbeing Insights');
    fireEvent.click(screen.getByText('How this works'));
    expect(screen.getByText(/Individual Happiness & Fulfillment records remain private/i)).toBeTruthy();
    expect(await screen.findByText('Going well')).toBeTruthy();
    expect(screen.getByText('Needs attention')).toBeTruthy();
    fireEvent.click(screen.getByText('Time & Life Balance'));
    await waitFor(() => expect(screen.getByText(/Frequently associated factors/i)).toBeTruthy());
    overview.unmount();

    const patterns = render(
      <MemoryRouter initialEntries={['/wellbeing-insights?section=patterns&candidate=cand-1']}>
        <WellbeingInsights />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Established patterns')).toBeTruthy();
    expect((await screen.findAllByText(/recurring pattern across several qualifying periods/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText('auto-published')).toBeNull();
    expect(screen.getByText(/Nothing is published automatically/i)).toBeTruthy();
    patterns.unmount();

    render(
      <MemoryRouter initialEntries={['/wellbeing-insights?section=action&candidate=cand-1&domain=time_life_balance']}>
        <WellbeingInsights />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/not proof that the action caused/i)).toBeTruthy();
    expect(screen.getByText(/View existing effort/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Investigate further' }));
    await waitFor(() => expect(recordInsightAction).toHaveBeenCalled());
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Happiness Score|league table|Participants|member-0/);
  });

  it('shows a calm suppression state without exact low counts', async () => {
    fixtures.mode = 'suppressed';
    render(
      <MemoryRouter>
        <WellbeingInsights />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Not enough qualifying information yet')).toBeTruthy();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/\b(3|5|12) members\b/i);
    expect(body).not.toMatch(/Happiness Score/);
    expect(screen.queryByRole('tab', { name: 'Overview' })).toBeNull();
  });

  it('hides insights from unauthorized viewers', async () => {
    fixtures.mode = 'unauthorized';
    render(
      <MemoryRouter>
        <WellbeingInsights />
      </MemoryRouter>,
    );
    expect((await screen.findAllByText('This wellbeing insight is not available.')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Going well')).toBeNull();
  });
});
