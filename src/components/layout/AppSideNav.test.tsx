import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppSideNav } from '@/components/layout/AppSideNav';
import { PageSecondaryNavProvider } from '@/contexts/PageSecondaryNavContext';

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

describe('AppSideNav', () => {
  it('renders the same primary destinations as the phone bottom bar', () => {
    render(
      <MemoryRouter>
        <PageSecondaryNavProvider>
          <AppSideNav />
        </PageSecondaryNavProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-side-nav')).toBeInTheDocument();

    for (const label of ['Home', 'Study', 'Contribute', 'Market', 'Messaging']) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });
});
