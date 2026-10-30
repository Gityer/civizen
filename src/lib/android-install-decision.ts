import type { ApkInstallInfo } from '@/lib/apk-updater-plugin';
import { needsReinstallForSigning, type AndroidUpdateManifest } from '@/lib/app-updates';

/** Package name of Google Play, as reported by Android for an app installed from Play. */
export const PLAY_STORE_INSTALLER = 'com.android.vending';

/** What to do when the member taps Update: install in place, uninstall once and reinstall, or go to Google Play. */
export type AndroidInstallAction = 'update' | 'reinstall' | 'play';

function normalizeCertificate(value: string) {
  return value.replace(/[^0-9a-f]/gi, '').toLowerCase();
}

/** True when the manifest names a certificate and none of the installed app's certificates matches it. */
export function installedCertificateMismatch(
  manifest: Pick<AndroidUpdateManifest, 'signingCertSha256'>,
  info: Pick<ApkInstallInfo, 'certSha256'> | null,
): boolean {
  const target = manifest.signingCertSha256 ? normalizeCertificate(manifest.signingCertSha256) : '';
  if (!target || !info || info.certSha256.length === 0) return false;
  return !info.certSha256.some((certificate) => normalizeCertificate(certificate) === target);
}

/**
 * Decides from what Android reports about the installed app. A copy installed from Google Play updates through
 * Google Play (Play re-signs the app, so a sideloaded APK can never replace it). Otherwise the installed certificate is
 * compared with the one the update is signed with. When Android reports nothing (older native shell) or the manifest has
 * no certificate yet, the build-time signing flag decides, as before.
 */
export function resolveAndroidInstallAction(
  manifest: Pick<AndroidUpdateManifest, 'signing' | 'signingCertSha256'>,
  info: ApkInstallInfo | null,
): AndroidInstallAction {
  if (info?.installer === PLAY_STORE_INSTALLER) return 'play';
  if (info && info.certSha256.length > 0 && manifest.signingCertSha256) {
    return installedCertificateMismatch(manifest, info) ? 'reinstall' : 'update';
  }
  return needsReinstallForSigning(manifest) ? 'reinstall' : 'update';
}

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.civizen.app';
