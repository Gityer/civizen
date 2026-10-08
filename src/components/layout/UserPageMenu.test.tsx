import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { UserPageMenu } from '@/components/layout/UserPageMenu';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div>,
  },
}));

const { rpcMock, switchToKnownAccountMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(async () => ({ data: [], error: null })),
  switchToKnownAccountMock: vi.fn(async () => ({ error: null })),
}));

function emptyQuery() {
  const result = { data: [], error: null };
  const builder = {
    eq: () => builder,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => emptyQuery(),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
    rpc: rpcMock,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'biz-profile',
      full_name: 'Civizen',
      username: 'civizen',
      avatar_url: null,
      effective_permissions: ['profile.update_self', 'profile.read', 'content.read'],
    },
    knownAccountSessions: [
      {
        userId: 'personal-user',
        profileId: 'personal-profile',
        fullName: 'Armen Yeremyan',
        username: 'armen',
        avatarUrl: null,
        accountType: 'personal',
      },
      {
        userId: 'hvm-user',
        profileId: 'hvm-profile',
        fullName: 'Healthy Vending Mart LLC',
        username: null,
        avatarUrl: null,
        accountType: 'business',
      },
    ],
    canSwitchBack: true,
    switchBackToPreviousAccount: async () => ({ error: null }),
    switchToKnownAccount: switchToKnownAccountMock,
    pruneKnownAccountSessions: () => {},
    signIn: async () => ({ error: null }),
    signInWithOtp: async () => ({ error: null }),
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

function renderMenu(size?: 'sm' | 'md') {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <UserPageMenu size={size} />
      </MemoryRouter>
    </TooltipProvider>,
  );
}

describe('UserPageMenu account switcher', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
    switchToKnownAccountMock.mockReset();
    switchToKnownAccountMock.mockResolvedValue({ error: null });
    Element.prototype.scrollIntoView = vi.fn();
  });
  it('defaults to md trigger size and supports compact sm for dense headers', () => {
    const { unmount } = renderMenu();
    expect(screen.getByTestId('user-page-menu-trigger')).toHaveAttribute('data-size', 'md');
    unmount();

    renderMenu('sm');
    expect(screen.getByTestId('user-page-menu-trigger')).toHaveAttribute('data-size', 'sm');
  });

  it('centers the current account and switches by tapping a neighbor card', () => {
    renderMenu();

    fireEvent.click(screen.getByTestId('user-page-menu-trigger'));

    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch back/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^switch$/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('account-switcher-track')).toBeInTheDocument();
    expect(screen.getByTestId('account-switcher-card-biz-profile')).toHaveAttribute('data-current', 'true');
    expect(
      screen.getAllByTestId(/account-switcher-card-/).map((card) => card.getAttribute('data-testid')),
    ).toEqual([
      'account-switcher-card-personal-profile',
      'account-switcher-card-biz-profile',
      'account-switcher-card-hvm-profile',
    ]);
    expect(screen.getAllByText('Current').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /switch to armen yeremyan/i }));
    expect(switchToKnownAccountMock).toHaveBeenCalledWith('personal-user');
  });

  it('locks body scroll and makes the profile panel the scroll container while open', () => {
    renderMenu();

    fireEvent.click(screen.getByTestId('user-page-menu-trigger'));

    const panel = screen.getByTestId('user-page-menu-panel');
    expect(panel.className).toMatch(/overflow-y-auto/);
    expect(panel.className).toMatch(/overflow-x-hidden/);
    expect(panel.className).toMatch(/overscroll-contain/);
    expect(panel.className).not.toMatch(/touch-pan-y/);
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByTestId('user-page-menu-trigger'));

    expect(screen.queryByTestId('user-page-menu-panel')).not.toBeInTheDocument();
    expect(document.body.style.position).not.toBe('fixed');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('places add-business on the Accounts header and opens the create dialog', () => {
    renderMenu();

    fireEvent.click(screen.getByTestId('user-page-menu-trigger'));

    const addBusiness = screen.getByTestId('user-page-menu-add-business');
    expect(addBusiness).toBeInTheDocument();
    expect(addBusiness).toBeEnabled();
    expect(addBusiness).toHaveAttribute('aria-label', 'Add business account');
    expect(screen.queryByText('Add business account')).not.toBeInTheDocument();

    fireEvent.click(addBusiness);
    expect(screen.getByRole('heading', { name: /add business account/i })).toBeInTheDocument();
    expect(screen.getByTestId('add-business-submit')).toHaveTextContent('Register');
  });

  it('omits main-nav, Search, Download, and Edit Profile list rows', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('user-page-menu-trigger'));

    expect(screen.queryByRole('button', { name: /^study$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^market$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^messaging$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^contribute$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^search$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^download civizen$/i })).not.toBeInTheDocument();
    // Edit Profile remains as an account-row icon (aria-label), not a page-list row.
    expect(screen.queryByText('Edit Profile', { selector: 'span' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^settings$/i })).toBeInTheDocument();
  });

  it('shows Edit Profile on the current account row', () => {
    renderMenu();
    fireEvent.click(screen.getByTestId('user-page-menu-trigger'));

    const edit = screen.getByTestId('user-page-menu-edit-profile-biz-profile');
    expect(edit).toBeEnabled();
    expect(edit).toHaveAttribute('aria-label', 'Edit Profile');
  });
});
