import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ElectionAdminItem } from '@/lib/civic-voting/election-admin';
import { StewardConsoleElections } from './StewardConsoleElections';

const list = vi.fn();
const extend = vi.fn();
const cancel = vi.fn();
const certify = vi.fn();

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    }),
  };
});

vi.mock('@/lib/civic-voting/election-admin', async () => {
  const actual = await vi.importActual<typeof import('@/lib/civic-voting/election-admin')>('@/lib/civic-voting/election-admin');
  return {
    ...actual,
    listElectionsForAdministration: () => list(),
    extendElection: (...args: unknown[]) => extend(...args),
    cancelElection: (...args: unknown[]) => cancel(...args),
    certifyElection: (...args: unknown[]) => certify(...args),
  };
});

const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
const items: ElectionAdminItem[] = [
  { electionId: 'e-open', title: 'Open consultation', status: 'open', opensAt: new Date(Date.now() - 86_400_000).toISOString(),
    closesAt: future, proposalId: null, countableBallots: 4, certificationRequestedBy: null, certificationRequestedAt: null,
    certificationRequestedByMe: false, cancelReason: null },
  { electionId: 'e-closed', title: 'Closed consultation', status: 'closed', opensAt: null, closesAt: null, proposalId: null,
    countableBallots: 9, certificationRequestedBy: 'ops', certificationRequestedAt: new Date().toISOString(),
    certificationRequestedByMe: false, cancelReason: null },
];

describe('StewardConsoleElections', () => {
  beforeEach(() => {
    for (const fn of [list, extend, cancel, certify]) fn.mockReset();
    list.mockResolvedValue(items);
  });

  const renderIt = () => render(<MemoryRouter><StewardConsoleElections /></MemoryRouter>);

  it('offers the actions each state allows', async () => {
    renderIt();
    const open = await screen.findByTestId('election-admin-e-open');
    expect(open.querySelector('[data-testid="election-admin-action-extend"]')).not.toBeNull();
    expect(open.querySelector('[data-testid="election-admin-action-cancel"]')).not.toBeNull();
    const closed = screen.getByTestId('election-admin-e-closed');
    expect(closed.querySelector('[data-testid="election-admin-action-certify"]')).not.toBeNull();
    expect(screen.getByText('Certification requested by @ops.')).toBeInTheDocument();
  });

  it('cancels only with a reason', async () => {
    cancel.mockResolvedValue(undefined);
    renderIt();
    const open = await screen.findByTestId('election-admin-e-open');
    fireEvent.click(open.querySelector('[data-testid="election-admin-action-cancel"]') as HTMLElement);
    const submit = await screen.findByTestId('election-admin-submit');
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByTestId('election-admin-reason'), { target: { value: 'Question was misleading' } });
    fireEvent.click(submit);
    await waitFor(() => expect(cancel).toHaveBeenCalledWith('e-open', 'Question was misleading'));
  });

  it('certifies a result another administrator checked', async () => {
    certify.mockResolvedValue(undefined);
    renderIt();
    const closed = await screen.findByTestId('election-admin-e-closed');
    fireEvent.click(closed.querySelector('[data-testid="election-admin-action-certify"]') as HTMLElement);
    fireEvent.click(await screen.findByTestId('election-admin-submit'));
    await waitFor(() => expect(certify).toHaveBeenCalledWith('e-closed'));
  });
});
