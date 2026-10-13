import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StewardConsoleIdentityVerification } from '@/components/governance/StewardConsoleIdentityVerification';
import type { IdentityReviewQueueItem } from '@/lib/identity-verification-queue';

const listQueue = vi.fn();
const canReview = vi.fn();
const requestInfo = vi.fn();
const release = vi.fn();
const reviewCase = vi.fn();
const assignCase = vi.fn();
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
  useAuth: () => ({ profile: { id: 'reviewer-1', effective_permissions: [] } }),
}));

vi.mock('@/lib/identity-verification', async () => {
  const actual = await vi.importActual<typeof import('@/lib/identity-verification')>('@/lib/identity-verification');
  return {
    ...actual,
    reviewIdentityVerificationCase: (...args: unknown[]) => reviewCase(...args),
    assignIdentityVerificationCase: (...args: unknown[]) => assignCase(...args),
    createSignedIdentityArtifactUrl: (...args: unknown[]) => createSignedUrl(...args),
  };
});

vi.mock('@/lib/identity-verification-queue', async () => {
  const actual = await vi.importActual<typeof import('@/lib/identity-verification-queue')>('@/lib/identity-verification-queue');
  return {
    ...actual,
    canReviewIdentityVerification: () => canReview(),
    listIdentityReviewQueue: () => listQueue(),
    requestIdentityVerificationInfo: (...args: unknown[]) => requestInfo(...args),
    releaseIdentityVerificationCase: (...args: unknown[]) => release(...args),
  };
});

function queueItem(overrides: Partial<IdentityReviewQueueItem> = {}): IdentityReviewQueueItem {
  return {
    caseId: 'case-1',
    profileId: 'profile-2',
    username: 'ada',
    fullName: 'Ada Lovelace',
    country: 'AM',
    status: 'submitted',
    submittedAt: '2026-09-07T10:00:00Z',
    ageHours: 3,
    assignedTo: null,
    assignedUsername: null,
    infoRequestCount: 0,
    resubmission: false,
    noteCount: 0,
    artifacts: [
      { id: 'a1', case_id: 'case-1', artifact_kind: 'supporting_document', storage_path: 'profile-2/case-1/id.jpg',
        artifact_hash: null, metadata: {}, created_by: 'profile-2', created_at: '2026-09-07T09:30:00Z' },
      { id: 'a2', case_id: 'case-1', artifact_kind: 'live_presence', storage_path: 'profile-2/case-1/face.jpg',
        artifact_hash: null, metadata: {}, created_by: 'profile-2', created_at: '2026-09-07T09:31:00Z' },
    ] as IdentityReviewQueueItem['artifacts'],
    ...overrides,
  };
}

describe('StewardConsoleIdentityVerification', () => {
  beforeEach(() => {
    for (const fn of [listQueue, canReview, requestInfo, release, reviewCase, assignCase, createSignedUrl]) fn.mockReset();
    canReview.mockResolvedValue(true);
    createSignedUrl.mockResolvedValue('https://example.test/signed.jpg');
    listQueue.mockResolvedValue([
      queueItem(),
      queueItem({ caseId: 'case-2', username: 'bob', fullName: 'Bob Old', ageHours: 60, assignedTo: 'reviewer-1', assignedUsername: 'me', status: 'in_review' }),
    ]);
  });

  it('refuses members who cannot review', async () => {
    canReview.mockResolvedValue(false);
    render(<StewardConsoleIdentityVerification />);
    expect(await screen.findByText(/not authorized|cannot review|permission/i)).toBeInTheDocument();
    expect(listQueue).not.toHaveBeenCalled();
  });

  it('lists the queue with age and records an approval', async () => {
    reviewCase.mockResolvedValue(undefined);
    render(<StewardConsoleIdentityVerification />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Waiting 3 h')).toBeInTheDocument();
    expect(screen.getByText('Waiting 2 d')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByAltText('ID document').length).toBe(2));

    fireEvent.click(screen.getAllByTestId('identity-review-approve')[0]);
    await waitFor(() =>
      expect(reviewCase).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'case-1', reviewerId: 'reviewer-1', decision: 'approved' })),
    );
  });

  it('filters overdue and own cases', async () => {
    render(<StewardConsoleIdentityVerification />);
    await screen.findByText('Ada Lovelace');
    fireEvent.click(screen.getByTestId('identity-review-filter-overdue'));
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Old')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('identity-review-filter-unassigned'));
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText('Bob Old')).not.toBeInTheDocument();
  });

  it('rejects only with a reason code and a message', async () => {
    reviewCase.mockResolvedValue(undefined);
    render(<StewardConsoleIdentityVerification />);
    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getAllByTestId('identity-review-reject')[0]);
    const submit = await screen.findByTestId('identity-review-submit');
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByTestId('identity-reason-details_mismatch'));
    fireEvent.change(screen.getByTestId('identity-review-message'), { target: { value: 'Name differs from the ID.' } });
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);

    await waitFor(() =>
      expect(reviewCase).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: 'case-1', decision: 'rejected', reasonCode: 'details_mismatch', notes: 'Name differs from the ID.' }),
      ),
    );
  });

  it('asks the member for more information', async () => {
    requestInfo.mockResolvedValue(undefined);
    render(<StewardConsoleIdentityVerification />);
    await screen.findByText('Ada Lovelace');

    fireEvent.click(screen.getAllByTestId('identity-review-request-info')[0]);
    fireEvent.click(await screen.findByTestId('identity-reason-document_unreadable'));
    fireEvent.change(screen.getByTestId('identity-review-message'), { target: { value: 'Retake the ID photo in daylight.' } });
    fireEvent.click(screen.getByTestId('identity-review-submit'));

    await waitFor(() => expect(requestInfo).toHaveBeenCalledWith('case-1', 'document_unreadable', 'Retake the ID photo in daylight.'));
  });
});
