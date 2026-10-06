import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppTopChrome } from '@/components/layout/AppTopChrome';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'profile-1', effective_permissions: [] },
  }),
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

vi.mock('@/components/layout/UserPageMenu', () => ({
  UserPageMenu: () => <div data-testid="user-page-menu-trigger" />,
}));

describe('AppTopChrome', () => {
  it('shows Search and Profile without a chrome Back control', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppTopChrome />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-top-chrome-search')).toBeInTheDocument();
    expect(await screen.findByTestId('user-page-menu-trigger')).toBeInTheDocument();
    expect(screen.queryByTestId('app-top-chrome-back')).not.toBeInTheDocument();
  });
});
