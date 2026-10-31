import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Android tree is gitignored; native code ships through native/android overlays. A plugin class that is
// not in the overlays, or not registered in the overlay MainActivity, silently disappears from the app
// (2026-10: the biometric sign-in toggle could never work for that reason).
const OVERLAY_JAVA = join(process.cwd(), 'native/android/app/src/main/java/com/civizen/app');

function overlayPluginClasses(): string[] {
  return readdirSync(OVERLAY_JAVA)
    .filter((file) => file.endsWith('.java'))
    .filter((file) => readFileSync(join(OVERLAY_JAVA, file), 'utf8').includes('@CapacitorPlugin('))
    .map((file) => file.replace(/\.java$/, ''));
}

describe('native Android overlays', () => {
  it('register every custom Capacitor plugin in MainActivity', () => {
    const mainActivity = readFileSync(join(OVERLAY_JAVA, 'MainActivity.java'), 'utf8');
    const plugins = overlayPluginClasses();
    expect(plugins).toEqual(expect.arrayContaining(['ApkUpdaterPlugin', 'BiometricAuthPlugin']));
    for (const plugin of plugins) {
      expect(mainActivity).toContain(`registerPlugin(${plugin}.class)`);
    }
  });

  // v0.1.246-0.1.248 read the app's own signing certificate and installer; Google Play Protect then blocked the
  // sideloaded update as "Harmful app" (31 Oct 2026). The plugin must not query package signatures or install sources.
  it('keep the update plugin away from package-signature and installer queries, and the release script still publishing the certificate', () => {
    const plugin = readFileSync(join(OVERLAY_JAVA, 'ApkUpdaterPlugin.java'), 'utf8');
    expect(plugin).not.toContain('getInstallInfo');
    expect(plugin).not.toContain('GET_SIGNING_CERTIFICATES');
    expect(plugin).not.toContain('GET_SIGNATURES');
    expect(plugin).not.toContain('getInstallSourceInfo');
    expect(plugin).not.toContain('getInstallerPackageName');
    const script = readFileSync(join(process.cwd(), 'scripts/update-application.sh'), 'utf8');
    expect(script).toContain('"signingCertSha256": "$apk_cert_sha256"');
    expect(script).toContain("signingCertSha256: '$apk_cert_sha256'");
  });

  it('are all copied by the overlay script', () => {
    const script = readFileSync(join(process.cwd(), 'scripts/apply-android-native-overlays.sh'), 'utf8');
    for (const plugin of overlayPluginClasses()) {
      expect(script).toContain(plugin);
    }
  });
});
