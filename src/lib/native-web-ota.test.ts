import { beforeEach, describe, expect, it, vi } from 'vitest';

const capacitorState = { native: true, platform: 'android' };
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => capacitorState.native, getPlatform: () => capacitorState.platform },
}));

const plugin = {
  notifyAppReady: vi.fn(async () => ({ bundle: { id: 'builtin' } })),
  current: vi.fn(async () => ({ bundle: { id: 'builtin', version: '0.1.230', status: 'success' } })),
  download: vi.fn(async (o: { version: string }) => ({ id: 'b-' + o.version, version: o.version })),
  set: vi.fn(async () => undefined),
  list: vi.fn(async () => ({ bundles: [] })),
  delete: vi.fn(async () => undefined),
};
vi.mock('@capgo/capacitor-updater', () => ({ CapacitorUpdater: plugin }));
vi.mock('@/lib/app-release', () => ({ APP_VERSION: '0.1.230', APP_VERSION_TAG: 'v0.1.230', ANDROID_VERSION_CODE: 230, APP_RELEASE_ID: 'r' }));

import { applyNativeWebOta, markWebBundleReady } from './native-web-ota';
import type { WebOtaManifest } from './web-ota';

const manifest = (version: string, minBuild = 200): WebOtaManifest => ({
  platform: 'android', channel: 'web-ota', bundleVersion: version, bundlePath: `/updates/bundles/civizen-web-${version}.zip`,
  bundleUrl: `https://civizen.world/updates/bundles/civizen-web-${version}.zip`, bundleSha256: 'a'.repeat(64), bundleSize: 10,
  minNative: { version: '0.1.200', buildNumber: minBuild }, mandatory: false, publishedAt: '2026-10-11T00:00:00Z',
});

describe('native web OTA', () => {
  beforeEach(() => { window.localStorage.clear(); vi.clearAllMocks(); capacitorState.native = true; });

  it('does nothing on the web', async () => {
    capacitorState.native = false;
    expect(await applyNativeWebOta(async () => manifest('0.1.231'))).toBe('not_native');
    await markWebBundleReady();
    expect(plugin.notifyAppReady).not.toHaveBeenCalled();
  });

  it('reports the bundle ready on the shell so the updater does not roll back', async () => {
    await markWebBundleReady();
    expect(plugin.notifyAppReady).toHaveBeenCalledTimes(1);
  });

  it('downloads and activates a newer published bundle with its checksum', async () => {
    expect(await applyNativeWebOta(async () => manifest('0.1.231'))).toBe('applied');
    expect(plugin.download).toHaveBeenCalledWith({ url: 'https://civizen.world/updates/bundles/civizen-web-0.1.231.zip', version: '0.1.231', checksum: 'a'.repeat(64) });
    expect(plugin.set).toHaveBeenCalledWith({ id: 'b-0.1.231' });
  });

  it('leaves a current bundle, an unsupported shell and a missing manifest alone', async () => {
    expect(await applyNativeWebOta(async () => manifest('0.1.230'))).toBe('current');
    expect(await applyNativeWebOta(async () => manifest('0.1.231', 999))).toBe('native_too_old');
    expect(await applyNativeWebOta(async () => null)).toBe('no_manifest');
    expect(plugin.download).not.toHaveBeenCalled();
  });

  it('does not retry a failed bundle for a while', async () => {
    plugin.download.mockRejectedValueOnce(new Error('checksum mismatch'));
    expect(await applyNativeWebOta(async () => manifest('0.1.231'))).toBe('failed');
    expect(await applyNativeWebOta(async () => manifest('0.1.231'))).toBe('recently_failed');
    expect(plugin.set).not.toHaveBeenCalled();
  });
});
