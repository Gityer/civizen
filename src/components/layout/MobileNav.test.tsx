import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MobileNav } from '@/components/layout/MobileNav';
import { PageSecondaryNavProvider } from '@/contexts/PageSecondaryNavContext';

vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  },
}));

vi.mock('@/components/layout/NavSecondaryCarousel', () => ({
  NavSecondaryCarousel: () => null,
}));

vi.mock('@/components/layout/NavSecondaryStrip', () => ({
  NavSecondaryStrip: () => null,
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

function setScrollY(y: number) {
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: y,
    writable: true,
  });
}

describe('MobileNav', () => {
  afterEach(() => {
    setScrollY(0);
  });

  it('shows Home Study Contribute Market Messaging and omits Settings', () => {
    render(
      <MemoryRouter>
        <PageSecondaryNavProvider>
          <MobileNav />
        </PageSecondaryNavProvider>
      </MemoryRouter>,
    );

    const labels = ['Home', 'Study', 'Contribute', 'Market', 'Messaging'];
    for (const label of labels) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /^settings$/i })).not.toBeInTheDocument();

    const buttons = screen.getAllByRole('button').filter((button) =>
      labels.some((label) => button.textContent?.includes(label)),
    );
    expect(buttons.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual(labels);
  });

  it('hides on scroll down and shows again on scroll up', () => {
    setScrollY(0);
    render(
      <MemoryRouter>
        <PageSecondaryNavProvider>
          <MobileNav />
        </PageSecondaryNavProvider>
      </MemoryRouter>,
    );

    const nav = screen.getByTestId('mobile-bottom-nav');
    expect(nav.className).toContain('translate-y-0');
    expect(nav).toHaveAttribute('aria-hidden', 'false');

    act(() => {
      setScrollY(120);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(nav.className).toContain('translate-y-[calc(7rem+env(safe-area-inset-bottom,0px))]');
    expect(nav).toHaveAttribute('aria-hidden', 'true');

    act(() => {
      setScrollY(40);
      window.dispatchEvent(new Event('scroll'));
    });
    expect(nav.className).toContain('translate-y-0');
    expect(nav).toHaveAttribute('aria-hidden', 'false');
  });
});
