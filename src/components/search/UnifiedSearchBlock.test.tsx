import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UnifiedSearchBlock } from '@/components/search/UnifiedSearchBlock';

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      id: 'user-1',
      full_name: 'Test User',
      username: 'test',
      effective_permissions: ['profile.read', 'law.read'],
    },
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

vi.mock('@/lib/use-market-published-listings', () => ({
  useMarketPublishedListings: () => ({ listings: [] }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
}

function renderSearch(initialEntry = '/search') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/search"
          element={
            <>
              <UnifiedSearchBlock showTitle syncUrlParams />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UnifiedSearchBlock', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({
      data: {
        people: [],
        companies: [
          {
            profile_id: 'biz-1',
            business_name_normalized: 'civizen',
            username: 'biz_civizen',
            full_name: 'Civizen',
            avatar_url: null,
            is_verified: true,
            owner_id: 'person-1',
            owner_username: 'armen',
            owner_full_name: 'Armen Yeremyan',
            owner_avatar_url: null,
            owner_is_verified: true,
          },
        ],
      },
      error: null,
    });
  });

  it('keeps multi-character typing in the input and URL', async () => {
    renderSearch();

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'c' } });
    fireEvent.change(input, { target: { value: 'ci' } });
    fireEvent.change(input, { target: { value: 'civ' } });

    expect(input).toHaveValue('civ');

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toMatch(/q=civ/);
    });
  });

  it('shows company endorse and run-by owner row without duplicating into people', async () => {
    renderSearch();

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'Civizen' } });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('search_civizen_directory', expect.objectContaining({
        p_query: 'Civizen',
      }));
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Companies' })).toBeInTheDocument();
      expect(screen.getByText('Run by Armen Yeremyan')).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: 'People' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^endorse$/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /view profile for armen yeremyan/i })).toBeInTheDocument();
  });

  it('adds Contents filter on the right and defaults to search-all with no tab selected', async () => {
    renderSearch();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'People',
      'Companies',
      'Products',
      'Services',
      'Contents',
    ]);
    expect(tabs.every((tab) => tab.getAttribute('aria-selected') === 'false')).toBe(true);

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'Roles' } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Contents' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Contents' }));
    expect(screen.getByRole('tab', { name: 'Contents' })).toHaveAttribute('aria-selected', 'true');

    await waitFor(() => {
      expect(screen.getByTestId('location-search').textContent).toMatch(/tab=contents/);
    });
  });
});
