import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Agreements from '@/pages/Agreements';
import type { AgreementListItem } from '@/lib/agreements-api';

const listAccessibleAgreements = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', full_name: 'Civi Member', username: 'nela' },
  }),
}));

vi.mock('@/lib/agreements-api', () => ({
  listAccessibleAgreements: (...args: unknown[]) => listAccessibleAgreements(...args),
}));

function item(overrides: Partial<AgreementListItem>): AgreementListItem {
  return {
    id: 'agr-1',
    referenceCode: 'AGR-2026-0001',
    partyReference: null,
    title: 'Pilot Collaboration Agreement',
    agreementType: 'pilot',
    status: 'draft',
    summary: null,
    marketListingId: null,
    createdAt: '2026-08-13T00:00:00.000Z',
    effectiveAt: null,
    endAt: null,
    executionMethod: null,
    needsAction: false,
    parties: [{ displayName: 'Civi Member' }, { displayName: 'Cedar River University' }],
    bucket: 'draft',
    ...overrides,
  };
}

function renderPage(path = '/agreements') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Agreements />
    </MemoryRouter>,
  );
}

describe('Agreements workspace', () => {
  beforeEach(() => {
    listAccessibleAgreements.mockReset();
  });

  it('shows a compact empty workspace without status pills or search', async () => {
    listAccessibleAgreements.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('agreements-empty')).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'agreements.listTitle' })).toBeInTheDocument();
    expect(screen.getByTestId('agreements-create')).toBeInTheDocument();
    expect(screen.getByLabelText('agreements.createAction')).toBeInTheDocument();
    expect(screen.getByText('agreements.emptyTitle')).toBeInTheDocument();
    expect(screen.getByText('agreements.listSubtitleShort')).toBeInTheDocument();
    expect(screen.getByText('agreements.emptyBody')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'agreements.createAction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /agreements.buckets.drafts/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /agreements.views.needsAction/ })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('agreements.searchPlaceholder')).not.toBeInTheDocument();
    expect(screen.queryByText('agreements.listSubtitle')).not.toBeInTheDocument();
  });

  it('opens the type menu from the title + and keeps More agreement types inside it', async () => {
    listAccessibleAgreements.mockResolvedValue([]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('agreements-empty')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('agreements-create'));
    const items = screen.getAllByRole('menuitem');
    expect(items.at(-1)).toHaveTextContent('agreements.moreAgreementTypes');
    expect(screen.getByRole('menuitem', { name: 'agreements.types.general' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'agreements.types.employment' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'agreements.types.sale_purchase' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'agreements.types.other' })).not.toBeInTheDocument();
    expect(screen.getByTestId('agreements-type-search')).toBeInTheDocument();
    expect(screen.queryByText('agreements.types.pilot')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agreements-more-types'));
    expect(screen.getByRole('menuitem', { name: 'agreements.types.pilot' })).toBeInTheDocument();
  });

  it('defaults to Needs action and shows the next action on those rows', async () => {
    listAccessibleAgreements.mockResolvedValue([
      item({
        id: 'sign-1',
        status: 'proposed',
        needsAction: true,
        bucket: 'needs_action',
      }),
      item({
        id: 'active-1',
        title: 'Campus lab access',
        status: 'active',
        needsAction: false,
        bucket: 'active',
      }),
    ]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pilot Collaboration Agreement')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /agreements.views.needsAction/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agreements.views.active/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /agreements.views.all/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /agreements.buckets.drafts/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /agreements.buckets.inReview/ })).not.toBeInTheDocument();
    expect(screen.getByText('Cedar River University')).toBeInTheDocument();
    expect(screen.getByText('agreements.cardStatus.sign')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'agreements.cardAction.sign' })).toHaveAttribute('href', '/agreements/sign-1');
    expect(screen.queryByText('Campus lab access')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('agreements.searchPlaceholder')).not.toBeInTheDocument();
  });

  it('shows active agreements without a next-action button', async () => {
    listAccessibleAgreements.mockResolvedValue([
      item({
        id: 'active-1',
        title: 'Campus lab access',
        status: 'active',
        needsAction: false,
        bucket: 'active',
      }),
    ]);
    renderPage('/agreements?bucket=active');

    await waitFor(() => {
      expect(screen.getByText('Campus lab access')).toBeInTheDocument();
    });
    expect(screen.getByText('agreements.status.active')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'agreements.cardAction.sign' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'agreements.cardAction.continue_draft' })).not.toBeInTheDocument();
  });

  it('keeps search and extra lifecycle filters in All', async () => {
    listAccessibleAgreements.mockResolvedValue([
      item({ id: 'draft-1', status: 'draft', needsAction: true, bucket: 'needs_action' }),
      item({
        id: 'active-1',
        title: 'Campus lab access',
        status: 'active',
        needsAction: false,
        bucket: 'active',
      }),
    ]);
    renderPage('/agreements?bucket=all');

    await waitFor(() => {
      expect(screen.getByText('Campus lab access')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('agreements.searchPlaceholder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'agreements.filter' })).toBeInTheDocument();
  });
});
