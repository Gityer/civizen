import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Onboarding from '@/pages/Onboarding';
import { ANDROID_INSTALL_PAGE_URL } from '@/lib/downloads';
import { APP_VERSION } from '@/lib/app-release';

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
          <div {...props}>{children}</div>,
    },
  ),
  useReducedMotion: () => true,
}));
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr-code" data-value={value} />,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    profile: null,
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
      languageOptions: [],
      isLoadingLanguage: false,
    }),
  };
});
vi.mock('@/lib/i18n.runtime', async () => {
  const actual = await vi.importActual<typeof import('@/lib/i18n.runtime')>('@/lib/i18n.runtime');

  return {
    ...actual,
    loadLanguageOptions: async () => [{ code: 'en', label: 'English' }],
  };
});

describe('Onboarding public page', () => {
  it('shows product, proof, and faq content for new visitors', async () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    expect(screen.getByText('What Civizen is today')).toBeInTheDocument();
    expect(screen.getByText('Where this is intended to lead')).toBeInTheDocument();
    expect(screen.getByText(`Current build: ${APP_VERSION}`)).toBeInTheDocument();
    expect(screen.getByText('Outcomes we pursue')).toBeInTheDocument();
    expect(screen.getByText('How the system fits together')).toBeInTheDocument();
    expect(screen.getByText('Open, auditable, and documented')).toBeInTheDocument();
    expect(screen.getByText('Choose your path')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Look for work or post a job' })).toHaveAttribute('href', '/jobs');
    expect(screen.getByText('Look for work')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Jobs' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Common questions')).toBeInTheDocument();
    expect(screen.getByText('What is Civizen?')).toBeInTheDocument();
    expect(screen.getByText('Could Civizen World Citizenship become officially recognized?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open-source repository/i })).toHaveAttribute(
      'href',
      'https://github.com/maturehumanity/civizen',
    );
    expect(screen.getAllByRole('link', { name: 'Terms' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', 'https://civizen.world');
  });

  it('shows the public app download card with qr code and actions', async () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    expect(screen.getByText('Try the Android build')).toBeInTheDocument();
    expect(screen.getByText('Early access · Testing build')).toBeInTheDocument();
    expect(screen.getByText('Scan, download, then open the APK to install')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download the Android test build' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open download page' })).toBeInTheDocument();
    expect(await screen.findByTestId('qr-code')).toHaveAttribute('data-value', ANDROID_INSTALL_PAGE_URL);
  });

  it('shows Join / Sign in once on first view; the sticky bar waits until the hero actions scroll away', () => {
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );

    const hero = within(screen.getByTestId('onboarding-hero-actions'));
    expect(hero.getByRole('button', { name: /Join the network/ })).toBeInTheDocument();
    expect(hero.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();

    // Hidden bar is out of the accessibility tree, so only the hero pair is reachable.
    expect(screen.getByTestId('onboarding-sticky-cta')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('button', { name: /Join the network/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Sign in' })).toHaveLength(1);

    // Large-screen header pair stays hidden while the hero pair is on screen.
    expect(screen.getByTestId('public-sign-in')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('public-join')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryAllByRole('link', { name: /Join the network|^Sign in$/ })).toHaveLength(0);
  });
});
