// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  CIVI_AVATAR_STORAGE_KEY,
  DEFAULT_CIVI_AVATAR_ID,
  getCiviAvatarId,
  getCiviAvatarUrl,
  setCiviAvatarId,
} from '@/lib/civi-avatar';

afterEach(() => {
  window.localStorage.removeItem(CIVI_AVATAR_STORAGE_KEY);
});

describe('civi avatar store', () => {
  it('defaults to Civic C', () => {
    expect(getCiviAvatarId()).toBe(DEFAULT_CIVI_AVATAR_ID);
    expect(getCiviAvatarUrl()).toContain('civi-option-c.svg');
  });

  it('persists Gather and Companion', () => {
    setCiviAvatarId('gather');
    expect(getCiviAvatarId()).toBe('gather');
    expect(getCiviAvatarUrl()).toContain('civi-option-gather.svg');

    setCiviAvatarId('companion');
    expect(getCiviAvatarId()).toBe('companion');
    expect(getCiviAvatarUrl()).toContain('civi-option-companion.svg');
  });

  it('falls back to Civic C when storage is invalid', () => {
    window.localStorage.setItem(CIVI_AVATAR_STORAGE_KEY, 'not-an-option');
    expect(getCiviAvatarId()).toBe('c');
    expect(getCiviAvatarUrl()).toContain('civi-option-c.svg');
  });
});
