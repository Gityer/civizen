import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdentityVerificationSettingsSection } from '@/components/profile/IdentityVerificationSettingsSection';

const ensureMock = vi.fn();
const refreshProfile = vi.fn();

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
  useAuth: () => ({
    profile: {
      id: 'profile-1',
      full_name: 'Ada Lovelace',
      country: 'United Kingdom',
      date_of_birth: '1815-12-10',
      username: 'ada',
      phone_e164: null,
      phone_number: null,
      is_verified: false,
    },
    refreshProfile,
  }),
}));

vi.mock('@/lib/identity-verification', () => ({
  ensureIdentityVerificationCase: (...args: unknown[]) => ensureMock(...args),
  submitIdentityVerificationCase: vi.fn(),
  uploadIdentityDocument: vi.fn(),
  uploadIdentitySelfie: vi.fn(),
}));

describe('IdentityVerificationSettingsSection', () => {
  beforeEach(() => {
    ensureMock.mockReset();
    ensureMock.mockResolvedValue({
      caseRow: {
        id: 'case-1',
        profile_id: 'profile-1',
        status: 'draft',
        verification_method: 'manual_id_selfie',
        personal_info_completed: true,
        contact_info_completed: true,
        live_verification_completed: false,
        discrepancy_flags: [],
        submitted_at: null,
        reviewed_at: null,
        resolved_at: null,
        last_reviewed_by: null,
        notes: null,
        metadata: {},
        created_at: '2026-09-07T00:00:00Z',
        updated_at: '2026-09-07T00:00:00Z',
      },
      artifacts: [],
      hasIdDocument: false,
      hasSelfie: false,
      personalInfoCompleted: true,
      contactInfoCompleted: true,
      canSubmit: false,
    });
  });

  it('shows upload controls for an unverified draft case', async () => {
    render(<IdentityVerificationSettingsSection />);

    expect(await screen.findByText('Identity verification')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Upload ID photo')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Take a photo')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload face photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
  });
});
