import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import Settings from '@/pages/Settings';
import { APP_VERSION_TAG, ANDROID_VERSION_CODE } from '@/lib/app-release';
import { APP_UPDATE_CHANNEL_KEY } from '@/lib/update-channel';

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
          <div {...props}>{children}</div>,
    },
  ),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const authProfileState: {
  profile: { effective_permissions: string[]; role: string } | null;
} = {
  profile: {
    effective_permissions: [],
    role: 'member',
  },
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: async () => {},
    get profile() {
      return authProfileState.profile;
    },
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

describe('Settings page', () => {
  it('shows a civic governance hub entry for signed-in non-guest members', () => {
    authProfileState.profile = { effective_permissions: [], role: 'member' };

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(screen.getByText('Civic governance')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('shows the civic governance hub entry for guest profiles', () => {
    authProfileState.profile = { effective_permissions: [], role: 'guest' };

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('shows the installed app version and build', () => {
    authProfileState.profile = { effective_permissions: [], role: 'member' };
    window.localStorage.removeItem(APP_UPDATE_CHANNEL_KEY);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(screen.getByText('Application version')).toBeInTheDocument();
    expect(screen.getByText(`${APP_VERSION_TAG} (${ANDROID_VERSION_CODE})`)).toBeInTheDocument();
  });

  it('hides the live/test app channel selector for members without updates.test', () => {
    authProfileState.profile = { effective_permissions: [], role: 'member' };
    window.localStorage.removeItem(APP_UPDATE_CHANNEL_KEY);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: /App channel/i })).not.toBeInTheDocument();
  });

  it('hides the AI Agent review page from ordinary members', () => {
    authProfileState.profile = { effective_permissions: [], role: 'member' };

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    expect(screen.queryByText('AI Agent')).not.toBeInTheDocument();
  });

  it('shows the live/test app channel selector for updates.test holders', async () => {
    authProfileState.profile = { effective_permissions: ['updates.test'], role: 'founder' };
    window.localStorage.removeItem(APP_UPDATE_CHANNEL_KEY);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    const channelButton = screen.getByRole('button', { name: /App channel: Live/i });
    expect(channelButton).toBeInTheDocument();
    expect(screen.getByText('Application version')).toBeInTheDocument();

    channelButton.click();

    // The popover content can remount while it opens, so re-query inside waitFor instead of
    // holding a reference to the first node that findBy resolved.
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Live' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Test' })).toBeInTheDocument();
      expect(screen.getByText('Live channel is selected.')).toBeInTheDocument();
    });
  });

  it('lists primary settings rows in alphabetical order by title', () => {
    authProfileState.profile = {
      effective_permissions: ['updates.test', 'profile.update_self', 'message.create'],
      role: 'founder',
    };
    window.localStorage.removeItem(APP_UPDATE_CHANNEL_KEY);

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>,
    );

    const titles = [
      'AI Agent',
      'Appearance',
      'Edit Profile',
      'Help and support',
      'Language',
      'Messaging',
      'Notifications',
      'Pillars',
      'Privacy',
      'Professional credentials',
      'Prototype credits',
      'Safety',
      'Taxonomy',
      'Terms of Use',
    ];

    const headingNodes = titles.map((title) => screen.getAllByText(title)[0]);
    const documentOrder = headingNodes
      .slice()
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    expect(documentOrder.map((node) => node.textContent)).toEqual(titles);
  });
});
