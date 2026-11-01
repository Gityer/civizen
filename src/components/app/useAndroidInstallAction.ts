import { useEffect, useState } from 'react';

import { PLAY_STORE_URL, resolveAndroidInstallAction } from '@/lib/android-install-decision';
import { ApkUpdater, type ApkInstallInfo } from '@/lib/apk-updater-plugin';
import type { AndroidUpdateManifest } from '@/lib/app-updates';
import { ANDROID_INSTALL_PAGE_URL } from '@/lib/downloads';

/**
 * What Android itself says about the installed copy (its signing certificate and the store that installed it), and
 * the install action that follows for a given update. installInfo is null on older native shells, where the
 * build-time signing flag decides.
 */
export function useAndroidInstallAction(isAndroidNativeApp: boolean, manifest: AndroidUpdateManifest | undefined) {
  const [installInfo, setInstallInfo] = useState<ApkInstallInfo | null>(null);
  useEffect(() => {
    if (!isAndroidNativeApp) return;
    let cancelled = false;
    ApkUpdater.getInstallInfo()
      .then((info) => { if (!cancelled) setInstallInfo(info); })
      .catch(() => { /* older native shell: keep the flag-based decision */ });
    return () => { cancelled = true; };
  }, [isAndroidNativeApp]);
  const installAction = manifest ? resolveAndroidInstallAction(manifest, installInfo) : 'update';
  return { installInfo, installAction };
}

/**
 * Where the member goes instead of an in-app install, or null to install in place. A copy installed from Google Play
 * updates through Google Play (Play re-signs the app); an APK signed with another key cannot be installed over the
 * installed app, so the member reinstalls once from the download page (decision D10).
 */
export function externalUrlForUpdate(manifest: AndroidUpdateManifest, installInfo: ApkInstallInfo | null): string | null {
  const action = resolveAndroidInstallAction(manifest, installInfo);
  if (action === 'play') return PLAY_STORE_URL;
  if (action === 'reinstall') return ANDROID_INSTALL_PAGE_URL;
  return null;
}
