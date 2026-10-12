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
