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

const IDENTITY_FILES_BUCKET = 'identity-verification';

/**
 * Removes the member's own identity-verification files (the storage schema refuses SQL deletes, so
 * the owner does it through the Storage API before the account is closed). Best effort.
 */
export async function removeMyIdentityFiles(profileId: string): Promise<number> {
  try {
    const { data } = await supabase.storage.from(IDENTITY_FILES_BUCKET).list(profileId, { limit: 100 });
    const names = (data ?? []).map((item) => `${profileId}/${item.name}`);
    if (names.length === 0) return 0;
    const { error } = await supabase.storage.from(IDENTITY_FILES_BUCKET).remove(names);
    return error ? 0 : names.length;
  } catch {
    return 0;
  }
}

/** Closes the signed-in member's own account. Throws an Error whose message is the DB reason. */
export async function deleteMyAccount(confirmation: string, profileId?: string | null): Promise<void> {
  if (profileId) await removeMyIdentityFiles(profileId);
  const { error } = await supabase.rpc('delete_my_account', { p_confirm: confirmation });
  if (error) throw new Error(error.message);
}
