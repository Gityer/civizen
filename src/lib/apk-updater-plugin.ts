import { registerPlugin } from '@capacitor/core';

export type ApkUpdaterDownloadResult = {
  ok: boolean;
  path?: string;
};

export type ApkUpdaterOpenResult = {
  ok: boolean;
};

/** Who signed the installed app and which store installed it (read from Android, not from a build flag). */
export type ApkInstallInfo = {
  /** SHA-256 of each signing certificate, lowercase hex without separators. */
  certSha256: string[];
  /** Package name of the installing store (for example com.android.vending), or null for a sideload. */
  installer: string | null;
};

export interface ApkUpdaterPlugin {
  downloadAndInstall(options: { url: string }): Promise<ApkUpdaterDownloadResult>;
  openExternalUrl(options: { url: string }): Promise<ApkUpdaterOpenResult>;
  getInstallInfo(): Promise<ApkInstallInfo>;
}

export const ApkUpdater = registerPlugin<ApkUpdaterPlugin>('ApkUpdater', {
  web: () => ({
    async downloadAndInstall() {
      throw new Error('In-app APK install is only available on Android sideload builds.');
    },
    async openExternalUrl() {
      throw new Error('External URL open is only available on Android sideload builds.');
    },
    async getInstallInfo() {
      throw new Error('Install info is only available on Android builds.');
    },
  }),
});

export const APK_INSTALL_PERMISSION_REQUIRED = 'INSTALL_PERMISSION_REQUIRED';

export function isApkInstallPermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === APK_INSTALL_PERMISSION_REQUIRED;
}
