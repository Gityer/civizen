---
title: Voting system and whole-app audit (2026-10-05)
status: audit
version: 0.1
date: 2026-10-05
related:
  - information-architecture-and-content-standards.md
  - admin-interface-usability-audit-v0.1.md
  - ../../01-governance/participation/civic-voting-system-design-v0.1.md
canonical: false
---

# Voting system and whole-app audit (2026-10-05)

**Scope:** Read-only review of the Civizen app (main `f7d7051`, local dev server) with emphasis on the voting / decision-making system. Nothing was changed in code.

**Correction (2026-10-06):** the dev server on port 8080 reads `VITE_SUPABASE_URL` from `.env`, which points at the **production** backend, not the local stack. The one test ballot cast and withdrawn during this audit (Armen's own account, 02:33 UTC) therefore went to production: it remains there as a withdrawn, non-countable `civic_ballots` row and the public count is 0. See `docs/04-operations/dev/local-supabase.md` ("Which backend does the app use?") before any browser write.

**Method:** browser walkthrough of every top-level section (signed in, desktop light/dark and 375×812 phone), plus a code and migration inventory. File references are to the repository as of this date.

## 1. Summary

The live consultation (A Single World Citizenship) works end to end: open ballot, Support/Oppose/Abstain, change and withdraw, public tally, country stats with small-cell suppression, opt-in participant directory. That is the only real ballot in the product. Everything the design doc describes as "built" beyond it (push windows, biometrics, duress, observer, risk engine, canvass) exists as pure library logic plus empty tables and a hand-toggled simulator; nothing is wired to a server.

Three risks stand out:

1. **Epistemic honesty.** The Observer console shows hard-coded demo numbers (50 % turnout, 500/1000 ballots, gate-fail rates) on the real consultation, and Study shows three invented "Pending votes". Both violate the IA rule *Visible status / Epistemic honesty*.
2. **Ballot integrity.** The server RPC stores `profile_id` next to the plain-text choice, applies no eligibility check beyond "signed in", and never writes the audit event chain. The design's secrecy and anti-fraud goals are not met even at the ordinary class.
3. **Fragmentation.** Four governance surfaces (public hub, Civic voting, Member workspace, `/governance/new`) and two parallel proposal/vote systems coexist, with inconsistent chrome, labels, and eligibility messages.

## 2. Voting system findings

### 2.1 What works (verified in browser, local DB)

| Flow | Result |
| --- | --- |
| Catalog `/governance/voting` | Lists the consultation under Supranational; history icon hides demo/past items |
| Detail `/governance/voting/:id` | Question, explanation, badges, public counts, country stats, directory, ballot |
| Cast Support | Toast "Ballot saved", tally updates to 1 · 100 %, "Your current choice: Support", Withdraw and "List me publicly" appear |
| Withdraw | Tally returns to 0, choice cleared |
| Light / dark | Both render correctly; no horizontal overflow on phone |

### 2.2 Defects and gaps (ordered by severity)

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| V1 | Observer console shows fabricated metrics for a real election | `src/pages/governance/CivicVotingObserver.tsx:18-51` (`DEMO_METRICS`, `DEMO_RISK`, `DEMO_CANVASS`), rendered at `/governance/voting/:id/observe`; page ignores `electionId` | P0 |
| V2 | Ballot is not secret: `civic_ballots.metadata.option_key` and `civic_ballot_selections.candidate_id` stored next to `profile_id`; `ballot_commitment` never shown to voter | `supabase/migrations/20260907010000_withdraw_consultation_ballot.sql:109-227` | P0 |
| V3 | No server-side eligibility: any authenticated profile may vote; no verification, score, sanctions, roster or scope check; phone signup has no verification and DOB is unchecked | same RPC; `src/pages/auth/SignUp.tsx` | P0 |
| V4 | No audit trail: nothing inserts into `civic_voting_events`; no Merkle commitment; withdraw "hash" is reversible with 3 options | `20260907010000_...sql:65-68` | P1 |
| V5 | No lifecycle: nothing closes/certifies elections or proposals; UI treats `status === 'open'` as open so after the deadline buttons still show and the RPC fails with a raw `election_not_open` toast | `useCivicVotingElection.ts:78,93,111` | P1 |
| V6 | Primary action buried: on desktop and phone the Support/Oppose/Abstain buttons sit below Public counts, Country of residence and Public participants (phone: y≈1289 of 1523; guest CTAs y≈1382 per the 2026-10-06 review) | `CivicVotingElectionDetail.tsx` | P1 |
| V7 | Guest path loses the ballot: Sign in / Create account links carry no return state; SignUp has no return path | `CivicVotingElectionDetail.tsx:199-210`, `src/lib/auth-return-path.ts` | P1 |
| V8 | Two parallel proposal/vote systems in the UI: legacy `governance_proposals` (approve/reject, client-side resolution, client-supplied unbounded `weight`, votes readable by all) at `/governance/workspace` and `/governance/new`; civic voting at `/governance/voting` | `20260419101500_...sql:35-69`, `Governance.tsx:614-690`, `app-routes-1.tsx:236-237` | P1 |
| V9 | "How civic voting works" and the hub card describe identity, push windows, home/solitude checks that do not apply to the live ordinary consultation; hub says "verified member session" required while the RPC needs only sign-in | `messages-14.ts:153-167`, `PublicGovernanceLanding.tsx` | P1 |
| V10 | Workspace shows contradictory status chips "Ineligible" + "Active Citizen" and "Use the native mobile app for governance actions" on web | `/governance/workspace` | P2 |
| V11 | Proposal creation is founder/admin/system only; members cannot start a consultation; proposals are forced to `scope_kind='global'`; hub lists only drafts | `voting-proposals.ts:157`, `20260906195000_...sql:114-168`, `CivicVotingHub.tsx:182-190` | P2 |
| V12 | Hard-coded English: tier/security labels, option names stored in DB ('Support'…), raw RPC error codes in toasts; hy/ru only machine-translated for civic voting | `types.ts:128-141`, `civic-voting-hub-shared.ts:28-34` | P2 |
| V13 | Study "PENDING VOTES" lists three invented proposals (Quarterly Governance Review Cadence, Reserve Disclosure Standard, Citizenship Advancement Baseline) with dead "View proposal" links | `StudyCivicLearning.tsx:1114`, `messages-09.ts:273` | P2 |
| V14 | Hub subtitle marquee (`SlowRunningText`) duplicates the sentence on desktop where it already fits; location pill renders "— , —" | `CivicVotingHub.tsx:540-543` | P3 |
| V15 | Detail page flashes a "Loading…" card (session tools) above the consultation for signed-in users; phone header: avatar overlaps the observe (eye) icon | `CivicVotingElection.tsx:76-79` | P3 |
| V16 | Grammar: "1 countable ballots" | `CivicVotingElectionDetail.tsx:~120` | P3 |
| V17 | Tests: 25 pure-logic tests; none for `voting-proposals.ts`, `public-tallies.ts`, the hook, components, or any SQL RPC; no e2e | `src/lib/civic-voting/*.test.ts` | P2 |

### 2.3 Missing entirely (vs. a complete voting system)

Server-side eligibility · ballot secrecy and voter receipt / inclusion code · audit event chain and public commitment · election close/certify and published final result · binding votes and office elections (simulation only) · ranked / approval / multi-seat ballots · quorum and thresholds for civic elections · delegation · notifications and reminders (no push plugin, `user_notifications` table unused) · a discussion phase linked to the ballot (Matters exist but are not linked from the election page) · admin UI to create or schedule an election · integration tests · curated hy/ru copy.

## 3. Whole-app findings

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| A1 | Settings rows **Help and support**, **Notifications**, **Safety** route to 404 | `src/pages/settings-items.ts:25,38,75`; `TermsReconsentGate.tsx:190` links `/settings/help` | P0 |
| A2 | No notification center, no push, no bell in top chrome | `user_notifications` table unused | P1 |
| A3 | No error reporting or analytics in production; crash boundary only logs to console | `AppCrashBoundary.tsx`, `main.tsx:60-75` | P1 |
| A4 | Machine translation runs client-side per string through an unofficial Google endpoint; curated hy/ru only for governance dashboard/hub | `i18n.runtime.ts:307`, `i18n/curated/` | P1 |
| A5 | Study: tests "coming soon" (disabled), schedules all placeholders, courses a small static list, 5 of 19 domains "Planned"; copy still says "Universal Constitution" although the Community Governance Charter superseded it | `StudyTests.tsx:51`, `StudySchedules.tsx`, `study.ts` | P2 |
| A6 | Market filters sheet is a placeholder; Jobs board empty; payments are prototype credits | `MarketFiltersSheet.tsx:9` | P2 |
| A7 | Fund, Governance, Wellbeing have no entry in signed-in primary or profile nav; `/governance/new` reachable only via Civi catalog; Governance is reached from Home card and Settings | `main-nav.ts`, `app-pages.ts` | P2 |
| A8 | Public Fund lanes thin; Transparency all "Not yet published"; project finance is a demonstration | `messages-fund-01.ts:90-126` | P2 |
| A9 | iOS: no project; Download button disabled with "coming soon" | `Download.tsx:108` | P2 |
| A10 | Governance workspace is 1 901 lines plus 55 components (guardian multisig, relay, verifier mirrors) while member-facing voting is one ballot — over-scoped relative to the rest | `src/pages/Governance.tsx` | P2 |
| A11 | Dead/orphaned code: `ContributeLane` + `/contribute/:laneId`, `src/lib/p2p` (Gun/IPFS, `gun` still a dependency), `src/lib/protocol`, `i18n.generated.ts`; stale Supabase types force `as any` in 31 files | various | P3 |
| A12 | Accessibility: no skip-to-content link, no automated a11y tests; 622 `aria-*` otherwise decent | – | P3 |
| A13 | No PWA manifest / service worker / offline | – | P3 |
| A14 | E2E: Playwright installed but no config or specs; ~26 ad-hoc `verify:*` scripts | `scripts/` | P3 |
| A15 | Chrome inconsistency: `/governance` and `/fund` use the public header while sibling signed-in routes use the app shell | `PublicGovernanceLanding.tsx` | P3 |

Appearance in general is good: consistent tokens, light/dark both clean, mobile layout sound, typography and spacing coherent. The gaps are functional and informational rather than visual.

## 4. Recommended plan

**Phase 0 — honesty and dead ends (small, do first)**
1. Observer: read real metrics from `civic_vote_sessions` / `civic_verification_checks` for the election, or hide the page for consultations and label demo data as demo. (V1)
2. Remove or clearly label Study "Pending votes" samples; link to real elections or drop the block. (V13)
3. Route or remove Settings Help / Notifications / Safety; fix the terms-gate link. (A1)
4. Align hub copy with the live class: "How civic voting works" should describe the ordinary consultation first and push/biometric classes as future; fix "verified member session" wording. (V9)
5. Grammar and marquee fixes; stop `SlowRunningText` when the text fits. (V14, V16)

**Phase 1 — make the live consultation trustworthy**
6. Vote-first layout: ballot (or "Your choice" + change/withdraw) directly under the question; counts, country stats and directory below in a collapsed-by-default or secondary block; guest CTA at the same spot with return-to-ballot through login, signup and email confirmation. (V6, V7)
7. Server eligibility in `cast_consultation_ballot`: `is_verified` or declared minimum, sanctions block, age from DOB, one account per verified identity; show the prerequisite reason when disabled (IA rule *Visible prerequisites*). (V3)
8. Ballot secrecy, phase A: stop storing `option_key` and `candidate_id` in clear; store option in `encrypted_payload` keyed per election, keep `profile_id` only in the eligibility/session table, tally via a security-definer function; write every cast/change/withdraw to `civic_voting_events` with the hash chain; show the voter their `ballot_commitment` as a receipt. (V2, V4)
9. Lifecycle: scheduled job (pg_cron or edge function) to close elections at `closes_at`, publish the final tally, mark proposals closed; UI uses `closes_at` not only `status`. (V5)
10. RPC and hook tests (pgTAP or Vitest against local Supabase) for cast, change, withdraw, eligibility refusal, closed election. (V17)

**Phase 2 — one governance surface**
11. Merge `/governance/workspace`, `/governance/new` and the civic hub into one member Governance page: Open votes · My votes · Proposals · Results · (steward tools behind permission). Retire the legacy approve/reject vote path or move it server-side with fixed weight = 1. (V8, V10, A10)
12. Member-initiated consultations: allow members to draft a voting proposal from a Matter, with a support threshold (e.g. N endorsements) before founder/steward publication; add scope selection (country/region) and opening time. (V11)
13. Link discussion: show the originating Matter and Solutions thread on the election page; add a "Discuss" tab. 
14. Notifications: notification center backed by `user_notifications` (vote opened, closes in 7 days, result published), web first, push when Capacitor plugin lands. (A2)

**Phase 3 — depth**
15. Additional ballot types using existing schema: multi-option measures, approval and ranked (`rank`, `seat_count`), quorum and threshold per election. 
16. Curated hy/ru for civic voting; localized option labels via keys, not DB strings. (V12)
17. Error reporting (Sentry or equivalent), skip link and jest-axe, Playwright config with 5 to 10 real specs starting with the ballot flow. (A3, A12, A14)
18. Trim dead code and regenerate Supabase types. (A11)

## 5. Not covered

Guest view of the consultation was not re-tested in this pass (the signed-in session is Armen's; the 2026-10-06 read-only review already measured it). Production data was not touched. Android native build and OTA update prompt were not exercised.

## 6. Progress log

| Date | Items | State |
| --- | --- | --- |
| 2026-10-06 | 6 (vote-first layout, return-to-ballot) | Done by a sibling session, commit `cefafa6`. |
| 2026-10-06 | Phase 0: 1 (Observer real data), 2 (Study fake votes), 3 (Settings 404 rows → `/settings/help`), 4 (hub copy), 5 (marquee, plural) | Implemented locally, verified in the browser against the local stack; not committed. |
| 2026-10-06 | Phase 1: 7 (server eligibility + visible reasons), 8 (sealed choice, hash-chained events, receipt + inclusion check), 9 (close tick + published final tally, client uses the real window), 10 (SQL RPC test + hook/component tests) | Implemented locally (migration `20261006060000`), SQL test passes, browser-verified; not committed, not on production. Contract: design doc §13. |
| 2026-10-06 | Phase 2: 11 (one member Governance page: Votes / Proposals / Tools; `/governance/new` redirected; legacy vote weight clamped server-side), 12 (member support threshold, author publication once ready, scope + opening/closing times, scheduled opening via the lifecycle tick), 13 (Matter and proposal links on the ballot), 14 (notification center: bell, `/notifications`, publish and result notifications) | Implemented locally (migration `20261006070000`), SQL test passes, browser-verified on the local stack; not committed, not on production. Contract: design doc §14. |
| open | AuthContext.tsx exceeds its size baseline (851 > 847) from a sibling commit; standards check fails until that baseline or file is adjusted. | Not changed here. |
