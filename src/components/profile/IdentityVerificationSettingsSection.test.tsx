import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdentityVerificationSettingsSection } from '@/components/profile/IdentityVerificationSettingsSection';

const loadState = vi.fn();
let isVerified = false;

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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'profile-1', is_verified: isVerified }, refreshProfile: vi.fn() }),
}));

vi.mock('@/lib/identity-live', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/identity-live')>()),
  loadMyVerificationState: () => loadState(),
}));

const renderSection = () => render(<MemoryRouter><IdentityVerificationSettingsSection /></MemoryRouter>);

describe('IdentityVerificationSettingsSection', () => {
  beforeEach(() => {
    isVerified = false;
    loadState.mockReset();
  });

  it('sends an unverified member to the live check and back', async () => {
    loadState.mockResolvedValue({ verified: false, status: 'draft', submittedAt: null, lastDecision: null });
    renderSection();
    const start = await screen.findByTestId('identity-verification-start');
    expect(start).toHaveAttribute('href', '/verify?next=%2Fsettings%2Fprofile');
  });

  it('shows a submitted case as waiting, without a start button', async () => {
    loadState.mockResolvedValue({ verified: false, status: 'submitted', submittedAt: '2026-10-30T00:00:00Z', lastDecision: null });
    renderSection();
    expect(await screen.findByText(/identity team will check it/)).toBeInTheDocument();
    expect(screen.queryByTestId('identity-verification-start')).not.toBeInTheDocument();
  });

  it('shows a verified member as verified', async () => {
    isVerified = true;
    loadState.mockResolvedValue({ verified: true, status: 'approved', submittedAt: null, lastDecision: null });
    renderSection();
    expect(await screen.findByText(/Your identity is verified for Civizen trust checks/)).toBeInTheDocument();
    expect(screen.queryByTestId('identity-verification-start')).not.toBeInTheDocument();
  });
});
