import { describe, expect, it } from 'vitest';

import { withoutLockedIdentityFields } from './verified-identity-lock';

describe('withoutLockedIdentityFields', () => {
  const draft = { full_name: 'Ana', date_of_birth: '1990-01-01', country: 'Armenia', country_code: 'AM', bio: 'hi' };

  it('saves everything for an unverified member', () => {
    expect(withoutLockedIdentityFields(draft, { is_verified: false })).toEqual({ patch: draft, attemptedChange: false });
  });

  it('drops birth date and country for a verified member and reports a change attempt', () => {
    const result = withoutLockedIdentityFields(draft, { is_verified: true, date_of_birth: '1990-01-01', country: 'France', country_code: 'FR' });
    expect(result.patch).toEqual({ full_name: 'Ana', bio: 'hi' });
    expect(result.attemptedChange).toBe(true);
  });

  it('does not report an attempt when the locked values are unchanged', () => {
    const result = withoutLockedIdentityFields(draft, { is_verified: true, date_of_birth: '1990-01-01', country: 'Armenia', country_code: 'AM' });
    expect(result.attemptedChange).toBe(false);
  });
});
