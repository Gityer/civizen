# Android native overlays

Tracked sources for Android files that Capacitor sync would otherwise leave as stock defaults.

`scripts/apply-android-native-overlays.sh` copies these into the local `android/` tree after `npx cap sync android` (also hooked from `scripts/update-application.sh`).

| Overlay | Purpose |
|---|---|
| `ApkUpdaterPlugin.java` | In-app APK download + system installer |
| `BiometricAuthPlugin.java` | Biometric unlock of the stored session (Settings > Privacy) |
| `MainActivity.java` | Registers `ApkUpdater` and `BiometricAuth` (an unregistered plugin is invisible to the web layer) |
| `AndroidManifest.xml` | `REQUEST_INSTALL_PACKAGES`, `READ_CONTACTS` (write contacts stripped) |
| `file_paths.xml` | Cache path for downloaded APKs |
