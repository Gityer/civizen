import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import MatterForm from '@/pages/contribute/MatterForm';
import MatterDetail from '@/pages/contribute/MatterDetail';

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
    profile: { id: 'user-1', full_name: 'User One' },
  }),
}));

vi.mock('@/lib/matters-api', () => ({
  listManagedMatterActors: async () => [],
  searchMatterActors: async () => [],
  resolveOfficialCivizenMatterActor: async () => ({
    profileId: 'civizen-org',
    displayName: 'Civizen',
    kind: 'organization',
  }),
  createMatterRecord: async () => 'mat-1',
  uploadMatterFile: async () => ({ path: 'x', name: 'x' }),
  getMatterDetail: async () => null,
  addMatterComment: async () => undefined,
  performMatterFormalAction: async () => undefined,
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: async () => [],
}));

vi.mock('@/lib/classification', () => ({
  listCurrentAreas: () => [],
}));

vi.mock('@/lib/geo-locations', () => ({
  listGeoCountryCodes: () => ['US', 'AM'],
  listGeoRegions: async () => [{ code: 'ER', name: 'Yerevan' }],
  listGeoCities: async () => ['Yerevan'],
}));

vi.mock('@/lib/countries', () => ({
  getCountryName: (code: string) => code,
}));

describe('Matter pages', () => {
  it('renders the create form with outlined title, recipient, and geographic scope fields', async () => {
    render(
      <MemoryRouter>
        <MatterForm />
      </MemoryRouter>,
    );
    expect(await screen.findByText('contribute.matters.newTitle')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.matters.titleLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.matters.recipientLabel')).toBeInTheDocument();
    expect(screen.getByText('contribute.matters.scopeLabel')).toBeInTheDocument();
    expect(screen.getByText('contribute.matters.scope.global')).toBeInTheDocument();
    expect(screen.getByText('contribute.matters.areaNone')).toBeInTheDocument();
  });

  it('renders a missing-state detail page without crashing', async () => {
    render(
      <MemoryRouter>
        <MatterDetail />
      </MemoryRouter>,
    );
    expect(await screen.findByText('contribute.matters.missingTitle')).toBeInTheDocument();
  });

  it('lets a member address the Matter to the Civizen community without naming a person', async () => {
    render(
      <MemoryRouter>
        <MatterForm />
      </MemoryRouter>,
    );
    const button = await screen.findByTestId('matter-recipient-community');
    expect(screen.getByText('contribute.matters.recipientCommunityHint')).toBeInTheDocument();
    fireEvent.click(button);
    expect(await screen.findByText('Civizen')).toBeInTheDocument();
    expect(screen.queryByTestId('matter-recipient-community')).toBeNull();
  });

  it('preselects Suggestion for the Suggest Improvements shortcut', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/matters/new?intent=improvement']}>
        <MatterForm />
      </MemoryRouter>,
    );
    expect(await screen.findByText('contribute.matters.improvementHint')).toBeInTheDocument();
    expect(await screen.findByText('Civizen')).toBeInTheDocument();
  });
});
