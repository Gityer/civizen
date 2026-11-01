# Identity verification (in-house live check)

**Status:** Implemented (2026-10-30): in-house live verification, no outside provider. Replaces the ID photo + selfie upload.  
**Member surface:** `/verify` (also from Settings › Edit Profile › Identity verification, and from the prompt shown when an action needs it)  
**Reviewer surface:** Governance → Tools → Steward console → Identity verifications (`/governance/tools/steward`, `StewardConsoleIdentityVerification`); each submission also opens an item in the **Identity Verification Lead** position's queue (`/organisation/verification_lead`)  
**Storage:** private bucket `identity-verification` (photos, PDF, `video/webm`, `video/mp4`; 25 MB per file)  
**Schema:** `identity_verification_cases` / `artifacts` / `reviews`; migration `supabase/migrations/20261030120000_identity_verification_live.sql`; test `supabase/tests/identity_verification_live_test.sql`; e2e `e2e/identity-verification.spec.ts`

## Product rules

- **Optional at sign-up, required before acting.** Reading needs no verification. Posting, commenting, reposting,
  Matters and their comments and attachments, solutions, challenges, knowledge contributions, messages to people,
  endorsements, job interests, voting proposals and support, ballots, governance votes, law contributions and
  agreements need a verified identity. The trigger `verification_before_write` on each of those tables refuses an
  unverified writer with SQLSTATE `PT403`, detail `verification_required` (hint: the action). Messages to Civizen's
  system agents (Civi) stay open. A business account counts as verified through its verified owner.
- **The app's answer:** any request refused that way raises the verification prompt (`VerificationPrompt`, mounted at
  the app root, via `verificationAwareFetch` in the Supabase client): *Verify now* goes to `/verify?next=<page>` and
  brings the member back. The consultation ballot page shows the reason and a *Verify now* button.
- **Voting:** `consultation_eligibility_reason` returns `verification_required` for an unverified member; there are no
  advisory ballots any more.
- **The check** (`/verify`):
  1. Consent (version `identity-live-2026-10-30`).
  2. Photo of the document's identity page, plus its machine-readable lines (ICAO 9303 TD1, TD2 or TD3), checked as
     the member types (`src/lib/mrz.ts`) and again on the server (`parse_mrz`), including check digits and expiry.
  3. Live check: `start_live_verification()` issues a challenge (a 6-digit code and two head moves, valid 10 minutes).
     The member reads the code aloud, makes the moves in order and blinks while the clip records. Liveness (head pose
     against the member's own neutral pose, blinks by eye aspect ratio) and the face match between the clip and the
     document photo run **on the device** with open-source models bundled in the app (`@vladmandic/face-api`, MIT,
     `public/models/face-api`; `src/lib/face-checks.ts`). Only the results are sent.
  4. `submit_live_verification(...)` checks the files are in the member's own folder for this case, records the
     evidence and flags, and sends the case for review.
- **Flags for the reviewer** (never a decision on their own; a modified device could report anything):
  `birth_date_differs`, `under_16`, `name_differs`, `liveness_not_passed`, `face_match_not_passed`,
  `challenge_mismatch` (the device tested other moves than the server asked), `document_used_by_another_account`
  (keyed fingerprint of issuing state + document number; the number itself is not stored; key in
  `civizen_private.identity_hash_key`). A flagged case opens as a high-priority item.
- **Evidence is written only by the server functions;** members cannot insert, change or delete artifacts.
- **The reviewer** watches the recording (the code said aloud, the moves in order), compares the face with the document
  photo, reads the device results, the document fields and the flags (`IdentityReviewLiveEvidence`), then approves or
  rejects with a reason. Approval sets `profiles.is_verified`, and the position item closes itself.
- This is Civizen platform trust, not a government ID check.
- **Not built yet:** automatic deletion of the photo and recording a set time after the decision (members can ask
  through Contact meanwhile).

- Case status changes only through the review functions; the one direct change is the owner submitting their own
  case (first time, or again after a rejection, revocation or information request). Nobody reviews, assigns or
  decides their own case or a case of an account linked to theirs (`profiles_are_linked`), reviewers included (v2 step A7).

## Case management (v2 step C1)

- **Who reviews:** staff (`role.assign` / `settings.manage`) and members of the Identity Verification governance
  domain (roles `reviewer`, `steward`, `domain_lead`), never while a `verification_review` sanction is active. One
  server check, `can_review_identity_verification_storage()`, gates the queue, the documents (storage and
  artifacts) and every action; the Tools tab and the steward console open for the same people.
- **Queue** (`identity_verification_queue()`): open cases oldest first with waiting time, who took the case, whether
  it is a resubmission, how many information requests and notes it has. Filters: All, Unassigned, Mine, Over 48 h
  (the decision-time target from decision E7). Cases of the reviewer's own or linked accounts are not listed.
- **Take / release:** `assign_identity_verification_case` (status `in_review`) and
  `release_identity_verification_case` (back to `submitted`).
- **Decide:** `decide_identity_verification_case(case, decision, message, reason_code)`. A rejection needs a reason
  code; the member sees the reason and the message under Settings › Edit Profile and can submit again.
- **Ask for more information:** `request_identity_verification_info(case, reason_code, message)` returns the case to
  the member (status `draft`) with the reason and message, and notifies them (`verification_info_requested`). It
  comes back to the queue, marked as a resubmission, when they submit.
- **Reason codes** (same list in `identity-verification-queue.ts`): `document_unreadable`, `document_expired`,
  `document_missing`, `selfie_unclear`, `selfie_mismatch`, `details_mismatch`, `underage`, `duplicate_identity`, `other`.
- **Notes and history:** `add_identity_verification_case_note` and `identity_verification_case_history`; table
  `identity_verification_case_events` records submissions, resubmissions, take/release, information requests,
  decisions, duplicate flags and notes. Reviewers read it; members never see internal notes.
- **What the member sees:** `metadata.last_decision` (kind, reason code, message) on their own case; members cannot
  write it, the assignment or the request list.

## Ops notes

- Migration: `supabase/migrations/20260907120000_identity_verification_storage.sql`
- Path layout: `{profile_id}/{case_id}/document.{ext}` and `{profile_id}/{case_id}/live.{webm|mp4}`
- Reviewers: staff or Identity Verification domain members (see Case management)
- Migration for case management: `supabase/migrations/20261013160000_verification_case_management.sql`; test `supabase/tests/verification_case_management_test.sql`
- Users admin verification toggle remains an emergency override without artifact review
