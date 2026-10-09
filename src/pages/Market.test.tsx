import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Market from '@/pages/Market';

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children, hideTopChrome }: { children: React.ReactNode; hideTopChrome?: boolean }) => (
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

const authState = {
  user: { id: 'user-1' } as { id: string } | null,
  loading: false,
  profile: { id: 'profile-1', full_name: 'Test User', avatar_url: null } as { id: string; full_name: string; avatar_url: null } | null,
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

function renderMarket(path = '/market') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Market />
    </MemoryRouter>,
  );
}

describe('Market (Jobs + Agreements)', () => {
  beforeEach(() => {
    authState.user = { id: 'user-1' };
    authState.loading = false;
    authState.profile = { id: 'profile-1', full_name: 'Test User', avatar_url: null };
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hides app-wide top chrome and keeps Agreements and Profile in the page header', async () => {
    renderMarket();
    expect(screen.getByTestId('app-layout')).toHaveAttribute('data-hide-top-chrome', 'true');
    expect(await screen.findByTestId('user-page-menu-trigger')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agreements' })).toHaveAttribute('href', '/agreements');
  });

  it('is the Jobs board whatever section the URL remembers; listings, filters and credits are gone', () => {
    renderMarket('/market?section=sell');
    expect(screen.getByTestId('market-jobs-interest-form')).toBeInTheDocument();
    expect(screen.getByTestId('market-page-title')).toHaveTextContent('Marketplace / Jobs');
    expect(screen.queryByTestId('market-listing-search-toggle')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/filters/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/prototype credits/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Local', level: 2 })).not.toBeInTheDocument();
  });

  it('shows public Jobs chrome for guests', async () => {
    authState.user = null;
    authState.profile = null;
    renderMarket();
    expect(await screen.findByTestId('market-jobs-interest-form')).toBeInTheDocument();
    expect(screen.getByTestId('market-guest-toolbar')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.queryByTestId('user-page-menu-trigger')).not.toBeInTheDocument();
  });
});
