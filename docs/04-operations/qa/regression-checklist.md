---
title: Civizen release regression checklist
status: current
owner: Civizen QA
related:
  - test-matrix.md
  - ../dev/RELEASING.md
---

# Civizen release regression checklist

Run before a release is called verified, and after any change that touches the area. Every line needs evidence
(test output, screenshot, query count, commit) in the [test matrix verification log](test-matrix.md#verification-log).
Local stack only for writes; production is read-only.

## Privacy (every release)

- [ ] A member cannot read another member's private `profiles` columns: `has_column_privilege('authenticated', …)`
      is false for every column outside the public list in `profile-privacy.md`; no table-wide SELECT.
- [ ] No view in `public` reads `profiles` without `security_invoker`; `profiles` is not in the realtime publication.
- [ ] Every SECURITY DEFINER function executable by `authenticated` or `anon` that touches `profiles` or
      `auth.users` returns only what its feature needs and honours the owner's privacy switches (re-run the
      function audit; new functions since the last run need a reason).
- [ ] Phone and e-mail lookups do not identify members who have not opted in (job jf374edf6).
- [ ] `public_profile` masks full name, country, city, score and endorsements per the switches (e2e privacy-visibility).
- [ ] Private storage buckets stay private; ID-verification files readable by the owner and reviewers only.
- [ ] Privileged self-writes refused (e2e member-trust-hardening).

## Safety and moderation

- [ ] Report → queue → hide with reason → author sees the reason → one appeal → a different moderator decides →
      restore puts the item back exactly (e2e content-moderation).
- [ ] Hidden content invisible to other members in feed, Matter comments, Matter list and job board.
- [ ] Community Guidelines `/guidelines` linked from the report dialog, in EN/HY/RU.

## First visit and participation loop

- [ ] Guest opens a public Matter → signs up / in → returns to the same Matter (e2e public-matters-guest).
- [ ] Participants-only Matters stay hidden from guests.
- [ ] Member raises a Matter, comments, and the loop reaches a decision (e2e participation-loop).
- [ ] Advisory vs countable ballot recorded correctly; receipt and inclusion proof verify (e2e consultation-ballot).
- [ ] A stored ballot or proposal signature shows "verified" after a reload, not only right after casting (the
      database returns timestamps as `+00:00`; the check must restore the signed `Z` form).

## Account

- [ ] Data export downloads one JSON file holding the member's own profile (e2e account-export); on Android it
      opens the share sheet (device).
- [ ] Privacy notice `/privacy` linked from footer, sign-up, Terms, Settings, Help.

## Languages and layout

- [ ] Language switch EN ↔ HY ↔ RU ↔ DE persists; no raw keys or English fallbacks on the curated surfaces.
- [ ] Public header at 1024, 1280 and 375 px: no overlap.
- [ ] axe and keyboard checks pass (e2e a11y).

## Android (each release APK before it is called tested)

- [ ] Signed APK installs; SHA-256 equals the Download page; Download page links the public source commit.
- [ ] Web OTA update applies; a bad bundle rolls back.
- [ ] Biometric toggle registers and unlocks; export opens the share sheet.
