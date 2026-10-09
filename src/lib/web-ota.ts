import { APP_VERSION } from '@/lib/app-release';
import { compareVersions } from '@/lib/app-updates';

/**
 * Web OTA manifest (Phase 9 step 9.3, per docs/04-operations/dev/OTA_UPDATES_PLAN.md). Every web release publishes a
 * zipped, hashed web bundle and this manifest next to the APK manifests. The web app reads it to show which web
 * layer is published versus which one is running; the native shell's download-and-activate step needs a native
 * plugin and a signed APK release (owner decisions D7 and D10), so until then a newer web bundle on the sideload
 * channel is reported, not applied.
 */
export const WEB_OTA_MANIFEST_PATH = '/updates/web-android.json';

export type WebOtaManifest = {
  platform: 'android';
  channel: 'web-ota';
  bundleVersion: string;
  bundlePath: string;
  bundleUrl: string;
  bundleSha256: string;
  bundleSize: number;
  minNative: { version: string; buildNumber: number };
  mandatory: boolean;
  publishedAt: string;
  notes?: string[];
};

export function isWebOtaManifest(value: unknown): value is WebOtaManifest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.platform === 'android'
    && v.channel === 'web-ota'
    && typeof v.bundleVersion === 'string'
    && typeof v.bundlePath === 'string'
    && typeof v.bundleSha256 === 'string'
    && /^[0-9a-f]{64}$/.test(v.bundleSha256 as string)
    && typeof v.bundleSize === 'number'
    && typeof v.minNative === 'object'
    && v.minNative !== null
  );
}

export type WebOtaStatus = 'current' | 'newer_published' | 'ahead_of_manifest';

/** How the running web layer relates to the published bundle. */
export function compareWebBundle(manifest: WebOtaManifest, runningVersion = APP_VERSION): WebOtaStatus {
  const diff = compareVersions(manifest.bundleVersion, runningVersion);
  if (diff > 0) return 'newer_published';
  if (diff < 0) return 'ahead_of_manifest';
  return 'current';
}

/** Whether the installed native shell may run this bundle at all. */
export function nativeShellSupportsBundle(manifest: WebOtaManifest, native: { version: string; buildNumber: number }): boolean {
  return native.buildNumber >= manifest.minNative.buildNumber && compareVersions(native.version, manifest.minNative.version) >= 0;
}

export async function fetchWebOtaManifest(fetchImpl: typeof fetch = fetch): Promise<WebOtaManifest | null> {
  try {
    const response = await fetchImpl(`${WEB_OTA_MANIFEST_PATH}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isWebOtaManifest(body) ? body : null;
  } catch {
    return null;
  }
}
