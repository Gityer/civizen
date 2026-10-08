import { describe, expect, it } from 'vitest';

import { resolveSwitchAuthorization } from '../../supabase/functions/linked-account-switch/authorize';

const established = '2026-10-07T10:00:00Z';

describe('linked-account-switch authorization', () => {
  it('allows owner <-> business switches only along established rows', () => {
    const rows = [{ owner_profile_id: 'owner', linked_profile_id: 'biz', relationship_type: 'business', established_at: established }];
    expect(resolveSwitchAuthorization(rows, 'owner', 'biz')).toBe('direct');
    expect(resolveSwitchAuthorization(rows, 'biz', 'owner')).toBe('direct');
    expect(resolveSwitchAuthorization(rows, 'owner', 'someone-else')).toBe('denied');
    expect(resolveSwitchAuthorization(rows, 'owner', 'owner')).toBe('denied');
  });

  it('denies a forged or unestablished row (the account-takeover case)', () => {
    const forged = [{ owner_profile_id: 'attacker', linked_profile_id: 'founder', relationship_type: 'business', established_at: null }];
    expect(resolveSwitchAuthorization(forged, 'attacker', 'founder')).toBe('denied');
    expect(resolveSwitchAuthorization(forged, 'founder', 'attacker')).toBe('denied');
    expect(resolveSwitchAuthorization([], 'attacker', 'founder')).toBe('denied');
  });

  it('allows sibling businesses of the same owner, but only when both links are established', () => {
    const rows = [
      { owner_profile_id: 'owner', linked_profile_id: 'biz-a', relationship_type: 'business', established_at: established },
      { owner_profile_id: 'owner', linked_profile_id: 'biz-b', relationship_type: 'business', established_at: established },
      { owner_profile_id: 'owner', linked_profile_id: 'biz-c', relationship_type: 'business', established_at: null },
    ];
    expect(resolveSwitchAuthorization(rows, 'biz-a', 'biz-b')).toBe('sibling');
    expect(resolveSwitchAuthorization(rows, 'biz-a', 'biz-c')).toBe('denied');
    expect(resolveSwitchAuthorization(rows, 'biz-c', 'biz-a')).toBe('denied');
  });
});
