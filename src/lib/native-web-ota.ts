import { Capacitor } from '@capacitor/core';
import { CURRENT_ANDROID_RELEASE } from '@/lib/app-updates';
import { canUseExternalAndroidApkUpdates, DISTRIBUTION_CHANNEL } from '@/lib/distribution';
import { compareWebBundle, fetchWebOtaManifest, nativeShellSupportsBundle, type WebOtaManifest } from '@/lib/web-ota';

/**
 * Native web-OTA activation (Phase 9 step 9.3, per docs/04-operations/dev/OTA_UPDATES_PLAN.md). On the Android
 * shell the Capgo updater plugin downloads the published web bundle (zip, SHA-256 checked by the plugin), activates
 * it and restarts the WebView; a bundle that does not report ready within the plugin's timeout is rolled back
 * automatically. Only web assets change this way; a newer native floor still goes through the APK update.
 */
type UpdaterPlugin = {
  notifyAppReady(): Promise<unknown>;
  current(): Promise<{ bundle: { id: string; version: string; status: string } }>;
  download(options: { url: string; version: string; checksum?: string }): Promise<{ id: string; version: string }>;
  set(options: { id: string }): Promise<void>;
  list(): Promise<{ bundles: Array<{ id: string; version: string; status: string }> }>;
  delete(options: { id: string }): Promise<void>;
};

const OTA_STATE_KEY = 'civizen:web-ota:last-attempt';
const RETRY_AFTER_MS = 6 * 60 * 60 * 1000;

export type NativeOtaOutcome = 'not_native' | 'current' | 'native_too_old' | 'applied' | 'recently_failed' | 'failed' | 'no_manifest';

async function loadPlugin(): Promise<UpdaterPlugin | null> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return null;
  // Store builds update through the store only (Play policy); web OTA is for the sideload channel.
  if (!canUseExternalAndroidApkUpdates(DISTRIBUTION_CHANNEL)) return null;
  try {
    const mod = (await import('@capgo/capacitor-updater')) as unknown as { CapacitorUpdater: UpdaterPlugin };
    return mod.CapacitorUpdater;
  } catch {
    return null;
  }
}

function readLastAttempt(): { version: string; at: number; failed: boolean } | null {
  try {
    const raw = window.localStorage.getItem(OTA_STATE_KEY);
    return raw ? (JSON.parse(raw) as { version: string; at: number; failed: boolean }) : null;
  } catch {
    return null;
  }
}

function writeLastAttempt(version: string, failed: boolean) {
  try {
    window.localStorage.setItem(OTA_STATE_KEY, JSON.stringify({ version, at: Date.now(), failed }));
  } catch {
    /* storage unavailable: the next start simply tries again */
  }
}

/** Tells the plugin this bundle booted; without it, the plugin rolls back to the previous bundle. */
export async function markWebBundleReady(): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.notifyAppReady();
  } catch {
    /* never block the app on the updater */
  }
}

/** Downloads and activates a newer published web bundle on the Android shell; resolves with what happened. */
export async function applyNativeWebOta(manifestLoader: () => Promise<WebOtaManifest | null> = fetchWebOtaManifest): Promise<NativeOtaOutcome> {
  const plugin = await loadPlugin();
  if (!plugin) return 'not_native';
  const manifest = await manifestLoader();
  if (!manifest) return 'no_manifest';
  if (compareWebBundle(manifest) !== 'newer_published') return 'current';
  if (!nativeShellSupportsBundle(manifest, CURRENT_ANDROID_RELEASE)) return 'native_too_old';
  const last = readLastAttempt();
  if (last && last.version === manifest.bundleVersion && last.failed && Date.now() - last.at < RETRY_AFTER_MS) return 'recently_failed';
  try {
    const current = await plugin.current();
    if (current.bundle.version === manifest.bundleVersion) return 'current';
    const bundle = await plugin.download({ url: manifest.bundleUrl, version: manifest.bundleVersion, checksum: manifest.bundleSha256 });
    writeLastAttempt(manifest.bundleVersion, false);
    await plugin.set({ id: bundle.id }); // the WebView restarts here on success
    return 'applied';
  } catch (error) {
    console.warn('[web-ota] could not apply the published web bundle', error);
    writeLastAttempt(manifest.bundleVersion, true);
    return 'failed';
  }
}
