import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StewardConsoleIdentityVerification } from '@/components/governance/StewardConsoleIdentityVerification';

const listPending = vi.fn();
const reviewCase = vi.fn();
const createSignedUrl = vi.fn();

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
      id: 'reviewer-1',
      effective_permissions: ['role.assign', 'settings.manage'],
    },
  }),
}));

vi.mock('@/lib/identity-verification', async () => {
  const actual = await vi.importActual<typeof import('@/lib/identity-verification')>('@/lib/identity-verification');
  return {
    ...actual,
    listPendingIdentityVerificationCases: (...args: unknown[]) => listPending(...args),
    reviewIdentityVerificationCase: (...args: unknown[]) => reviewCase(...args),
    createSignedIdentityArtifactUrl: (...args: unknown[]) => createSignedUrl(...args),
  };
});

describe('StewardConsoleIdentityVerification', () => {
  beforeEach(() => {
    listPending.mockReset();
    reviewCase.mockReset();
    createSignedUrl.mockReset();
    createSignedUrl.mockResolvedValue('https://example.test/signed.jpg');
    listPending.mockResolvedValue([
      {
        caseRow: {
          id: 'case-1',
          profile_id: 'profile-2',
          status: 'submitted',
          verification_method: 'manual_id_selfie',
          personal_info_completed: true,
          contact_info_completed: true,
          live_verification_completed: true,
          discrepancy_flags: [],
          submitted_at: '2026-09-07T10:00:00Z',
          reviewed_at: null,
          resolved_at: null,
          last_reviewed_by: null,
          notes: null,
          metadata: {},
          created_at: '2026-09-07T09:00:00Z',
          updated_at: '2026-09-07T10:00:00Z',
        },
        profileId: 'profile-2',
        profileUsername: 'ada',
        profileFullName: 'Ada Lovelace',
        artifacts: [
          {
            id: 'a1',
            case_id: 'case-1',
            artifact_kind: 'supporting_document',
            storage_path: 'profile-2/case-1/supporting_document-1.jpg',
            artifact_hash: null,
            metadata: {},
            created_by: 'profile-2',
            created_at: '2026-09-07T09:30:00Z',
          },
          {
            id: 'a2',
            case_id: 'case-1',
            artifact_kind: 'live_presence',
            storage_path: 'profile-2/case-1/live_presence-1.jpg',
            artifact_hash: null,
            metadata: {},
            created_by: 'profile-2',
            created_at: '2026-09-07T09:31:00Z',
          },
        ],
      },
    ]);
  });

  it('lists pending cases and records an approval', async () => {
    reviewCase.mockResolvedValue(undefined);

    render(<StewardConsoleIdentityVerification />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('@ada')).toBeInTheDocument();
    expect(screen.getByAltText('ID document')).toBeInTheDocument();
    expect(screen.getByAltText('Face photo')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Approve'));

    await waitFor(() => {
      expect(reviewCase).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case-1',
          reviewerId: 'reviewer-1',
          decision: 'approved',
        }),
      );
    });
  });
});
