import { ANDROID_VERSION_CODE, APP_VERSION, APP_VERSION_TAG } from '@/lib/app-release';

export type AndroidUpdateManifest = {
  platform: 'android';
  version: string;
  versionTag?: string;
  buildNumber: number;
  releaseId: string;
  downloadPath: string;
  downloadUrl: string;
  publishedAt: string;
  notes?: string[];
  /** SHA-256 of the published APK, for members who verify the download (Phase 9 step 9.1). */
  sha256?: string;
};

export type InstalledAndroidRelease = {
  version: string;
  buildNumber: number;
};

export const CURRENT_ANDROID_RELEASE: InstalledAndroidRelease = {
  version: APP_VERSION,
  buildNumber: ANDROID_VERSION_CODE,
};

export const CURRENT_ANDROID_RELEASE_LABEL = `${APP_VERSION_TAG} (${ANDROID_VERSION_CODE})`;

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, '');
}

export function compareVersions(left: string, right: string) {
  const leftParts = normalizeVersion(left).split('.');
  const rightParts = normalizeVersion(right).split('.');
  const segmentCount = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < segmentCount; index += 1) {
    const leftPart = Number.parseInt(leftParts[index] ?? '0', 10);
    const rightPart = Number.parseInt(rightParts[index] ?? '0', 10);

    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

export function isAndroidUpdateAvailable(
  installedRelease: InstalledAndroidRelease,
  availableRelease: Pick<AndroidUpdateManifest, 'version' | 'buildNumber'>,
) {
  const versionComparison = compareVersions(availableRelease.version, installedRelease.version);

  if (versionComparison !== 0) {
    return versionComparison > 0;
  }

  return availableRelease.buildNumber > installedRelease.buildNumber;
}

export function shouldPromptForAndroidUpdate(
  installedRelease: InstalledAndroidRelease,
  availableRelease: AndroidUpdateManifest,
  dismissedReleaseId?: string | null,
) {
  if (dismissedReleaseId && dismissedReleaseId === availableRelease.releaseId) {
    return false;
  }

  return isAndroidUpdateAvailable(installedRelease, availableRelease);
}

export function formatReleaseLabel(version: string, buildNumber: number) {
  return `v${normalizeVersion(version)} (${buildNumber})`;
}

export function isAndroidUpdateManifest(value: unknown): value is AndroidUpdateManifest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Record<string, unknown>;

  return (
    manifest.platform === 'android'
    && typeof manifest.version === 'string'
    && typeof manifest.buildNumber === 'number'
    && typeof manifest.releaseId === 'string'
    && typeof manifest.downloadPath === 'string'
    && typeof manifest.downloadUrl === 'string'
    && typeof manifest.publishedAt === 'string'
    && (manifest.notes === undefined || Array.isArray(manifest.notes))
    && (manifest.sha256 === undefined || typeof manifest.sha256 === 'string')
  );
}
