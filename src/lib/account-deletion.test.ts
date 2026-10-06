import { describe, expect, it } from 'vitest';
import { accountDeletionErrorKey, isAccountDeletionConfirmed } from './account-deletion';

describe('account deletion helpers', () => {
  it('requires the typed word, ignoring case and surrounding spaces', () => {
    expect(isAccountDeletionConfirmed('DELETE')).toBe(true);
    expect(isAccountDeletionConfirmed('  delete ')).toBe(true);
    expect(isAccountDeletionConfirmed('del')).toBe(false);
    expect(isAccountDeletionConfirmed('')).toBe(false);
  });

  it('maps database refusals to specific messages and everything else to the generic one', () => {
    expect(accountDeletionErrorKey('account_not_deletable_staff')).toBe('settings.deleteAccountStaff');
    expect(accountDeletionErrorKey('account_not_deletable_office_holder')).toBe(
      'settings.deleteAccountOffice',
    );
    expect(accountDeletionErrorKey('boom')).toBe('settings.deleteAccountFailed');
    expect(accountDeletionErrorKey(null)).toBe('settings.deleteAccountFailed');
  });
});
