import { APP_RELEASE_ID } from '@/lib/app-release';
import type { AppUpdateChannel } from '@/lib/update-channel';

export const PUBLIC_APP_ORIGIN = 'https://civizen.world';
/** Signed release builds (decision D10) are `civizen-android-*`; debug builds keep `civizen-debug-*`. Matches `versioned_apk_filename(release)` in `scripts/update-application.sh`. */
export const ANDROID_SIGNING: 'debug' | 'release' = import.meta.env.VITE_ANDROID_SIGNING === 'release' ? 'release' : 'debug';
export const ANDROID_DOWNLOAD_FILENAME = `${ANDROID_SIGNING === 'release' ? 'civizen-android' : 'civizen-debug'}-release-${APP_RELEASE_ID}.apk`;
export const ANDROID_DOWNLOAD_PATH = `/downloads/${ANDROID_DOWNLOAD_FILENAME}`;
export const ANDROID_DOWNLOAD_QUERY = `v=${encodeURIComponent(APP_RELEASE_ID)}&h=apk`;
export const LEGACY_ANDROID_DOWNLOAD_PATH = '/downloads/civizen-debug.apk';
export const ANDROID_DOWNLOAD_URL = new URL(`${ANDROID_DOWNLOAD_PATH}?${ANDROID_DOWNLOAD_QUERY}`, PUBLIC_APP_ORIGIN).toString();
/** Prefer this for QR codes — shows install steps; Android auto-starts the APK download. */
export const ANDROID_INSTALL_PAGE_URL = new URL('/download', PUBLIC_APP_ORIGIN).toString();

export function getAndroidUpdateManifestPath(channel: AppUpdateChannel) {
  return channel === 'testing' ? '/updates/android-testing.json' : '/updates/android-release.json';
}

export function getAndroidUpdateScriptPath(channel: AppUpdateChannel) {
  return channel === 'testing' ? '/updates/android-testing.js' : '/updates/android-release.js';
}

export function getAndroidUpdateManifestUrl(channel: AppUpdateChannel) {
  return new URL(getAndroidUpdateManifestPath(channel), PUBLIC_APP_ORIGIN).toString();
}

export function getAndroidUpdateScriptUrl(channel: AppUpdateChannel) {
  return new URL(getAndroidUpdateScriptPath(channel), PUBLIC_APP_ORIGIN).toString();
}
