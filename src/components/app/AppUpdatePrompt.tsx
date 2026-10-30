import { Capacitor } from '@capacitor/core';
import { useAppUpdateRecheck } from '@/components/app/useAppUpdateRecheck';
import { PLAY_STORE_URL, resolveAndroidInstallAction } from '@/lib/android-install-decision';
import { ANDROID_INSTALL_PAGE_URL } from '@/lib/downloads';
import { ApkUpdater, type ApkInstallInfo } from '@/lib/apk-updater-plugin';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CURRENT_ANDROID_RELEASE,
  CURRENT_ANDROID_RELEASE_LABEL,
  formatReleaseLabel,
  isAndroidUpdateAvailable,
  shouldPromptForAndroidUpdate,
  type AndroidUpdateManifest,
} from '@/lib/app-updates';
import { loadManifestForUserUpdateChannel } from '@/lib/android-update-manifest';
import {
  AndroidApkInstallPermissionError,
  installAndroidApkFromUrl,
} from '@/lib/android-apk-install';
import { permissionListHas } from '@/lib/access-control';
import { canUseExternalAndroidApkUpdates, DISTRIBUTION_CHANNEL } from '@/lib/distribution';
import { toast } from 'sonner';
import {
  ensureAuthorizedAppUpdateChannel,
  getAppUpdateChannel,
  type AppUpdateChannel,
} from '@/lib/update-channel';

const DISMISSED_ANDROID_KEYS: Record<AppUpdateChannel, string> = {
  release: 'civizen-dismissed-android-release',
  testing: 'civizen-dismissed-android-testing',
};
const PENDING_ANDROID_RELEASE_KEY = 'civizen-pending-android-release';
const UPDATE_INSTALL_GRACE_PERIOD_MS = 20 * 60 * 1000;
const STORAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 60;

type PendingAndroidRelease = {
  releaseId: string;
  startedAt: number;
  channel: AppUpdateChannel;
};

let dismissedReleaseMemory: string | null = null;
let dismissedTestingMemory: string | null = null;
let pendingReleaseMemory: PendingAndroidRelease | null = null;
let promptedReleaseMemory: string | null = null;

function toCookieKey(key: string) {
  return `civizen_${key.replace(/[^a-z0-9]+/gi, '_')}`;
}

function readCookieItem(key: string) {
  if (typeof document === 'undefined') return null;

  const cookieKey = `${toCookieKey(key)}=`;
  const parts = document.cookie.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(cookieKey)) continue;
    return decodeURIComponent(trimmed.slice(cookieKey.length));
  }

  return null;
}

function writeCookieItem(key: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${toCookieKey(key)}=${encodeURIComponent(value)}; Max-Age=${STORAGE_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

function removeCookieItem(key: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${toCookieKey(key)}=; Max-Age=0; Path=/; SameSite=Lax`;
}

function readStorageItem(key: string) {
  try {
    const localValue = window.localStorage.getItem(key);
    if (localValue !== null) {
      return localValue;
    }
  } catch {
    // Fall back to cookies when localStorage is unavailable on some mobile WebView states.
  }

  try {
    return readCookieItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Fall through to cookie persistence.
  }

  try {
    writeCookieItem(key, value);
  } catch {
    // Ignore storage failures and fall back to in-memory state.
  }
}

function removeStorageItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Fall through to cookie cleanup.
  }

  try {
    removeCookieItem(key);
  } catch {
    // Ignore storage access failures and fall back to in-memory state.
  }
}

function getDismissedReleaseId(channel: AppUpdateChannel) {
  const key = DISMISSED_ANDROID_KEYS[channel];
  const memory = channel === 'testing' ? dismissedTestingMemory : dismissedReleaseMemory;
  return readStorageItem(key) ?? memory;
}

function acknowledgeRelease(releaseId: string, channel: AppUpdateChannel) {
  writeStorageItem(DISMISSED_ANDROID_KEYS[channel], releaseId);
  if (channel === 'testing') {
    dismissedTestingMemory = releaseId;
  } else {
    dismissedReleaseMemory = releaseId;
  }
}

function clearAcknowledgedRelease(channel: AppUpdateChannel) {
  removeStorageItem(DISMISSED_ANDROID_KEYS[channel]);
  if (channel === 'testing') {
    dismissedTestingMemory = null;
  } else {
    dismissedReleaseMemory = null;
  }
}

function getPendingRelease(): PendingAndroidRelease | null {
  if (pendingReleaseMemory) return pendingReleaseMemory;
  const raw = readStorageItem(PENDING_ANDROID_RELEASE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingAndroidRelease;
    if (
      typeof parsed.releaseId === 'string' &&
      typeof parsed.startedAt === 'number' &&
      (parsed.channel === 'release' || parsed.channel === 'testing')
    ) {
      pendingReleaseMemory = parsed;
      return parsed;
    }
  } catch {
    // Ignore malformed pending state.
  }
  return null;
}

function markReleaseAsInstalling(releaseId: string, channel: AppUpdateChannel) {
  const pending: PendingAndroidRelease = {
    releaseId,
    startedAt: Date.now(),
    channel,
  };
  pendingReleaseMemory = pending;
  writeStorageItem(PENDING_ANDROID_RELEASE_KEY, JSON.stringify(pending));
}

function clearPendingRelease() {
  pendingReleaseMemory = null;
  removeStorageItem(PENDING_ANDROID_RELEASE_KEY);
}

export function AppUpdatePrompt() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [availableUpdate, setAvailableUpdate] = useState<{
    manifest: AndroidUpdateManifest;
    channel: AppUpdateChannel;
  } | null>(null);
  const [isLaunchingUpdate, setIsLaunchingUpdate] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const updateLaunchLockRef = useRef(false);
  const releaseLaunchTimeoutRef = useRef<number | null>(null);
  const waitingForInstallPermissionRef = useRef(false);
  const availableUpdateRef = useRef(availableUpdate);
  availableUpdateRef.current = availableUpdate;
  const allowsExternalAndroidApkUpdates = useMemo(
    () => canUseExternalAndroidApkUpdates(DISTRIBUTION_CHANNEL),
    [],
  );
  const isAndroidNativeApp = useMemo(
    () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android',
    [],
  );
  const shouldUseExternalApkPrompt = isAndroidNativeApp && allowsExternalAndroidApkUpdates;
  // What Android itself says about the installed copy (its signing certificate and the store that installed it);
  // null on older native shells, where the build-time signing flag decides.
  const [installInfo, setInstallInfo] = useState<ApkInstallInfo | null>(null);
  useEffect(() => {
    if (!isAndroidNativeApp) return;
    let cancelled = false;
    ApkUpdater.getInstallInfo()
      .then((info) => { if (!cancelled) setInstallInfo(info); })
      .catch(() => { /* older native shell: keep the flag-based decision */ });
    return () => { cancelled = true; };
  }, [isAndroidNativeApp]);
  const installAction = availableUpdate ? resolveAndroidInstallAction(availableUpdate.manifest, installInfo) : 'update';
  const allowTestingChannel = permissionListHas(profile?.effective_permissions || [], 'updates.test');

  const checkForUpdates = useCallback(async () => {
    if (!shouldUseExternalApkPrompt) {
      return;
    }

    try {
      ensureAuthorizedAppUpdateChannel(allowTestingChannel);
      const channel = getAppUpdateChannel();
      const manifest = await loadManifestForUserUpdateChannel();

      if (!manifest) {
        return;
      }

      const pendingRelease = getPendingRelease();
      if (pendingRelease) {
        const stillInstallingSameRelease =
          pendingRelease.channel === channel
          && pendingRelease.releaseId === manifest.releaseId
          && Date.now() - pendingRelease.startedAt < UPDATE_INSTALL_GRACE_PERIOD_MS;

        if (stillInstallingSameRelease) {
          setAvailableUpdate(null);
          return;
        }

        clearPendingRelease();
      }

      const dismissedReleaseId = getDismissedReleaseId(channel);
      const updateAvailable = isAndroidUpdateAvailable(CURRENT_ANDROID_RELEASE, manifest);

      if (updateAvailable && shouldPromptForAndroidUpdate(CURRENT_ANDROID_RELEASE, manifest, dismissedReleaseId)) {
        const promptedKey = `${channel}:${manifest.releaseId}`;
        if (promptedReleaseMemory === promptedKey) {
          return;
        }
        promptedReleaseMemory = promptedKey;
        setAvailableUpdate({ manifest, channel });
        return;
      }

      if (!updateAvailable && dismissedReleaseId === manifest.releaseId) {
        clearAcknowledgedRelease(channel);
      }

      if (!updateAvailable) {
        promptedReleaseMemory = null;
      }

      setAvailableUpdate(null);
    } catch {
      // Ignore update check failures so offline use remains unaffected.
    }
  }, [allowTestingChannel, shouldUseExternalApkPrompt]);

  useAppUpdateRecheck({
    enabled: shouldUseExternalApkPrompt,
    checkForUpdates,
    onDisabled: () => setAvailableUpdate(null),
    // User likely returned from the install-permission settings screen.
    waitingForPermission: () => Boolean(waitingForInstallPermissionRef.current && availableUpdateRef.current),
    onReturnWhileWaiting: () => setStatusMessage(t('appUpdate.permissionNeeded')),
    onCleanup: () => {
      if (releaseLaunchTimeoutRef.current !== null) {
        window.clearTimeout(releaseLaunchTimeoutRef.current);
        releaseLaunchTimeoutRef.current = null;
      }
    },
  });

  if (!shouldUseExternalApkPrompt || !availableUpdate) {
    return null;
  }

  const handleLater = () => {
    waitingForInstallPermissionRef.current = false;
    clearPendingRelease();
    acknowledgeRelease(availableUpdate.manifest.releaseId, availableUpdate.channel);
    promptedReleaseMemory = `${availableUpdate.channel}:${availableUpdate.manifest.releaseId}`;
    setAvailableUpdate(null);
    setStatusMessage(null);
  };

  const handleUpdate = () => {
    if (updateLaunchLockRef.current) return;
    const update = availableUpdateRef.current ?? availableUpdate;
    if (!update) return;
    const action = resolveAndroidInstallAction(update.manifest, installInfo);
    // A copy installed from Google Play updates through Google Play (Play re-signs the app).
    if (action === 'play') {
      void ApkUpdater.openExternalUrl({ url: PLAY_STORE_URL });
      return;
    }
    // Decision D10: an APK signed with another key cannot be installed over the installed app; send the member to the download page to reinstall once.
    if (action === 'reinstall') {
      void ApkUpdater.openExternalUrl({ url: ANDROID_INSTALL_PAGE_URL });
      return;
    }

    updateLaunchLockRef.current = true;
    setIsLaunchingUpdate(true);
    setStatusMessage(t('appUpdate.downloading'));

    // Do not permanently dismiss until install actually starts — otherwise a permission
    // or download failure permanently hides the prompt and users keep re-downloading manually.
    clearAcknowledgedRelease(update.channel);
    markReleaseAsInstalling(update.manifest.releaseId, update.channel);
    promptedReleaseMemory = `${update.channel}:${update.manifest.releaseId}`;

    void (async () => {
      try {
        const mode = await installAndroidApkFromUrl(update.manifest.downloadUrl);
        waitingForInstallPermissionRef.current = false;

        if (mode === 'native') {
          acknowledgeRelease(update.manifest.releaseId, update.channel);
          setStatusMessage(t('appUpdate.installReady'));
          setAvailableUpdate(null);
          return;
        }

        // External download fallback — keep grace period, close dialog for now.
        acknowledgeRelease(update.manifest.releaseId, update.channel);
        setAvailableUpdate(null);
      } catch (error) {
        clearPendingRelease();
        clearAcknowledgedRelease(update.channel);
        promptedReleaseMemory = null;

        if (error instanceof AndroidApkInstallPermissionError) {
          waitingForInstallPermissionRef.current = true;
          setStatusMessage(t('appUpdate.permissionNeeded'));
          toast.message(t('appUpdate.permissionNeeded'));
          // Keep the dialog open so the user can tap Update again after enabling permission.
          return;
        }

        waitingForInstallPermissionRef.current = false;
        toast.error(t('appUpdate.installFailed'));
        // Keep dialog open for another attempt.
        setAvailableUpdate(update);
      } finally {
        releaseLaunchTimeoutRef.current = window.setTimeout(() => {
          updateLaunchLockRef.current = false;
          setIsLaunchingUpdate(false);
          if (!waitingForInstallPermissionRef.current) {
            setStatusMessage(null);
          }
          releaseLaunchTimeoutRef.current = null;
        }, 2500);
      }
    })();
  };

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('appUpdate.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('appUpdate.description', {
              latestVersion: formatReleaseLabel(
                availableUpdate.manifest.version,
                availableUpdate.manifest.buildNumber,
              ),
              currentVersion: CURRENT_ANDROID_RELEASE_LABEL,
            })}
            {installAction === 'reinstall' ? (
              <span className="mt-3 block text-sm text-foreground" data-testid="app-update-reinstall">{t('appUpdate.reinstallSigned')}</span>
            ) : null}
            {installAction === 'play' ? (
              <span className="mt-3 block text-sm text-foreground" data-testid="app-update-play">{t('appUpdate.updateViaPlay')}</span>
            ) : null}
            {statusMessage ? (
              <span className="mt-3 block text-sm text-muted-foreground">{statusMessage}</span>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLater} disabled={isLaunchingUpdate}>
            {t('appUpdate.later')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleUpdate} disabled={isLaunchingUpdate}>
            {isLaunchingUpdate ? t('appUpdate.downloading') : installAction === 'play' ? t('appUpdate.openPlay') : installAction === 'reinstall' ? t('appUpdate.openDownload') : t('appUpdate.updateNow')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
