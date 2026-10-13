---
title: Civizen QA test matrix
status: current
owner: Civizen QA (AyMe role "Civizen QA")
related:
  - regression-checklist.md
  - ../dev/profile-privacy.md
  - ../dev/content-moderation.md
  - ../../03-platform/product-design/product-inventory-and-plan-v2-2026-10-12.md
---

# Civizen QA test matrix

Role × feature × language × platform. A cell counts as verified only when a dated row in the
[verification log](#verification-log) backs it. Automated coverage on its own (a spec or SQL test exists) is
marked separately: it counts as evidence only for the run recorded in the log.

**Legend:** ✅ QA verified (see log) · 🤖 automated test exists, not yet re-verified by QA · ⏳ not yet tested ·
⛔ open defect (job id) · — not applicable to this role.

**Roles:** V visitor (signed out) · M member · C verified member / citizen · Mod moderator (`content.moderate`)
· S steward / founder (`role.assign` or `settings.manage`). Fixtures: `<username>@test.civizen.local` on the
local stack (`member`, `citizen`, `verified_member`, `moderator`, `market_manager`, `guest`, …). Never Armen's
account and never production writes.

## 1. Privacy and trust (always tested first)

| Check | V | M | C | Mod | S |
| --- | --- | --- | --- | --- | --- |
| Cannot read another member's birth date, place of birth, sex, phone, official IDs, SSN, city, region, permissions, settings (column privileges) | ✅ no rows | ✅ refused | ✅ refused | ✅ refused | — reads via `admin_list_profiles` |
| Cannot learn who owns a phone number | ✅ refused | ⛔ jf374edf6 | ⛔ jf374edf6 | ⛔ jf374edf6 | — |
| Cannot confirm a business account's e-mail | ✅ refused | ⛔ jf374edf6 (secondary) | ⛔ | ⛔ | — |
| Profile card follows the owner's switches (full name, country, city, score, endorsements) | ✅ no access | ✅ 🤖 privacy-visibility | ✅ | ✅ | sees all |
| Own row only via `my_profile()`; export holds own data | — | ✅ 🤖 account-export | ✅ | ✅ | ✅ |
| Privileged self-writes refused (role, verified flags, eligibility, Story defacement) | — | ✅ 🤖 member-trust-hardening | ⏳ | ⏳ | — |
| Identity-verification files: owner and reviewers only | — | ⏳ (policy read ✅) | ⏳ | ⏳ | ⏳ |
| Private message attachments: conversation members only | — | ⏳ (policy read ✅) | ⏳ | ⏳ | ⏳ |
| Edge functions return no private fields; sign-in does not reveal whether an account exists | ✅ code review | ✅ | ✅ | ✅ | ✅ |

## 2. Features by role (web)

| Area | V | M | C | Mod | S |
| --- | --- | --- | --- | --- | --- |
| Landing `/onboarding`, Why, Areas, Documents, About, Terms, Privacy, Guidelines | ⏳ | — | — | — | — |
| Return path on every guest sign-in / sign-up button | ✅ 🤖 public-matters-guest | — | — | — | — |
| Public Matters `/matters` (public only, no participant identities) | ✅ 🤖 public-matters-guest | ⏳ | ⏳ | ⏳ | ⏳ |
| Home feed, composer, getting-started card | — | ⏳ | ⏳ | ⏳ | ⏳ |
| Matters: raise, scope, discuss, work, decide, resolve | — | 🤖 participation-loop | 🤖 | ⏳ | ⏳ |
| Report anything → queue → hide with reason → one appeal → different moderator | — | ✅ 🤖 content-moderation | ✅ | ✅ | ⏳ |
| Governance: voting catalog, ballot pages, outcomes | ⏳ | ⏳ | ⏳ | — | ⏳ |
| Advisory ballot (member) / countable ballot (citizen), signed with the citizen key | — | ✅ 🤖 consultation-ballot | ✅ (signature re-check fixed 2026-10-13, not yet released) | — | — |
| Proposal from a Matter: draft, support, publish | — | ⏳ | ⏳ | — | ⏳ |
| Contribute: Opportunities, Challenges, Knowledge, Impact | — | 🤖 knowledge-proposal (partial) | ⏳ | — | ⏳ |
| Study: learning paths, lesson progress, badges | — | 🤖 study-paths | ⏳ | — | — |
| Messaging 1:1 E2EE, attachments, key backup, calls | — | 🤖 messaging-* | ⏳ | — | — |
| Notifications centre, web push, e-mail digest choice | — | ⏳ | ⏳ | ⏳ | ⏳ |
| Jobs / Market (public board, post, review) | ⏳ | ⏳ | ⏳ | — | ⏳ market_manager |
| Agreements, Earnings | — | ⏳ | ⏳ | — | ⏳ |
| Fund (inquiry), Transparency, Partners | ⏳ | ⏳ | — | — | ⏳ funding admin |
| Law library (`law.read`), Search (`profile.read`) | — (route gated) | ⏳ | ⏳ | — | ⏳ |
| Settings: profile, privacy, account, legal, help, pillars, messaging | — | ⏳ | ⏳ | ⏳ | ⏳ |
| Admin: users, roles, permissions, governance console, participation funnel, verification review | — | — (route gated ⏳) | — | — | ⏳ |
| Civi assistant (grounded, rate-limited) | ⏳ | ⏳ | ⏳ | — | — |

## 3. Languages

EN, HY and RU are curated (hand-written) for the participation loop; DE comes from the server-built language pack
(machine translation, labelled). Areas outside the loop are not curated yet (v2 plan §4.1).

| Surface | EN | HY | RU | DE |
| --- | --- | --- | --- | --- |
| Language switch persists, no untranslated keys on switch | 🤖 language-switch | 🤖 | 🤖 | ⏳ |
| Landing, sign-up / sign-in, chrome | ⏳ | ⏳ | ⏳ | ⏳ |
| Home, profile, settings | ⏳ | ⏳ | ⏳ | ⏳ |
| Matters, governance, voting, ballots | ⏳ | ⏳ | ⏳ | ⏳ |
| Report dialog, moderation queue, Guidelines `/guidelines` | ⏳ | ⏳ | ⏳ | ⏳ |
| Learning paths, charter, pathway | ⏳ | ⏳ | ⏳ | ⏳ |
| Agreement PDF renders the script (known: Times-Roman lacks Armenian/Cyrillic, plan E-phase) | ⏳ | ⛔ known | ⛔ known | ⏳ |

## 4. Platforms

| Check | Web desktop (1280) | Web phone (375) | Android app |
| --- | --- | --- | --- |
| Accessibility (axe, keyboard) | 🤖 a11y | ⏳ | — |
| Public header and footer layout at 1024 / 1280 / 375 | ⏳ | ⏳ | — |
| Signed release APK installs, checksum matches Download page, source commit link | — | — | ⏳ |
| Biometric sign-in toggle registers and unlocks | — | — | ⏳ (device needed) |
| Data export through the share sheet | — | — | ⏳ (device needed) |
| Web OTA update applies, rollback on bad bundle | — | — | ⏳ |
| Report / moderation / privacy flows inside the WebView | — | — | ⏳ |

## 5. How to run (local only)

- Use a Vite dev server pointed at the local stack (kong `http://127.0.0.1:56321`) and confirm the URL in the
  served `src/integrations/supabase/client.ts` before any run. The `civizen-web` container on :8080 talks to
  production: never run write flows against it.
- Run Playwright with **`--workers=1`** on the WSL machine. With several workers the cold dev server and parallel
  Chromium instances run out of memory ("Target crashed", "Loading…" timeouts); that is the environment, not a
  product failure.
- The specs import `/src/...` modules, so they need a dev server, not `vite preview`.
- Ports 8083–8085 are used by other Docker projects on this machine; pick another port.
- Read-only production checks run SQL inside `begin read only; … rollback;` and print counts, never personal values.

## Verification log

| Date (UTC) | Commit | What | Result | Evidence |
| --- | --- | --- | --- | --- |
| 2026-10-13 | 76f09be | Column-privilege audit of `profiles`, views, SECURITY DEFINER functions, storage policies, realtime publication (local) | Column rules hold; no view or realtime path; phone lookup and business e-mail lookup bypass found | `privacy-audit*.sql` (QA scratch), job jf374edf6 |
| 2026-10-13 | 76f09be | Phone lookup bypass reproduced as `member` against `citizen` (rolled back) | ⛔ returns username + full name for a submitted number; a 300-number sweep finds it | `phone-oracle-proof.sql`, job jf374edf6 |
| 2026-10-13 | production | Read-only: private columns selectable by members, table-wide SELECT, phone function grant, profiles with phone | 0 private columns, no table SELECT; phone function executable by members; 0 of 31 profiles carry a phone (no exposure yet) | read-only transaction, counts only |
| 2026-10-13 | 76f09be | e2e privacy-visibility, member-trust-hardening, public-matters-guest, content-moderation, account-export (`--workers=1`, local dev server) | 5/5 passed | Playwright list output |
| 2026-10-13 | 76f09be | e2e a11y, consultation-ballot, knowledge-proposal, language-switch, messaging-calls-inbox, messaging-key-backup, participation-loop, study-paths | 10/12; consultation-ballot: the verified member's signature showed "invalid", the run stopped before withdrawing, and the leftover countable ballot then failed the advisory test | Playwright output |
| 2026-10-13 | 76f09be + fix | Root cause: every stored governance signature (ballots, proposal create and publish) failed re-verification because the timestamp comes back from timestamptz as `+00:00` while the device signed the `Z` form; 12/12 local rows invalid as returned, 12/12 valid normalised. Fixed in `envelopeFromRow`; unit test with the database form (fails on the old code) | consultation-ballot 3/3, unit 11/11 | QA commit (signature timestamp fix) |
