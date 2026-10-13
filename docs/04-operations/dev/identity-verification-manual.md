# Identity verification (manual ID + selfie)

**Status:** Implemented (Phase 2B manual review). Vendor liveness deferred.  
**Member surface:** Settings → Edit Profile (`/settings/profile`)  
**Reviewer surface:** Governance → Tools → Steward console → Identity verifications (`/governance/tools/steward`, `StewardConsoleIdentityVerification`)  
**Storage:** private bucket `identity-verification`  
**Schema:** existing `identity_verification_cases` / `artifacts` / `reviews`

## Product rules

- Not required at signup. Members verify only when they need stronger trust (high-stakes actions already lean on `profiles.is_verified`).
- Flow: complete profile name/country/date of birth + username or phone → upload ID photo (`supporting_document`) → take/upload face photo (`live_presence`) → submit → staff approve/reject.
- Approval inserts `identity_verification_reviews`; triggers set `profiles.is_verified`.
- This is Civizen platform trust, not a government ID or passport claim.
- Automated vendor liveness + face-match is a later phase on the same tables. Voting booth face gates remain simulators until that phase.

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
- Path layout: `{profile_id}/{case_id}/{kind}-{uuid}.{ext}`
- Reviewers: staff or Identity Verification domain members (see Case management)
- Migration for case management: `supabase/migrations/20261013160000_verification_case_management.sql`; test `supabase/tests/verification_case_management_test.sql`
- Users admin verification toggle remains an emergency override without artifact review
