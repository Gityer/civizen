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

## Android update policy (production by default, testing when something must be tried first)

The website is deployed straight to production on every release. The Android sideload build follows the same rule: `npm run update:application` publishes **both** tracks (Testing and Production) from one build, so members on either track get the new version at once.

Use the Testing track only when a change should be tried on a device before everyone gets it (native Android code, Capacitor plugins, update-prompt changes, or anything the agent wants Armen to try first):

```bash
npm run release:testing          # CIVIZEN_UPDATE_CHANNEL=testing: Testing track only
```

Once it is tested, mark it tested, which copies the same bytes to the Production track and rebuilds the site:

```bash
npm run release:mark-tested      # = promote:android-testing-to-release + build
```

Then deploy `dist/`. Do not leave a build on the Testing track without a plan to mark it tested; in 2026 three versions (0.1.197 to 0.1.199) reached testers only because the promotion step was never run.

On native Android sideload builds, the app loads **only the manifest for the track** the user chose in **Settings** (Production vs Testing). Switching tracks triggers an immediate check against the server for that track's latest version.

## E-mail digest (optional sender)

The daily notification digest is an edge function (`supabase/functions/notification-digest`). It only sends when the
functions container has `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME`
(the same values GoTrue uses) and `DIGEST_CRON_SECRET`, and when a host cron posts to it once a day:

```
curl -fsS -X POST -H "x-digest-secret: $DIGEST_CRON_SECRET" https://<functions-host>/notification-digest
```

`DIGEST_DRY_RUN=1` makes it list candidates without mailing. Members opt in under Settings > Privacy; nobody is
mailed by default.

## Database migrations

The hosted database receives `supabase/migrations/` only at release time, by hand, by someone with database
access (`REMOTE_DB_ACCESS.md`). The web bundle must never ship before the functions and policies it calls exist
on production, so the order is always:

1. Full backup first (`pg_dump` custom format, kept on the host under `~/civizen-db-backups/`).
2. Apply each new migration file in timestamp order, statement by statement (the same way
   `scripts/local-supabase/replay-migrations.sh` does locally), each file in its own transaction.
3. Run the matching `supabase/tests/*_test.sql` checks against the local stack beforehand; after the apply,
   run the read-only post-check (object presence, policies, grants) on production.
4. Copy changed edge functions into the functions volume and restart the functions container.
5. Only then build and deploy the web bundle.

Record the applied range and the backup file name in the plan tracker
(`docs/03-platform/product-design/product-inventory-and-implementation-plan-2026-10-07.md`, Section 10).

## Release Flow

1. Bump the release version.

```bash
npm run release:bump -- patch
```

`release:bump` also regenerates the Civi knowledge pack (`src/lib/assistant/generated/knowledge-pack.ts` and `supabase/functions/messaging-agent-reply/civi-bundle.js`); commit both with the release and copy the bundle to the functions volume when deploying. CI's `assistant:knowledge:check` fails when the pack lags the app version (it did for v0.1.202 and v0.1.203).

You can also use `minor`, `major`, or an explicit version such as:

```bash
npm run release:bump -- 0.1.5
```

2. Build and publish the application artifacts locally.

```bash
npm run update:application
```

By default this publishes **both** channels from one build. You can narrow it with:

```bash
CIVIZEN_UPDATE_CHANNEL=testing npm run update:application
CIVIZEN_UPDATE_CHANNEL=release npm run update:application
CIVIZEN_UPDATE_CHANNEL=both npm run update:application
```

Use `CIVIZEN_UPDATE_CHANNEL=testing` when the build must be tried on a device first; `npm run release:mark-tested` then promotes it.

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
