# Content moderation (reports, hiding, appeals)

Decision E2 (2026-10-12), v2 plan step A6. Public rules for members: `docs/02-policies/institutional/community-guidelines.md` (`/guidelines`, EN/HY/RU).

## Who does what

| Actor | Can | Where |
| --- | --- | --- |
| Signed-in member with `report.create` | Report a post, post comment, Matter, Matter comment, Solutions comment, job listing or member profile with a reason code and optional details; one open report per item per member; never their own content | flag icon (`ReportButton`, post menu on Home) → `report_content` |
| Moderator (`content.moderate`, the Moderation and Conduct domain; founder office as fallback until the domain matures) | See the queue grouped by item, claim, hide with a reason and note, dismiss | `/moderation?tab=queue` → `moderation_queue`, `moderation_claim`, `moderation_hide`, `moderation_dismiss` |
| Author | See what was hidden and why; appeal once | notice on the item, notification, `/moderation` (My content) → `moderation_actions_list('mine')`, `moderation_appeal` |
| A different moderator | Decide an appeal: keep hidden or restore | `/moderation?tab=appeals` → `moderation_decide_appeal` (refuses the moderator who hid the item and the author) |

Message reports keep their conversation context in Settings › Messaging (`report_context.source = 'private_message'`); they are not in this queue.

## What hiding does

| Target | Effect | Restore on overturned appeal |
| --- | --- | --- |
| Post, post comment, Matter comment, Solutions comment | `moderation_hidden_at` + `moderation_reason` set; a RESTRICTIVE select policy hides the row from everyone except the author and `content.moderate` holders; `get_matter` filters hidden comments the same way | markers cleared |
| Matter | `visibility` becomes `participants` (out of public lists) | previous visibility from `moderation_actions.previous_state` |
| Job listing (`market_job_interests`) | `status` becomes `closed` | previous status from `previous_state` |
| Member profile | not hideable here; use governance sanctions in Users admin | — |

Every decision is a `moderation_actions` row (reason, note, moderator, previous state, appeal text and outcome); members cannot write it directly. Reports on the item are resolved with `decision = hidden | dismissed`. Notifications: `moderation_hidden`, `moderation_appeal_overturned`, `moderation_appeal_upheld` (i18n under `notificationTypes.*`).

Reason codes (same list in SQL `moderation_reason_codes()` and `MODERATION_REASON_CODES`): spam, harassment, hate, violence, sexual, misinformation, privacy, illegal, other.

Tests: `supabase/tests/content_moderation_test.sql`, `src/lib/moderation.test.ts`, `e2e/content-moderation.spec.ts`. Migrations: `20261013110000_content_moderation.sql`, `20261013110100_get_matter_hides_moderated_comments.sql`.

## Rate limits per account

PM decision TD4 (Trust & Safety baseline 3.5). Starting values, kept in `rate_limits` so they can be reviewed without a code change: reports 20/day, posts 10/hour, comments 60/hour (posts, Matters and Solutions share one count), new conversations 20/day, messages 200/hour. Reopening an existing conversation does not count, and neither does reporting the same item again.

- Every counted action is logged in `rate_limit_events` by a `BEFORE INSERT` trigger. Deleting a post does not give the quota back. Server work with no member in the request (service role, jobs, seeds) is never counted.
- A refused write raises SQLSTATE `PT429`: PostgREST answers HTTP 429 with the action in `details` and the time it is allowed again in `hint`.
- The app turns that into a sentence (`rateLimitMessage` in `src/lib/rate-limit.ts`, keys `rateLimit.*`); a refused action is never dropped silently.
- Members cannot read or change `rate_limits` or `rate_limit_events`.
- The sign-up limit per address (5/hour) is the auth server's configuration on production, not a migration.
- Local stack: many e2e runs within an hour can reach a fixture's limit. `DELETE FROM public.rate_limit_events;` resets every count.

Tests: `supabase/tests/account_action_rate_limits_test.sql`, `src/lib/rate-limit.test.ts`, `e2e/rate-limits.spec.ts`. Migration: `20261027100000_account_action_rate_limits.sql`.

## Enforcement steps for members

PM decision TD2 (Trust & Safety baseline 3.2), with the owner decisions of 2026-10-27; the public wording is in the Community Guidelines (0.2). The steps, lowest first:

| Step | What it does |
| --- | --- |
| note | a record only |
| warning | a record the member sees |
| content restriction | 7 days: no new posts, comments (posts, Matters, Solutions) or Matters |
| messaging restriction | 7 days: no new conversations; existing ones stay open |
| suspension | 30 days: read and appeal only |

How a step works:

- **Who applies it.** Moderators (`content.moderate`) apply steps with `moderation_enforce`. The form is on the queue card of a reported profile, and folded under any content report for the content's author.
- **Reason.** Every step takes a reason code; each code is a Guidelines item. "Other" needs a note.
- **One rung at a time.** A first step may be a note or a warning. After that, one rung above the highest step not lifted or overturned (ended restrictions count).
- **Skipping rungs (TD2 as adopted).** Only threats of violence (item 4), `child_safety` (item 9, sexualisation of minors) and private information (item 7) may skip rungs.
- **Not on yourself.** Moderators cannot apply a step to themselves.
- **Notifications.** The member is notified (`moderation_enforcement`).

How restrictions are enforced:

- **Content and messaging.** `BEFORE INSERT` triggers refuse those writes with SQLSTATE `PT403` (HTTP 403), the restriction in `details` and its end in `hint`.
- **Suspension.** The member stays signed in, so they can read and appeal. Every other write they make is refused: a statement trigger `enforcement_suspension_guard` sits on every public table outside `enforcement_guard_exempt_tables()`.
  - **Exempt tables:** view counters, error reports, notification read marks, push subscriptions and the two appeal records.
  - **Profiles:** a row guard on `profiles` lets only `last_active_at`, the Terms fields and `language_code` change.
  - **New tables:** the ladder SQL test fails for any public table missing the guard, so a migration that adds a table must add the trigger.
- **What the member sees.**
  - **When a write is refused:** `writeRefusalMessage` (`src/lib/write-refusal.ts`, keys `memberEnforcement.refused.*`) explains the refusal.
  - **On every page:** `RestrictionBanner` says what is restricted, until when, and links to Moderation.
- **Ending.** Restrictions end on their own at `ends_at`.

Appeals:

- **Where.** The member appeals once from Moderation (`moderation_enforcement_appeal`).
- **Who decides.** A different moderator, never the one who decided and never the member (`moderation_enforcement_decide_appeal`).
- **Overturning** lifts the step at once.

Tests: `supabase/tests/member_enforcement_ladder_test.sql`, `src/lib/member-enforcement.test.ts`, `src/lib/member-enforcement-banner.test.ts`, `e2e/member-enforcement.spec.ts`. Migration: `20261027120000_member_enforcement_ladder.sql`.
