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

## Android signing and the Play bundle (decision D10, 2026-10-11)

Every Android build is signed with the Civizen release key when the keystore is available. The keystore and its
passwords live outside the repository: locally in `~/.civizen-secrets/civizen-release.keystore.properties`
(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`), in CI as `ANDROID_KEYSTORE_FILE` (a decoded keystore path)
plus `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. The owner's copy is in the private
vault (`projects/civizen/release-keystore/`). `scripts/update-application.sh` then runs `assembleRelease bundleRelease`,
publishes `civizen-android-<channel>-<release id>.apk` (manifests carry `"signing": "release"`) and keeps the Play
bundle in `android-release/` (gitignored; copy in the vault `projects/civizen/play-bundles/`). Without a keystore the
pipeline keeps the debug build and the `civizen-debug-*` names. Android cannot install a release-signed APK over a
debug-signed one: the app shows the reinstall notice once and the Download page says so. Play steps:
`PLAY_STORE_LISTING.md`.

The manifests also carry `signingCertSha256`, the SHA-256 of the certificate that signed the APK (read with
`apksigner`, or `keytool` for v1 signatures). Before it offers an in-place update the app asks Android for the
installed copy's real signing certificate and installer (`ApkUpdater.getInstallInfo`) and decides: a copy installed
from Google Play is sent to Google Play; a certificate that differs from `signingCertSha256` gets the one-time
uninstall-and-reinstall notice; otherwise the update installs in place. An older native shell, or a manifest without
the field, falls back to the build-time `signing` flag. Logic and tests: `src/lib/android-install-decision.ts`.

## Web OTA on the Android shell (step 9.3)

The release publishes `public/updates/web-android.json` and a deterministic zip of the web layer
(`scripts/publish-web-ota.sh`). On the sideload channel the app (`src/lib/native-web-ota.ts`, Capgo updater) downloads
a newer bundle with its SHA-256, activates it and restarts; a bundle that does not report ready within 10 s is rolled
back by the plugin. Store builds never do this (`VITE_DISTRIBUTION_CHANNEL`). A new native floor (`minNative`) still
goes through the APK update.

## E-mail digest (scheduled in the database since v2 step A3)

The daily notification digest is an edge function (`supabase/functions/notification-digest`). It sends only when the
functions container has the SMTP settings GoTrue uses (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME`) and `DIGEST_CRON_SECRET`. The schedule lives in the database, not on the host:
pg_cron job `notification_digest_tick` (06:00 UTC) calls the function through pg_net with the URL and secret stored in
the server-only row `notification_digest_config` (migration `20261013090000_notification_digest_schedule.sql`; an
operator fills that row once per environment). Every tick is logged in `notification_digest_runs`; staff read the last
runs and the HTTP answers with `notification_digest_recent_runs()`. `DIGEST_DRY_RUN=1` on the function lists
candidates without mailing. Members opt in under Settings > Privacy; nobody is mailed by default.

## Database migrations

The hosted database receives `supabase/migrations/` only at release time, by hand, by someone with database
access (`REMOTE_DB_ACCESS.md`). The web bundle must never ship before the functions and policies it calls exist
on production, so the order is always:

1. Full backup first: `scripts/db/backup-restore-drill.sh` on the host (see **Backups and the restore drill** below). It dumps, restores into a scratch database and checks every table's rows; use the dump only when it prints `DRILL OK`.
2. Apply each new migration file in timestamp order, statement by statement (the same way
   `scripts/local-supabase/replay-migrations.sh` does locally), each file in its own transaction.
3. Run the matching `supabase/tests/*_test.sql` checks against the local stack beforehand; after the apply,
   run the read-only post-check (object presence, policies, grants) on production.
4. Copy changed edge functions into the functions volume and restart the functions container.
5. Only then build and deploy the web bundle.

Record the applied range and the backup file name in the plan tracker
(`docs/03-platform/product-design/product-inventory-and-implementation-plan-2026-10-07.md`, Section 10).

### Backups and the restore drill

`scripts/db/backup-restore-drill.sh` runs where it can `docker exec` into the database container (`CIVIZEN_DB_CONTAINER`; the default is the local stack's). In order:

1. Dumps the database (custom format) into `CIVIZEN_BACKUP_DIR` and writes a `.sha256` next to the dump.
2. Restores the dump into a scratch database.
3. Compares the row count of every table in `public` and `auth`. A table that differs fails the drill, unless it is listed in `CIVIZEN_DRILL_VOLATILE` (tables written every minute, such as page views and sessions).
4. Drops the scratch database and keeps the newest `CIVIZEN_BACKUP_KEEP` dumps (default 14).
5. Hands the dump to `CIVIZEN_BACKUP_OFFSITE_CMD` when that is set (for example an rclone or scp command; the dump's path is appended).

It exits non-zero on any failure, so a scheduler can alert on it. A negative run (one row written after the dump) reports `MISMATCH` and exits 1.

What it does not cover yet (tracker row "(found) Backups"):

- **Uploaded files.** Storage objects (avatars, verification images, attachments) live in the storage volume, not in the database dump. They need their own copy.
- **Vault secrets and `cron` job definitions.** The scratch restore runs without the platform roles, so these are dumped but not verified. The restore reports about 50 warnings for platform-owned objects; the row counts decide.
- **Off-site storage.** `CIVIZEN_BACKUP_OFFSITE_CMD` pointing at storage that is not this host (not set yet; options below).

#### Daily timer (installed 2026-10-30)

The production host runs `civizen-daily-backup.timer` (systemd, 03:30 UTC, `Persistent=true`). It runs the drill through `/usr/local/sbin/civizen-daily-backup.sh` into `/home/ubuntu/civizen-daily-backups` and keeps the newest 7 dumps. On `DRILL OK` it writes `/var/lib/civizen-backup/last_ok` (UTC time); on any failure it writes `/var/lib/civizen-backup/ALERT` (time, exit code, log tail) and exits non-zero. The log of the last run is `/var/lib/civizen-backup/last.log`. Nothing watches these files by itself: whoever does the daily host check reads them, and an `ALERT` file, or a `last_ok` older than 36 hours, means the backup needs attention. The older pre-release dumps in `/home/ubuntu/civizen-db-backups` are separate and are not pruned by the timer.

#### Sign-up limit

The auth service runs with `GOTRUE_RATE_LIMIT_SIGN_IN_SIGN_UPS=300` (sign-ins and sign-ups per client address in 5 minutes), set in the host's Supabase `docker-compose.yml` (auth environment; earlier files in `/home/ubuntu/civizen-edge-backups`). It is deliberately high: auth sees one address for every password sign-in, because `sign-in-with-identifier` calls it from the functions container, and sign-ups reach it through nginx and Kong without a trusted client-IP header. A low value (10 was tried on 30 Oct) would lock every member out after a few sign-ins. Per-person limits live in `sign-in-with-identifier` (10 failures per identifier, 30 per caller IP, 15 minutes). A real per-address auth limit needs the client IP passed through (Kong trusted IPs plus `GOTRUE_RATE_LIMIT_HEADER`), tested on a copy of the stack first.

#### Off-site copy options (no purchase made)

The database dump is about 10 MB a day (70 MB for the 7 kept); uploaded files are in a separate, tiny volume. Any option stays within a few dollars a month.

| Option | How | Cost per month | Note |
| --- | --- | --- | --- |
| A. Object storage bucket (Backblaze B2 or Cloudflare R2) | `CIVIZEN_BACKUP_OFFSITE_CMD="rclone copy"` to the bucket | about 0 to 1 USD at this size (both give 10 GB free) | Best fit: independent of the host and the provider, one rclone line. Needs an account and an access key. |
| B. Second small server or VPS | `rsync` or `scp` over SSH | about 4 to 6 USD | Full control; one more machine to patch. |
| C. Armen's own storage (a home machine or Google Drive) | `rclone` or `scp` to it | 0 | Free, but depends on that machine being on; weakest guarantee. |

Recommended: A. Encrypt the dump before upload (`rclone crypt`), because it holds member data.

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
git add <the files the bump and build changed>
git commit -m "chore(release): vX.Y.Z ..."
npm run release:push
```

`release:push` pushes `main` to the canonical public repository (`origin`, maturehumanity/civizen) and to the mirror
(`gityer-mirror`) and fails unless both point at the local HEAD (decision E1: the public source never lags a
release). The Android manifest carries `sourceCommit`, and the Download page links that public commit next to the
APK checksum.

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
