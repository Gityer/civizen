# Identity verification (manual ID + selfie)

**Status:** Implemented (Phase 2B manual review). Vendor liveness deferred.  
**Member surface:** Settings → Edit Profile (`/settings/profile`)  
**Staff surface:** Governance stewardship → Identity verifications (`StewardConsoleIdentityVerification`)  
**Storage:** private bucket `identity-verification`  
**Schema:** existing `identity_verification_cases` / `artifacts` / `reviews`

## Product rules

- Not required at signup. Members verify only when they need stronger trust (high-stakes actions already lean on `profiles.is_verified`).
- Flow: complete profile name/country/date of birth + username or phone → upload ID photo (`supporting_document`) → take/upload face photo (`live_presence`) → submit → staff approve/reject.
- Approval inserts `identity_verification_reviews`; triggers set `profiles.is_verified`.
- This is Civizen platform trust, not a government ID or passport claim.
- Automated vendor liveness + face-match is a later phase on the same tables. Voting booth face gates remain simulators until that phase.

## Ops notes

- Migration: `supabase/migrations/20260907120000_identity_verification_storage.sql`
- Path layout: `{profile_id}/{case_id}/{kind}-{uuid}.{ext}`
- Reviewers need `role.assign` or `settings.manage`
- Users admin verification toggle remains an emergency override without artifact review
