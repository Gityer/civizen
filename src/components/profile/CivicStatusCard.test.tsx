import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CivicStatusCard } from './CivicStatusCard';

const loadMyCivicStatus = vi.fn();
const acceptCivicFramework = vi.fn();

vi.mock('@/lib/civic-status-service', () => ({
  loadMyCivicStatus: (...args: unknown[]) => loadMyCivicStatus(...args),
  acceptCivicFramework: (...args: unknown[]) => acceptCivicFramework(...args),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'p1' }, refreshProfile: vi.fn() }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, params?: Record<string, string>) => (params ? `${key} ${JSON.stringify(params)}` : key), language: 'en' }),
}));

const status = (overrides: Record<string, unknown>) => ({
  citizenshipStatus: 'verified_member',
  isVerified: true,
  verifiedSince: '2026-10-01T00:00:00Z',
  civicFrameworkAcceptedAt: null,
  citizenshipDueAt: '2026-10-31T00:00:00Z',
  citizenshipAcceptedAt: null,
  citizenshipAcceptanceMode: null,
  isActiveCitizen: false,
  ...overrides,
});

describe('CivicStatusCard', () => {
  beforeEach(() => {
    loadMyCivicStatus.mockReset();
    acceptCivicFramework.mockReset();
  });

  it('offers a verified member the civic framework and records the acceptance', async () => {
    loadMyCivicStatus.mockResolvedValueOnce(status({})).mockResolvedValueOnce(status({ civicFrameworkAcceptedAt: '2026-10-09T00:00:00Z', citizenshipDueAt: '2026-10-23T00:00:00Z' }));
    acceptCivicFramework.mockResolvedValue('2026-10-09T00:00:00Z');
    render(<CivicStatusCard />);
    expect(await screen.findByTestId('civic-status-badge')).toHaveTextContent('editProfile.civicStatus.status.verified_member');
    fireEvent.click(screen.getByTestId('accept-civic-framework'));
    await waitFor(() => expect(acceptCivicFramework).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('accept-civic-framework')).toBeNull());
    expect(screen.getByText(/editProfile.civicStatus.verifiedAcceptedBody/)).toBeTruthy();
  });

  it('shows a citizen without the acceptance action', async () => {
    loadMyCivicStatus.mockResolvedValue(status({ citizenshipStatus: 'citizen', citizenshipAcceptedAt: '2026-09-01T00:00:00Z', citizenshipDueAt: null }));
    render(<CivicStatusCard />);
    expect(await screen.findByTestId('civic-status-badge')).toHaveTextContent('editProfile.civicStatus.status.citizen');
    expect(screen.queryByTestId('accept-civic-framework')).toBeNull();
  });

  it('tells an unverified member what to do first', async () => {
    loadMyCivicStatus.mockResolvedValue(status({ citizenshipStatus: 'registered_member', isVerified: false, citizenshipDueAt: null }));
    render(<CivicStatusCard />);
    expect(await screen.findByText('editProfile.civicStatus.registeredBody')).toBeTruthy();
    expect(screen.queryByTestId('accept-civic-framework')).toBeNull();
  });
});
