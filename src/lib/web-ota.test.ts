import { describe, expect, it } from 'vitest';
import { compareWebBundle, fetchWebOtaManifest, isWebOtaManifest, nativeShellSupportsBundle, type WebOtaManifest } from './web-ota';

const manifest: WebOtaManifest = {
  platform: 'android',
  channel: 'web-ota',
  bundleVersion: '0.1.230',
  bundlePath: '/updates/bundles/civizen-web-0.1.230.zip',
  bundleUrl: 'https://civizen.world/updates/bundles/civizen-web-0.1.230.zip',
  bundleSha256: 'a'.repeat(64),
  bundleSize: 1234,
  minNative: { version: '0.1.200', buildNumber: 200 },
  mandatory: false,
  publishedAt: '2026-10-10T00:00:00Z',
};

describe('web OTA manifest', () => {
  it('validates the manifest shape and rejects a bad hash', () => {
    expect(isWebOtaManifest(manifest)).toBe(true);
    expect(isWebOtaManifest({ ...manifest, bundleSha256: 'nope' })).toBe(false);
    expect(isWebOtaManifest({ ...manifest, channel: 'native' })).toBe(false);
    expect(isWebOtaManifest(null)).toBe(false);
  });

  it('compares the published bundle with the running web layer', () => {
    expect(compareWebBundle(manifest, '0.1.229')).toBe('newer_published');
    expect(compareWebBundle(manifest, '0.1.230')).toBe('current');
    expect(compareWebBundle(manifest, '0.1.231')).toBe('ahead_of_manifest');
  });

  it('checks the native shell floor', () => {
    expect(nativeShellSupportsBundle(manifest, { version: '0.1.229', buildNumber: 229 })).toBe(true);
    expect(nativeShellSupportsBundle(manifest, { version: '0.1.199', buildNumber: 199 })).toBe(false);
  });

  it('fetches and validates, returning null on any failure', async () => {
    const ok = (async () => ({ ok: true, json: async () => manifest })) as unknown as typeof fetch;
    expect((await fetchWebOtaManifest(ok))?.bundleVersion).toBe('0.1.230');
    const bad = (async () => ({ ok: true, json: async () => ({ hello: 1 }) })) as unknown as typeof fetch;
    expect(await fetchWebOtaManifest(bad)).toBeNull();
    const down = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await fetchWebOtaManifest(down)).toBeNull();
  });
});
