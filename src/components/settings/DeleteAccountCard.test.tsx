import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteAccountCard } from './DeleteAccountCard';

const deleteMyAccount = vi.fn();
const signOut = vi.fn();

vi.mock('@/lib/account-deletion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/account-deletion')>('@/lib/account-deletion');
  return { ...actual, deleteMyAccount: (...args: unknown[]) => deleteMyAccount(...args) };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ signOut }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function openDialog() {
  render(
    <MemoryRouter>
      <DeleteAccountCard />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText('settings.deleteAccountButton'));
}

describe('DeleteAccountCard', () => {
  beforeEach(() => {
    deleteMyAccount.mockReset();
    signOut.mockReset();
  });

  it('keeps the delete button disabled until the word is typed', () => {
    openDialog();
    const submit = screen.getByText('settings.deleteAccountSubmit').closest('button') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    expect(submit.disabled).toBe(false);
  });

  it('deletes then signs out once confirmed', async () => {
    deleteMyAccount.mockResolvedValue(undefined);
    openDialog();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'delete' } });
    fireEvent.click(screen.getByText('settings.deleteAccountSubmit'));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(deleteMyAccount.mock.calls[0]?.[0]).toBe('DELETE');
  });

  it('stays signed in when the server refuses', async () => {
    deleteMyAccount.mockRejectedValue(new Error('account_not_deletable_staff'));
    openDialog();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByText('settings.deleteAccountSubmit'));
    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });
});
