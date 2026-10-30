import { describe, expect, it } from 'vitest';
import {
  installedCertificateMismatch,
  PLAY_STORE_INSTALLER,
  resolveAndroidInstallAction,
} from '@/lib/android-install-decision';

const RELEASE_CERT = 'e11507712a0e4f6b8e7c4d6dd7b4f2c9a8d3c1b0f4a5e6d7c8b9a0f1e2d3c4b5';
const OTHER_CERT = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';

const releaseManifest = { signing: 'release' as const, signingCertSha256: RELEASE_CERT };

describe('android install decision', () => {
  it('updates in place when the installed certificate is the one the update is signed with', () => {
    expect(resolveAndroidInstallAction(releaseManifest, { certSha256: [RELEASE_CERT], installer: null })).toBe('update');
  });

  it('asks for a one-time reinstall when the installed certificate differs, whatever the build flag says', () => {
    expect(resolveAndroidInstallAction(releaseManifest, { certSha256: [OTHER_CERT], installer: null })).toBe('reinstall');
    expect(installedCertificateMismatch(releaseManifest, { certSha256: [OTHER_CERT] })).toBe(true);
  });

  it('matches a certificate written with colons or capitals', () => {
    const spaced = RELEASE_CERT.toUpperCase().match(/../g)!.join(':');
    expect(installedCertificateMismatch({ signingCertSha256: spaced }, { certSha256: [RELEASE_CERT] })).toBe(false);
  });

  it('accepts any of several installed certificates (key rotation history)', () => {
    expect(resolveAndroidInstallAction(releaseManifest, { certSha256: [OTHER_CERT, RELEASE_CERT], installer: null })).toBe('update');
  });

  it('sends a Google Play install to Google Play, even when the certificates differ', () => {
    expect(resolveAndroidInstallAction(releaseManifest, { certSha256: [OTHER_CERT], installer: PLAY_STORE_INSTALLER })).toBe('play');
  });

  it('falls back to the build-time signing flag when Android reports nothing or the manifest has no certificate', () => {
    // flag in the test build is "debug" (VITE_ANDROID_SIGNING unset), so a release update needs a reinstall
    expect(resolveAndroidInstallAction({ signing: 'release' }, null)).toBe('reinstall');
    expect(resolveAndroidInstallAction({ signing: 'debug' }, null)).toBe('update');
    expect(resolveAndroidInstallAction({ signing: 'release' }, { certSha256: [OTHER_CERT], installer: null })).toBe('reinstall');
    expect(resolveAndroidInstallAction(releaseManifest, { certSha256: [], installer: null })).toBe('reinstall');
  });

  it('does not report a mismatch it cannot prove', () => {
    expect(installedCertificateMismatch({}, { certSha256: [OTHER_CERT] })).toBe(false);
    expect(installedCertificateMismatch(releaseManifest, null)).toBe(false);
  });
});
