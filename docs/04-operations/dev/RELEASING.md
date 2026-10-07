# Releasing

This project keeps source code in GitHub. APK files must not be committed or pushed; they exist only as local build artifacts and as published download files on the live site.

Public documentation covers release policy and local build steps only. Production access, host topology, and deployment runbooks live in the access-controlled operations store.

## Rules

- Do not commit or push APK files to GitHub.
- Keep release metadata in `src/lib/app-release.ts` as the source of truth.
- After each release, verify both the live website and the live Android download path on `https://civizen.world`.
- Set distribution channel per target build:
  - `VITE_DISTRIBUTION_CHANNEL=sideload` for direct APK distribution
  - `VITE_DISTRIBUTION_CHANNEL=play-store` for Google Play builds
  - `VITE_DISTRIBUTION_CHANNEL=app-store` for iOS App Store builds

## Android update policy (testing first, then production)

1. **Ship new work to testing first**  
   After bumping `src/lib/app-release.ts`, publish **only the testing channel** (or use the default `both` only when you intentionally want production to jump in the same step):

   ```bash
   CIVIZEN_UPDATE_CHANNEL=testing npm run update:application
   ```

   Publish the testing manifests and matching testing APK so sideload testers pick it up.

2. **Soak and verify**  
   Keep the build on the **Testing** track until you are satisfied there are **no bug reports** (or other release blockers) on that testing version.

3. **Promote the same tested build to production**  
   When the testing build is approved, copy it to the **release** channel (same bytes, production URLs):

   ```bash
   npm run promote:android-testing-to-release
   ```

   Then publish the updated release manifests and release APK alongside the testing artifacts.

4. **App behavior**  
   On native Android sideload builds, the app loads **only the manifest for the track** the user chose in **Settings** (Production vs Testing). Switching tracks triggers an immediate check against the server for that track’s latest version.

## Release Flow

1. Bump the release version.

```bash
npm run release:bump -- patch
```

You can also use `minor`, `major`, or an explicit version such as:

```bash
npm run release:bump -- 0.1.5
```

2. Build and publish the testing application artifacts locally.

```bash
npm run update:application
```

By default this publishes the **Testing** channel only. Production is intentionally unchanged until an authorized promotion happens. You can override with:

```bash
CIVIZEN_UPDATE_CHANNEL=testing npm run update:application
CIVIZEN_UPDATE_CHANNEL=release npm run update:application
CIVIZEN_UPDATE_CHANNEL=both npm run update:application
```

Use `CIVIZEN_UPDATE_CHANNEL=both` only for an emergency release when maintainers have explicitly approved skipping the normal testing soak.

For direct website APK distribution, run with:

```bash
VITE_DISTRIBUTION_CHANNEL=sideload npm run update:application
```

This script:

- builds the web app
- syncs Capacitor Android assets
- builds the Android APK
- writes the versioned APK into `public/downloads/`
- regenerates the selected channel manifests under `public/updates/`
- rebuilds `dist/`

3. Publish `dist/` through the project’s controlled deployment procedures when restricted ops configuration is available. Do not document production access, host paths, or deploy internals in this public file.

4. Verify the live release.

Check:

- `https://civizen.world`
- `https://civizen.world/download`
- `https://civizen.world/updates/android.json`
- the current versioned APK URL referenced by the manifest

Confirm:

- the site serves the new JS bundle
- the manifest version/build matches `src/lib/app-release.ts`
- the APK URL returns the new file
- the installed app shows the correct version/build in Settings

5. Commit and push source-only changes.

```bash
git add .
git commit -m "feat: release vX.Y.Z"
git push origin main
```

Before committing, confirm APK files are not staged:

```bash
git status --short
```

## Building from a clean worktree

When other sessions have uncommitted work in the main checkout, build the release from a clean `git worktree` of the commit you are shipping so none of their files reach the bundle. The Android project keeps several files out of git (`android/gradlew`, `gradle/wrapper/`, `gradle.properties`, `settings.gradle`, `variables.gradle`, `capacitor.settings.gradle`, `local.properties` and `app/src/main/res/`), so copy them in first without overwriting tracked files:

```bash
git worktree add -b release/vX.Y.Z ../civizen-release main
ln -s "$PWD/node_modules" ../civizen-release/node_modules
cp .env .env.local ../civizen-release/
rsync -a --ignore-existing --exclude build/ --exclude .gradle/ --exclude app/src/main/assets/public/ android/ ../civizen-release/android/
```

Run the bump, build and deploy steps inside `../civizen-release`, commit the release there, then fast-forward `main` to it and remove the worktree.

## Quick Commands

```bash
npm run release:bump -- patch
npm run update:application
git status --short
```

## Android identity

Android `applicationId` is `com.civizen.app`. Users should install the Civizen APK from `https://civizen.world/download`.
