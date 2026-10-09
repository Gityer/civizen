import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import AreaDetail from '@/pages/AreaDetail';
import Areas from '@/pages/Areas';

vi.mock('@/components/public/PublicPageShell', () => ({
  PublicPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const authState = { user: { id: 'member-1' } as null | { id: string } };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authState.user, profile: null }),
}));

vi.mock('@/components/public/PublicPageFooter', () => ({
  PublicPageFooter: () => <footer>Public footer</footer>,
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');

  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: async () => {},
      t: (key: string, vars?: Record<string, string | number>) =>
        translateMessage(baseTranslations, key, vars),
      getNode: (key: string) => key,
      languageOptions: [{ code: 'en', label: 'English' }],
      isLoadingLanguage: false,
    }),
  };
});

function renderAreas(path = '/areas') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/areas" element={<Areas />} />
        <Route path="/areas/:slug" element={<AreaDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('public Areas pages', () => {
  it('renders the current Area model on /areas', () => {
    renderAreas();
    expect(screen.getByRole('heading', { level: 1, name: 'Areas' })).toBeInTheDocument();
    expect(screen.getByText('What Civizen is working on.')).toBeInTheDocument();
    for (const name of ['Health', 'Education', 'Culture', 'Responsibility', 'Environment']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('link', { name: /explore/i })).toHaveLength(5);
    expect(screen.queryByText(/taxonomy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/foundational_areas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/P0/)).not.toBeInTheDocument();
  });

  it('navigates from an Area card to the Area detail route', () => {
    renderAreas();
    const educationExplore = screen.getByRole('link', { name: 'Explore Education' });
    expect(educationExplore).toHaveAttribute('href', '/areas/education');
  });

  it('shows Study as a related system on Education, not as an initiative', () => {
    renderAreas('/areas/education');
    expect(screen.getByRole('heading', { level: 1, name: 'Education' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current Civizen systems' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Study' })).toBeInTheDocument();
    expect(screen.queryByText('No public initiatives are listed here yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('In Development')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contribute' })).toHaveAttribute('href', '/contribute');
    expect(screen.getByRole('link', { name: 'Partner with us' })).toHaveAttribute(
      'href',
      '/fund/institutional?area=education',
    );
  });

  it('uses an empty state for Health and still offers help actions', () => {
    renderAreas('/areas/health');
    expect(screen.getByText('No public initiatives are listed here yet.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Current Civizen systems' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contribute' })).toHaveAttribute('href', '/contribute');
    expect(screen.getByRole('link', { name: 'Partner with us' })).toHaveAttribute(
      'href',
      '/fund/institutional?area=health',
    );
  });

  it('lists Governance Solutions as an initiative, not Civic Voting', () => {
    renderAreas('/areas/responsibility');
    expect(screen.getByRole('heading', { name: 'Governance Solutions' })).toBeInTheDocument();
    expect(screen.getByText('In Development')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Governance Solutions' })).toHaveAttribute(
      'href',
      '/governance/solutions',
    );
    expect(screen.getByRole('link', { name: 'Create agreement' })).toHaveAttribute(
      'href',
      expect.stringContaining('/agreements/new?'),
    );
    expect(screen.getByRole('heading', { name: 'Civic Voting' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current Civizen systems' })).toBeInTheDocument();
    expect(screen.queryByText('Seeking Funding')).not.toBeInTheDocument();
    expect(screen.queryByText(/validation/i)).not.toBeInTheDocument();
  });

  it('handles an unknown Area slug without exposing internal lists', () => {
    renderAreas('/areas/not-a-real-area');
    expect(screen.getByRole('heading', { name: 'Area not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Areas' })).toHaveAttribute('href', '/areas');
  });

  it('sends a guest to sign in before Contribute and links members straight through', () => {
    authState.user = null;
    const { unmount } = renderAreas('/areas/education');
    expect(screen.getByRole('link', { name: 'Contribute' }).getAttribute('href')).toBe('/login');
    unmount();

    authState.user = { id: 'member-1' };
    renderAreas('/areas/education');
    expect(screen.getByRole('link', { name: 'Contribute' }).getAttribute('href')).toBe('/contribute');
  });
});
