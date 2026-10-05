import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketJobsBoard } from '@/components/market/MarketJobsBoard';
import type { PublicMarketJobListing } from '@/lib/market-job-listings';

const listMock = vi.fn();
const unlockMock = vi.fn();
const toastMessage = vi.fn();

const authState = {
  user: null as { id: string } | null,
  loading: false,
};

vi.mock('@/lib/market-job-listings', async () => {
  const actual = await vi.importActual<typeof import('@/lib/market-job-listings')>('@/lib/market-job-listings');
  return {
    ...actual,
    listPublicMarketJobListings: (...args: unknown[]) => listMock(...args),
    unlockMarketJobContact: (...args: unknown[]) => unlockMock(...args),
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
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

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    message: (...args: unknown[]) => toastMessage(...args),
  },
}));

const workListing: PublicMarketJobListing = {
  id: 'job-1',
  created_at: '2026-07-31T10:00:00.000Z',
  mode: 'employer',
  job_types: ['Waiter', 'Cook'],
  city: 'Yerevan',
  region_code: null,
  country_code: 'AM',
  age: '61',
  pay_amount: '200,000',
  pay_period: 'Monthly pay',
  display_name: '••••••••',
  phone_country_code: 'AM',
  has_phone: true,
  is_own: false,
};

describe('MarketJobsBoard', () => {
  beforeEach(() => {
    authState.user = null;
    authState.loading = false;
    listMock.mockReset();
    unlockMock.mockReset();
    toastMessage.mockReset();
    listMock.mockResolvedValue([workListing]);
  });

  it('shows public work listings with masked company and phone', async () => {
    render(
      <MemoryRouter>
        <MarketJobsBoard viewerMode="seeker" jobTypes={[]} countryCode="" city="" refreshKey={0} />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('market-jobs-board')).toBeInTheDocument();
    expect(screen.getByText('Available work')).toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('+374 ·· ······')).toBeInTheDocument();
    expect(screen.getByText('Waiter or Cook')).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith('employer');
  });

  it('sends guests to sign in instead of revealing contact details', async () => {
    render(
      <MemoryRouter initialEntries={['/market?section=jobs']}>
        <MarketJobsBoard viewerMode="seeker" jobTypes={[]} countryCode="" city="" refreshKey={0} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('••••••••')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('market-jobs-unlock-job-1'));
    await waitFor(() => expect(toastMessage).toHaveBeenCalled());
    expect(unlockMock).not.toHaveBeenCalled();
  });

  it('reveals contact details after a signed-in unlock', async () => {
    authState.user = { id: 'user-1' };
    unlockMock.mockResolvedValue({
      id: 'job-1',
      full_name: 'Cafe Ararat',
      company_name: 'Cafe Ararat',
      phone_country_code: 'AM',
      phone_number: '55112233',
    });

    render(
      <MemoryRouter>
        <MarketJobsBoard viewerMode="seeker" jobTypes={[]} countryCode="" city="" refreshKey={0} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('••••••••')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('market-jobs-unlock-job-1'));
    expect(await screen.findByText('Cafe Ararat')).toBeInTheDocument();
    expect(screen.getByText('+374 55112233')).toBeInTheDocument();
  });

  it('explains an empty openings list to job seekers without telling them to post one', async () => {
    listMock.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <MarketJobsBoard viewerMode="seeker" jobTypes={[]} countryCode="" city="" refreshKey={0} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No openings posted yet. Check back soon.')).toBeInTheDocument();
    expect(screen.queryByText(/post the first one/i)).not.toBeInTheDocument();
  });

  it('keeps the original empty message for employers browsing workers', async () => {
    listMock.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <MarketJobsBoard viewerMode="employer" jobTypes={[]} countryCode="" city="" refreshKey={0} />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('No listings yet. Submit above to post the first one.'),
    ).toBeInTheDocument();
  });
});
