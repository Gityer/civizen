import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/untyped', () => ({ supabaseUntyped: {} }));

import { DEFAULT_PROFILE_PRIVACY, toProfilePrivacy } from '@/lib/profile-privacy';

describe('profile privacy', () => {
  it('defaults when nothing is stored', () => {
    expect(toProfilePrivacy(null)).toEqual(DEFAULT_PROFILE_PRIVACY);
  });

  it('reads stored settings and ignores unknown permissions', () => {
    expect(toProfilePrivacy({ hide_from_directory: true, message_permission: 'nobody' })).toEqual({
      hideFromDirectory: true,
      messagePermission: 'nobody',
    });
    expect(toProfilePrivacy({ hide_from_directory: 'yes', message_permission: 'friends' })).toEqual(DEFAULT_PROFILE_PRIVACY);
  });
});
