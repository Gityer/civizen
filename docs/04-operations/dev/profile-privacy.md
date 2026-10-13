# Profile privacy (who reads which profile fields)

Decision E3 (2026-10-12), v2 plan step A2. Current behaviour:

| Reader | What they can read | How |
| --- | --- | --- |
| Signed-out visitor | Nothing from `profiles` (row-level security returns no rows); public pages use their own SECURITY DEFINER functions (job board, directory search, consultation stats) | `20261009090000_profiles_require_sign_in.sql` |
| Another member | Only the public columns: id, user_id, username, full name, avatar, bio, verification and civic badges (`is_verified`, `citizenship_status`, active citizen, governance eligibility), role, country, language, experience level, signing and messaging public keys, created/updated/deleted timestamps | column privileges in `20261013100000_profiles_member_privacy.sql` |
| Another member, profile card | `public_profile(p_profile_id)` masks full name, country, city, score and endorsement count per the owner's switches (Settings › Privacy › What other members see) | `20261010100000_account_lifecycle_and_profile_privacy.sql` |
| The owner | The whole own row | `my_profile()` (Auth context, Edit Profile, ID card, messaging settings) |
| Staff (`role.assign` or `settings.manage`) | Whole rows of every member | `admin_list_profiles()` (Users admin) |

Never readable by other members: birth date, place of birth, sex, phone, official and social-security numbers, city and region, permission arrays, terms and messaging settings, privacy settings, e-mail digest choice, name-change counters, last activity.

Endorsements follow the endorsed member's **Endorsements** switch for everyone except the endorser, the endorsed member and endorsement moderators (`profile_shows_endorsements`).

Rules for code:

- Never `select('*')` from `profiles` in the client; it fails for everyone. List the public columns you need, or call `my_profile()` for the signed-in member's own row.
- A new `profiles` column is private by default. Add it to the `GRANT SELECT (...)` list only if every signed-in member may see it, and record why here.
- SECURITY DEFINER functions are not affected; use them when a feature needs a private field of another member (for example an aggregate), and return only what the feature needs.
- The profile page fails closed: until the server card arrives, a visitor sees username, photo and badges only.

Finding people by phone number (`lookup_civizen_contacts_by_phone`, used by the chat's device-contact matching) returns only members who turned on **Let people who have my phone number find me** (off by default), hides the full name when the owner hides it, takes at most 50 numbers per call and 200 per member per day (v2 step A7).

Once a member is verified, birth date and country are locked on the server (`guard_verified_identity_fields`), because eligibility reads them; Edit Profile keeps the stored values and explains why.

Signed-out visitors of public Matters see `@username` (or "Former member") through `public_display_name`, never a real name.

Country stays readable to members because the directory, consultation country statistics and Matters scope rely on it; the **Country** switch hides it on the profile card.

Tests: `supabase/tests/profiles_member_privacy_test.sql`, `supabase/tests/account_lifecycle_privacy_test.sql`, `src/pages/user-profile/public-profile-visibility.test.ts`.
