import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'me' }, loading: false }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const hookState = {
  rows: [] as unknown[],
  filteredRows: [] as unknown[],
  summary: { providing: 0, active: 0, awaiting: 0, completed: 0 },
  filter: 'all',
  setFilter: vi.fn(),
  loading: false,
  error: null as string | null,
  backendMissing: false,
  refetch: vi.fn(),
};
vi.mock('@/lib/use-provider-earnings', () => ({ useProviderEarnings: () => hookState }));

import Earnings from '@/pages/Earnings';

describe('Earnings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState.filteredRows = [];
    hookState.summary = { providing: 0, active: 0, awaiting: 0, completed: 0 };
  });

  it('renders title, notice, summary and empty state', () => {
    render(<MemoryRouter><Earnings /></MemoryRouter>);
    expect(screen.getByText('earnings.pageTitle')).toBeTruthy();
    expect(screen.getByText('earnings.settlementNotice')).toBeTruthy();
    expect(screen.getByText('earnings.summaryProviding')).toBeTruthy();
    expect(screen.getByText('earnings.empty')).toBeTruthy();
  });

  it('lists agreements with the other party and the providing hint', () => {
    hookState.filteredRows = [{
      id: 'a1', title: 'Carpentry work', agreementType: 'employment', status: 'active', bucket: 'active', needsAction: false,
      createdAt: '2026-10-01T00:00:00Z', effectiveAt: null, endAt: null, executionMethod: null, summary: null, marketListingId: null,
      referenceCode: null, partyReference: null,
      parties: [{ displayName: 'Workshop', profileId: 'w', roleInAgreement: 'employer' }, { displayName: 'Me', profileId: 'me', roleInAgreement: 'employee' }],
    }];
    hookState.summary = { providing: 1, active: 1, awaiting: 0, completed: 0 };
    render(<MemoryRouter><Earnings /></MemoryRouter>);
    expect(screen.getByText('Carpentry work')).toBeTruthy();
    expect(screen.getByText(/Workshop/)).toBeTruthy();
    expect(screen.getByText('earnings.rowProvidingHint')).toBeTruthy();
  });
});
