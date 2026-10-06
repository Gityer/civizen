// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  APP_UPDATE_CHANNEL_KEY,
  TEST_CHANNEL_AUTO_RETURN_MS,
  ensureAuthorizedAppUpdateChannel,
  getAppUpdateChannel,
  getAppUpdateChannelExpiresAt,
  setAppUpdateChannel,
} from '@/lib/update-channel';

describe('update channel selection', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.removeItem(APP_UPDATE_CHANNEL_KEY);
  });

  it('defaults to release', () => {
    window.localStorage.removeItem(APP_UPDATE_CHANNEL_KEY);

    expect(getAppUpdateChannel()).toBe('release');
    expect(getAppUpdateChannelExpiresAt()).toBeNull();
  });

  it('stores testing with an automatic return deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T10:00:00Z'));

    setAppUpdateChannel('testing');

    expect(getAppUpdateChannel()).toBe('testing');
    expect(getAppUpdateChannelExpiresAt()).toBe(Date.now() + TEST_CHANNEL_AUTO_RETURN_MS);
  });

  it('returns to release after the testing deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-19T10:00:00Z'));
    setAppUpdateChannel('testing');

    vi.setSystemTime(Date.now() + TEST_CHANNEL_AUTO_RETURN_MS + 1);

    expect(getAppUpdateChannel()).toBe('release');
    expect(getAppUpdateChannelExpiresAt()).toBeNull();
  });

  it('forces release when testing is not authorized', () => {
    setAppUpdateChannel('testing');
    expect(ensureAuthorizedAppUpdateChannel(false)).toBe('release');
    expect(getAppUpdateChannel()).toBe('release');
  });
});
