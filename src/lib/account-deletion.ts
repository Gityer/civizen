import { supabase } from '@/integrations/supabase/client';

export const ACCOUNT_DELETION_CONFIRM_WORD = 'DELETE';

export type AccountDeletionErrorKey =
  | 'settings.deleteAccountStaff'
  | 'settings.deleteAccountOffice'
  | 'settings.deleteAccountFailed';

/** Maps the database error to a translation key; unknown errors fall back to the generic message. */
export function accountDeletionErrorKey(message: string | null | undefined): AccountDeletionErrorKey {
  const text = message ?? '';
  if (text.includes('account_not_deletable_staff')) return 'settings.deleteAccountStaff';
  if (text.includes('account_not_deletable_office_holder')) return 'settings.deleteAccountOffice';
  return 'settings.deleteAccountFailed';
}

export function isAccountDeletionConfirmed(input: string): boolean {
  return input.trim().toUpperCase() === ACCOUNT_DELETION_CONFIRM_WORD;
}

/** Closes the signed-in member's own account. Throws an Error whose message is the DB reason. */
export async function deleteMyAccount(confirmation: string): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account', { p_confirm: confirmation });
  if (error) throw new Error(error.message);
}
