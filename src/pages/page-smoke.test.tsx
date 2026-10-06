import { render } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageEntry, allPages } from '@/pages/page-smoke-pages';



const { supabaseMock } = vi.hoisted(() => {
  const result = { data: [], error: null };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    insert: chain,
    update: chain,
    upsert: chain,
    delete: chain,
    eq: chain,
    neq: chain,
    gt: chain,
    gte: chain,
    lt: chain,
    lte: chain,
    like: chain,
    ilike: chain,
    is: chain,
    in: chain,
    contains: chain,
    range: chain,
    order: chain,
    limit: chain,
    offset: chain,
    match: chain,
    filter: chain,
    not: chain,
    or: chain,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  });

  return {
    supabaseMock: {
      from: () => builder,
      rpc: async () => ({ data: [], error: null }),
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      channel: () => ({
        on() {
          return this;
        },
        subscribe: () => ({ unsubscribe: () => undefined }),
      }),
      removeChannel: () => undefined,
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '' } }),
          download: async () => ({ data: null, error: null }),
        }),
      },
      functions: {
        invoke: async () => ({ data: null, error: null }),
      },
    },
  };
});

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...props }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
          const {
            layoutId: _layoutId,
            whileTap: _whileTap,
            whileHover: _whileHover,
            initial: _initial,
            animate: _animate,
            exit: _exit,
            transition: _transition,
            variants: _variants,
            ...rest
          } = props;
          return <div {...(rest as React.HTMLAttributes<HTMLElement>)}>{children}</div>;
        },
    },
  ),
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('@/components/layout/MobileNav', () => ({
  MobileNav: () => null,
}));

vi.mock('@/components/public/PublicPageShell', () => ({
  PublicPageShell: ({ children }: { children: ReactNode }) => <div data-testid="public-shell">{children}</div>,
}));

vi.mock('@/components/public/PublicAuthHeader', () => ({
  PublicAuthHeader: ({ title }: { title?: string }) => <h1>{title || 'Auth'}</h1>,
}));

vi.mock('@/components/public/PublicPageHeader', () => ({
  PublicPageHeader: () => <header>Public header</header>,
}));

vi.mock('@/components/public/PublicPageFooter', () => ({
  PublicPageFooter: () => <footer>Public footer</footer>,
}));

vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/lib/biometric-sign-in', () => ({
  isBiometricSignInSupportedPlatform: () => false,
  getBiometricSignInCapability: async () => ({
    canUnlock: false,
    available: false,
    enabled: false,
    platformSupported: false,
  }),
  enableBiometricSignIn: async () => ({ error: null }),
  disableBiometricSignIn: async () => ({ error: null }),
  syncBiometricSessionIfEnabled: async () => {},
  unlockBiometricSession: async () => ({ error: null }),
  unlockSessionWithBiometrics: async () => ({ error: null }),
}));

vi.mock('@/hooks/usePageSecondaryNav', () => ({
  usePageSecondaryNav: () => {},
}));

vi.mock('@/contexts/PageSecondaryNavContext', () => ({
  PageSecondaryNavProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePageSecondaryNavContext: () => ({
    config: null,
    setConfig: () => {},
    clearConfig: () => {},
  }),
}));

const authState = {
  profile: {
    id: 'profile-1',
    user_id: 'user-1',
    username: 'founder',
    full_name: 'Founder',
    avatar_url: null,
    role: 'founder',
    is_admin: true,
    is_verified: true,
    effective_permissions: [
      'role.assign',
      'settings.manage',
      'updates.test',
      'content.read',
      'law.read',
      'market.read',
    ],
    custom_permissions: [],
    granted_permissions: [],
    denied_permissions: [],
    citizenship_status: 'citizen',
    experience_level: 'professional',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Record<string, unknown> | null,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: authState.profile,
    user: authState.profile ? { id: authState.profile.user_id } : null,
    session: authState.profile ? { user: { id: authState.profile.user_id } } : null,
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    signInWithBiometrics: async () => ({ error: null }),
    refreshProfile: async () => {},
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
vi.stubGlobal('ResizeObserver', MockResizeObserver);

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}


const renderCritical = new Set([
  'Agreements',
  'AgreementCreate',
  'UsersAdmin',
  'RolesAdmin',
  'PermissionsAdmin',
  'GovernanceAdmin',
  'FundingAdmin',
  'Login',
  'SignUp',
  'Home',
  'Market',
  'Profile',
  'ContributionsLedger',
  'Earnings',
  'Happiness',
  'HappinessCheckIn',
  'PrivacySettings',
  'NotificationsSettings',
  'SafetySettings',
  'HelpSupport',
  'ReportContent',
  'SocialAccountsSettings',
  'PrototypeCredits',
  'PublicGovernanceLanding',
  'Contribute',
  'ProfessionalOpportunities',
  'Matters',
  'OpportunityForm',
  'OpportunityDetail',
  'Areas',
  'AreaDetail',
  'CivicVotingHub',
  'SolutionsHub',
  'NotFound',
]);

async function renderPage(entry: PageEntry) {
  const module = await entry.load();
  const Page = module.default;
  expect(Page).toBeTypeOf('function');

  const routePath = entry.routePath || entry.path;
  const view = render(
    <MemoryRouter initialEntries={[entry.path]}>
      <Suspense fallback={<div>loading</div>}>
        <Routes>
          <Route path={routePath} element={<Page />} />
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );

  view.unmount();
}

describe('page module smoke', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each(allPages)('imports $name default export', async ({ load }) => {
    const module = await load();
    expect(module.default).toBeTypeOf('function');
  });

  it.each(allPages.filter((page) => renderCritical.has(page.name)))(
    'renders $name without throwing',
    async (entry) => {
      await expect(renderPage(entry)).resolves.toBeUndefined();
    },
    15_000,
  );
});
