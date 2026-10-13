import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

const authState = vi.hoisted(() => ({
  user: null as null | { id: string },
  profile: null as null | {
    role: string;
    effective_permissions: string[];
  },
  loading: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
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

vi.mock('@/components/auth/TermsReconsentGate', () => ({
  TermsReconsentGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/settings/admin/permissions']}>
      <Routes>
        <Route path="/" element={<div data-testid="home-page">Home</div>} />
        <Route
          path="/settings/admin/permissions"
          element={
            <ProtectedRoute requiredPermissions={['role.assign', 'settings.manage']}>
              <div data-testid="permissions-page">Permissions</div>
            </ProtectedRoute>
          }
        />
        <Route path="/onboarding" element={<div data-testid="onboarding-page">Onboarding</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authState.user = null;
    authState.profile = null;
    authState.loading = false;
  });

  it('waits for profile instead of redirecting to Home when session exists', () => {
    authState.user = { id: 'user-1' };
    authState.profile = null;
    authState.loading = false;

    renderRoute();

    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('permissions-page')).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders the page once a founder profile with the permission is ready', () => {
    authState.user = { id: 'user-1' };
    authState.profile = { role: 'founder', effective_permissions: ['role.assign'] };
    authState.loading = false;

    renderRoute();

    expect(screen.getByTestId('permissions-page')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('redirects a founder whose permission was withdrawn (no route bypass, decision E5)', () => {
    authState.user = { id: 'user-1' };
    authState.profile = { role: 'founder', effective_permissions: ['content.read'] };
    authState.loading = false;

    renderRoute();

    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('permissions-page')).not.toBeInTheDocument();
  });

  it('redirects to Home when a non-founder lacks required permissions', () => {
    authState.user = { id: 'user-1' };
    authState.profile = { role: 'member', effective_permissions: ['content.read'] };
    authState.loading = false;

    renderRoute();

    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('permissions-page')).not.toBeInTheDocument();
  });
});
