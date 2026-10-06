import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PublicPrimaryNav } from '@/components/public/PublicPrimaryNav';

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

describe('PublicPrimaryNav', () => {
  it('exposes the public destinations for large screens', () => {
    render(
      <MemoryRouter initialEntries={['/areas']}>
        <PublicPrimaryNav />
      </MemoryRouter>,
    );

    const nav = screen.getByTestId('public-primary-nav');
    expect(nav.className).toContain('lg:flex');
    expect(screen.getByRole('link', { name: 'Why this exists' })).toHaveAttribute(
      'href',
      '/why-this-exists',
    );
    expect(screen.getByRole('link', { name: 'Areas' })).toHaveAttribute('href', '/areas');
    expect(screen.getByRole('link', { name: 'Jobs' })).toHaveAttribute('href', '/jobs');
    expect(screen.getByRole('link', { name: 'Documents' })).toHaveAttribute('href', '/documents');
    expect(screen.getByRole('link', { name: 'Governance' })).toHaveAttribute('href', '/governance');
    expect(screen.getByRole('link', { name: 'Areas' })).toHaveAttribute('aria-current', 'page');
  });
});
