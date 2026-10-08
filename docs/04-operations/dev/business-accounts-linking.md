# Business accounts: linking and switching

A business (organization) account is an ordinary `profiles` row. A member becomes its owner through a
`linked_accounts` row (`owner_profile_id` → `linked_profile_id`, `relationship_type = 'business'`).
That row grants: switching into the business from the Accounts menu, publisher rights
(`current_profile_manages_publisher`), org signing on agreements, and sibling visibility between the
owner's businesses.

Because the row carries that much authority, **clients never write it**. Since
`20261007100000_linked_accounts_proof_of_control.sql` every row must prove control of both accounts and
records how (`established_via`):

| `established_via` | Path | Proof |
| --- | --- | --- |
| `session_handshake` | Register / Connect in the Accounts dialog | Owner session calls `begin_business_account_link` (10-minute single-use token, only its hash is stored); a session **for the business account** (fresh sign-up, or sign-in with the business password in an isolated client) calls `complete_business_account_link(token)`. |
| `owner_approval` | Access request | A member asks for access to an existing business (`business_account_access_requests`); an **established owner** of that business approves it with `review_business_account_access_request` from the Accounts menu. The requester becomes a second owner. |
| `legacy_backfill` | Rows created before 2026-10-07 | Audited on production the same day: two rows, both the founder's (Civizen org, Healthy Vending Mart). |

Rules enforced in the database:

- No INSERT policy and no INSERT/UPDATE grant on `linked_accounts` for `anon`/`authenticated`; owners may still DELETE their own row.
- `guard_linked_account_row` trigger: inserts need `established_at` + `established_via`, owner ≠ linked, parties are immutable, and one business name maps to one business profile (an advisory lock closes the race).
- `linked-account-switch` (edge function, pure rule in `authorize.ts`), `current_profile_manages_publisher`, `linked_account_owner_ids_for_viewer`, the access-request policies and `lookup_business_accounts_for_connect` honour **only established rows**.
- The Connect lookup returns business profiles only (an established link or a `biz_` handle), so an exact e-mail match no longer reveals which profile a personal e-mail belongs to.
- A row inserted through the old client path after the audit date stays unestablished (no rights) until the owner re-connects the business with its password; the handshake upgrades the row in place.

Client: `src/lib/linked-account-link.ts` (`establishBusinessAccountLink`, used by
`useUserPageMenuActions`), `useBusinessAccessRequests` + `UserPageMenuAccessRequests` for the owner's
Approve / Decline. `create-linked-business-account` (edge function) was removed; it was never deployed.

Tests: `supabase/tests/linked_accounts_proof_of_control_test.sql` (run with
`scripts/local-supabase/run-sql-tests.sh linked_accounts`), `src/lib/linked-account-link.test.ts`,
`src/lib/linked-account-switch-authorize.test.ts`, `src/lib/linked-business-accounts.access-requests.test.ts`,
`src/components/layout/user-page-menu/UserPageMenuAccessRequests.test.tsx`.

Deployed to the hosted stack on 2026-10-08 (migration after backup, both functions, web v0.1.202). For a
redeploy: apply the migration (backup first), then copy
`supabase/functions/linked-account-switch/{index.ts,authorize.ts}` into the functions volume and restart
the `functions` service (same procedure as the Civi edge function in `RELEASING.md`). The web bundle must
ship with or after the migration, because the new Accounts dialog calls the two RPCs.
