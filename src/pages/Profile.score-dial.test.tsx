import { render, screen, waitFor, within } from '@testing-library/react';
import { type HTMLAttributes, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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
        }),
      },
    },
  };
});

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () =>
        ({ children, ...props }: HTMLAttributes<HTMLElement> & Record<string, unknown>) => {
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
          return <div {...(rest as HTMLAttributes<HTMLElement>)}>{children}</div>;
        },
    },
  ),
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'profile-1',
      user_id: 'user-1',
      username: 'founder',
      full_name: 'Founder',
      avatar_url: null,
      bio: '',
      is_verified: true,
      country_code: 'US',
      region_code: null,
      city: null,
    },
    user: { id: 'user-1' },
    session: { user: { id: 'user-1' } },
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    refreshProfile: async () => {},
  }),
}));

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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/lib/civizen-score', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/civizen-score')>();
  const fixture = actual.calculateCivizenScoreModel(actual.SCORE_TEST_PROFILES.C_activeContributor());
  fixture.overall.score = 60.2;
  fixture.overall.status = 'established';
  fixture.overall.provisionalEstimate = 60.2;
  return {
    ...actual,
    buildScoreFromProfileActivity: () => fixture,
  };
});

vi.mock('@/lib/civizen-contributions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/civizen-contributions')>();
  return {
    ...actual,
    loadContributionEventsThenSync: vi.fn(async () => []),
  };
});

vi.mock('@/lib/civizen-performance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/civizen-performance')>();
  return {
    ...actual,
    loadPerformanceRatings: vi.fn(async () => []),
  };
});

vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// The Profile page is heavy: loading it inside the test made the run exceed the 5 s test limit when the machine was
// busy. Load it once before the tests (collection has no limit) and give the first render a realistic budget.
const RENDER_BUDGET_MS = 20_000;
let Profile: typeof import('@/pages/Profile').default;

beforeAll(async () => {
  Profile = (await import('@/pages/Profile')).default;
}, RENDER_BUDGET_MS);

async function renderProfileDial() {
  render(
    <MemoryRouter>
      <Profile />
    </MemoryRouter>,
  );
  return waitFor(() => screen.getByRole('group', { name: 'Score categories' }), { timeout: RENDER_BUDGET_MS - 2000 });
}

describe('Profile Score dial runtime', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Score dial past loading without unresolved geometry identifiers', async () => {
    const dial = await renderProfileDial();

    expect(screen.queryByText(/startup issue/i)).toBeNull();
    expect(screen.queryByText(/CONTENT_RADIUS is not defined/i)).toBeNull();
    expect(screen.queryByText(/is not defined/i)).toBeNull();

    expect(within(dial).getByRole('button', { name: /Learning,/ })).toBeTruthy();
    expect(within(dial).getByRole('button', { name: /Skills,/ })).toBeTruthy();
    expect(within(dial).getByRole('button', { name: /Performance,/ })).toBeTruthy();
    expect(within(dial).getByRole('button', { name: /Contributions,/ })).toBeTruthy();
    expect(within(dial).getByRole('button', { name: /Experience,/ })).toBeTruthy();

    expect(screen.getByText('Civizen Score')).toBeTruthy();
    expect(screen.getByText('60.2')).toBeTruthy();
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
    expect(screen.queryByText('60.2%')).toBeNull();
  }, RENDER_BUDGET_MS);
});
