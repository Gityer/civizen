import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import Market from '@/pages/Market';
import { writeLastMarketSection } from '@/lib/market-section-memory';

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({
    children,
    hideTopChrome,
  }: {
    children: React.ReactNode;
    hideTopChrome?: boolean;
  }) => (
    <div data-testid="app-layout" data-hide-top-chrome={hideTopChrome ? 'true' : 'false'}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/layout/UserPageMenu', () => ({
  UserPageMenu: () => <button type="button" data-testid="user-page-menu-trigger" aria-label="Open your page menu" />,
}));

vi.mock('@/components/market/MarketJobsInterestForm', () => ({
  MarketJobsInterestForm: () => <div data-testid="market-jobs-interest-form" />,
}));

vi.mock('@/components/public/PublicLanguageSelect', () => ({
  PublicLanguageSelect: () => <button type="button" aria-label="Language" />,
}));

vi.mock('@/components/public/PublicThemeToggle', () => ({
  PublicThemeToggle: () => <button type="button" aria-label="Theme" />,
}));

vi.mock('@/hooks/usePageSecondaryNav', () => ({
  usePageSecondaryNav: () => {},
}));

vi.mock('@/lib/use-market-published-listings', () => ({
  useMarketPublishedListings: () => ({
    listings: [],
    loading: false,
    error: null,
    refetch: () => {},
  }),
  useMarketMyPublishedListings: () => ({
    listings: [],
    loading: false,
    error: null,
    refetch: () => {},
  }),
}));

const authState = {
  user: { id: 'user-1' } as { id: string } | null,
  loading: false,
  profile: { id: 'profile-1', full_name: 'Test User', avatar_url: null } as {
    id: string;
    full_name: string;
    avatar_url: null;
  } | null,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: async () => {},
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
      getNode: (key: string) => key,
      languageOptions: [{ code: 'en', label: 'English' }],
      isLoadingLanguage: false,
    }),
  };
});

describe('Market', () => {
  beforeEach(() => {
    window.localStorage.clear();
    authState.user = { id: 'user-1' };
    authState.loading = false;
    authState.profile = { id: 'profile-1', full_name: 'Test User', avatar_url: null };
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('hides app-wide top chrome and keeps Profile in the page header', async () => {
    render(
      <MemoryRouter initialEntries={['/market']}>
        <Market />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-layout')).toHaveAttribute('data-hide-top-chrome', 'true');
    expect(await screen.findByTestId('user-page-menu-trigger')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agreements' })).toBeInTheDocument();
  });

  it('restores the remembered section when For you has nothing new', async () => {
    writeLastMarketSection('local');

    render(
      <MemoryRouter initialEntries={['/market']}>
        <Market />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Local', level: 2 })).toBeInTheDocument();
  });

  it('shows the Jobs interest form instead of specialists copy', async () => {
    writeLastMarketSection('jobs');

    render(
      <MemoryRouter initialEntries={['/market']}>
        <Market />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('market-jobs-interest-form')).toBeInTheDocument();
    expect(screen.getByTestId('market-page-title')).toHaveTextContent('Marketplace / Jobs');
    expect(screen.queryByText(/transactional specialist help/i)).not.toBeInTheDocument();
  });

  it('toggles the listing search bar from the Search icon', async () => {
    render(
      <MemoryRouter initialEntries={['/market']}>
        <Market />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('market-listing-search-bar')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('market-listing-search-toggle'));
    expect(screen.getByTestId('market-listing-search-bar')).toBeInTheDocument();
  });

  it('shows public Jobs chrome for guests', async () => {
    authState.user = null;
    authState.profile = null;
    writeLastMarketSection('jobs');

    render(
      <MemoryRouter initialEntries={['/market']}>
        <Market />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('market-jobs-interest-form')).toBeInTheDocument();
    expect(screen.getByTestId('market-page-title')).toHaveTextContent('Marketplace / Jobs');
    expect(screen.getByTestId('market-guest-toolbar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByTestId('user-page-menu-trigger')).not.toBeInTheDocument();
  });
});
