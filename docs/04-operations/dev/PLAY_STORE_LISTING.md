# Google Play internal track: what is ready and what the owner does

Phase 9 step 9.2 (decision D7). Everything below the first table is prepared in the repository; the owner steps need
the Play Console account, which only Armen can open (one-time 25 USD registration, identity verification).

## Ready in the repository

| Item | Where |
| --- | --- |
| Signed release bundle (`.aab`) built by every release | `android-release/civizen-<release id>.aab` locally; copy in the private vault `projects/civizen/play-bundles/` |
| Signed release APK (sideload channel) | `public/downloads/civizen-android-release-<release id>.apk`, SHA-256 in `/updates/android-release.json` |
| Release keystore (upload key) | private vault `projects/civizen/release-keystore/` (decision D10); certificate SHA-256 `E1:15:07:71:94:2A:36:A8:41:A4:E2:7B:A9:9F:C1:10:BB:4F:38:A6:31:EB:3E:F3:A1:96:E8:B2:33:9E:C2:2E` |
| Privacy policy URL (required by Play) | https://civizen.world/privacy (interim Privacy Notice, professional review pending) |
| Terms of Use URL | https://civizen.world/terms |
| Application id / package | `com.civizen.app` |
| Version name and code | from `src/lib/app-release.ts` (`APP_VERSION`, `ANDROID_VERSION_CODE`), bumped by `npm run release:bump` |
| Web OTA inside the Play build | the Play build must **not** apply web bundles outside Play (policy); `VITE_DISTRIBUTION_CHANNEL=play` builds keep the updater inactive, see `OTA_UPDATES_PLAN.md` |

## Store listing text (draft, EN; HY and RU in the app's curated catalogs)

- **Title:** Civizen
- **Short description (80 chars):** A voluntary civic network: raise matters, decide together, keep records open.
- **Full description:** Civizen is a voluntary network for people who want to act as citizens of one humanity. Raise a
  Matter, discuss it with the people it is addressed to, turn it into a public consultation and vote with a receipt you
  can verify yourself. Read the charter, study civic learning paths, find or post work, make agreements, and message
  members with keys that stay on your device. Civizen is not a government and issues no legal documents; it is a civic
  network built in the open, audited in stages, in public.
- **Category:** Social. **Content rating questionnaire:** no violence, no gambling, user-generated content with
  moderation and reporting (Report this member, blocked users list), no location sharing by default.
- **Contact e-mail:** the address on https://civizen.world/contact

## Data safety form (answers from the Privacy Notice)

| Data | Collected | Shared | Purpose | Optional |
| --- | --- | --- | --- | --- |
| E-mail or phone, name, username | yes | no | account, profile | no |
| Photos (profile, ID for verification) | yes | no | profile, identity verification | yes |
| Approximate location (country, city) | yes | no | profile, filtering | yes |
| Messages | yes (encrypted) | no | messaging | yes |
| User-generated content (matters, proposals, ballots) | yes | public by design | civic participation | yes |
| Device identifiers | no | no | | |
| Crash logs / diagnostics | server logs only | no | security | |

Data is encrypted in transit; members can request deletion in the app (Settings › Account › Delete account) and
download their data (Settings › Account).

## Owner steps (one time)

1. Open a Google Play developer account at https://play.google.com/console/signup (25 USD, identity check).
2. Create the app `Civizen`, package `com.civizen.app`, and choose **Play App Signing**; upload the keystore
   certificate from the vault as the upload key when asked (or let Play generate its own signing key and register
   our key as the upload key).
3. Internal testing › create a release › upload the latest `android-release/civizen-<id>.aab`; add testers by e-mail.
4. Fill the store listing and the Data safety form from the sections above; paste the privacy policy URL.
5. After the first internal release, the release pipeline can publish new bundles through the Play Developer API
   with a service-account JSON (store it encrypted, never in the repository); until then uploads are manual.

## iOS (same decision, later)

An Apple Developer account (99 USD/year) and a Mac with Xcode are required to add the iOS project
(`npx cap add ios`), build and submit to TestFlight. Nothing in the web layer blocks it; the owner opens the account
and the build runs on a Mac or a hosted macOS runner.
