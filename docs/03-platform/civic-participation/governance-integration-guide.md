# Governance Integration Guide

How the member-facing governance surfaces are built on the real database tables. Current state only; the roadmap section at the end names what is intentionally not built yet.

Working institutional model (project reference, not this product guide): [Institutional Blueprint](../../institutional/institutional-blueprint.md) · [Governance Framework](../../institutional/governance-framework.md) · [Pilot Framework](../../institutional/pilot-framework.md). In-app proposal `decision_class` values (`ordinary` / `elevated` / `constitutional`) are a product scaffold and are not the Framework's seven decision classes.

## Surfaces

| Route | Page | Purpose |
|---|---|---|
| `/governance` | `PublicGovernanceLanding` | Public landing |
| `/governance/voting` | `CivicVotingHub` | Public elections and civic proposals |
| `/governance/workspace` | `Governance` | Full member workspace: create proposals, vote, execution, guardian and audit tooling |
| `/governance/new` | `GovernanceNew` | Member dashboard: open/closed proposals with weighted results and voting, plus the steward console |

## Tables

- `governance_proposals`: `title`, `summary`, `body`, `status` (`open` / `approved` / `rejected` / `cancelled`), `opens_at`, `closes_at`, `required_quorum`, `approval_threshold`.
- `governance_proposal_votes`: one row per (`proposal_id`, `voter_id`); `choice` (`approve` / `reject` / `abstain`), `weight` (0 or 1), `snapshot` of the voter's standing.
- `governance_proposal_events`: audit trail (`vote.recorded`, ...).
- `governance_sanctions`: can block `vote` and/or `proposal_create` for a member.
- `constitutional_offices`: office assignments (`office_key`, `profile_id`, `is_active`, `assigned_by`, `assigned_at`, `ended_at`, `notes`, `metadata`). Today the only `office_key` is `founder`; one active holder per office and one active assignment per member and office (partial unique indexes). Insert and update are allowed for members with `role.assign` or `settings.manage`.

## One voting path

All voting goes through `src/lib/governance-voting-service.ts`:

1. `loadGovernanceVoteContext` (`governance-vote-context.ts`, hook `useGovernanceVoteContext`) loads the member's score, sanctions and eligibility. Eligible means verified, minimum governance score, and the native mobile app.
2. `getGovernanceVoteBlockReason` returns `not_signed_in`, `sanctioned` or `not_eligible` (in that order) and `getGovernanceVoteBlockMessageKey` gives the message to show.
3. `recordGovernanceVote` upserts the weighted vote with the standing snapshot, then writes the `vote.recorded` event. If only the event fails, the vote stays and the result reports `eventRecorded: false`.

Results come from `summarizeGovernanceResults` / `fetchGovernanceProposalResults` in `governance-ui-utils.ts`: percentages are of decisive weight (approve + reject), abstentions count toward total votes but not quorum, and results for many proposals are computed from one batched votes query.

## Offices

`governance-ui-utils.ts` exposes `fetchConstitutionalOfficeAssignments`, `findProfileByUsername`, `appointConstitutionalOfficeHolder` and `endConstitutionalOfficeAssignment`. Ending an assignment keeps it in the history and appends who ended it and why to `metadata`; an update that changes no row (blocked by row-level security) is reported as a failure. Failures are classified as `not_permitted`, `office_occupied`, `already_holds_office` or `failed`.

`transferConstitutionalOffice` calls the database function `transfer_constitutional_office` (migration `20261005230000`), which ends the current term and starts the next in one transaction (permission-checked, one active holder preserved, audit metadata kept); the console's Transfer button uses it so an office cannot be left vacant by a half-finished hand-over. The migration has been applied and tested on the local database only, not on the hosted one.

`deriveGovernancePermissions` (`governance-permission-model.ts`) turns the member's standing and permissions into `canVote`, `canCreateProposals`, `canManageOffices`, `isOfficeHolder` and `canAccessStewardConsole`. The UI mirrors, but never replaces, the database policies.

## Policies

The steward console's Policies tab is read-only. `governance-policy-catalog.ts` reads the same constants the proposal composer and resolver use (`GOVERNANCE_DECISION_CLASS_BASELINES` and `GOVERNANCE_ACTION_THRESHOLD_OVERRIDES` in `governance-execution-thresholds.ts`, the eligibility rules and the voting window), so the tab shows the thresholds that actually decide a vote: approval class, share of decisive votes, quorum and whether the vote waits for the window to close, per decision class and per sensitive action. Stewards do not edit these values; a change is proposed in the workspace and decided by vote under the current rules.

## Tests

`governance-voting-service.test.ts`, `governance-ui-utils.test.ts`, `governance-vote-context.test.ts`, `governance-permission-model.test.ts` and `governance-policy-catalog.test.ts` run against a recording Supabase stub (`src/test/create-recording-client.ts`). Write paths against a real database (office changes, row-level security) still need a local Supabase.

## Roadmap (not built)

- An editable, versioned policy store with execution after an approved proposal (today the thresholds are code constants; the Policies tab only shows them).
- More office keys or council seats: add values to `constitutional_office_key` and the dashboard lists them automatically; term limits and multi-holder offices need schema design first.
- Moving `pages/Governance.tsx` `handleVote` onto `recordGovernanceVote` (same payload) once that page has test coverage.
