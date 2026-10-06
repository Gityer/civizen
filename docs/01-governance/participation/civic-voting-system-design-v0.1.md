---
content_id: civic-voting-system-design-v0-1
title: Civic Voting System Design v0.1
content_category: governance_design
moderation_lane: moderated
content_type: design_spec
professional_domain: technology
contribution_policy: staff_only
owner_role: founder
review_status: draft
---

# Civic Voting System Design v0.1

## 1. Purpose

Design a Civizen **civic election** stack where eligible members can cast votes for offices and measures across geographic tiers — from a local responsible authority up through regional and national contests (including a country-level executive office when that office exists inside a Civizen election event).

This document is the product and security source of truth for implementation under:

- `src/lib/civic-voting/`
- `src/pages/governance/` voting routes
- `supabase/migrations/*_civic_voting_*.sql`

### 1.1 Institutional boundary (mandatory)

Civizen is **not** a government. Platform credentials, Member IDs, and in-app ballots do **not** by themselves create public-law election rights, replace state elections, or transfer territorial authority.

Framing for all UI and docs:

- **In scope:** Civizen community / platform civic elections and authorized civic processes hosted by Civizen.
- **Out of scope until separately authorized:** claiming to run a state’s official presidential or parliamentary election.

Copy and notices must stay aligned with:

- `docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md`
- `docs/01-governance/participation/community-readiness-and-program-availability-framework.md`
- `docs/institutional/governance-framework.md` (working authority-distribution model; civic elections are one decision pathway, not all Civizen governance)
- `docs/institutional/pilot-framework.md` (Working Pilot Framework; current civic voting is one possible **Governance Pilot / governance mechanism**, not the complete Civizen governance system)

UI notice:

```text
Civizen civic elections currently operate as voluntary network processes. They do not by themselves replace public-law elections or grant governmental authority. Any future official use would require separate lawful authorization and public safeguards.
```

### 1.2 Long-Term institutional pathway

Civizen's election infrastructure is intended first for voluntary Civizen community processes. Over time, it may serve as research, prototype, audit, or technical infrastructure for officially authorized civic processes only where a competent public institution or legitimately constituted body expressly authorizes that use and the system satisfies applicable legal, accessibility, privacy, security, audit, and democratic requirements.

Civizen does not promise that its internal elections will automatically become public elections. It preserves the possibility of future lawful recognition rather than permanently limiting civic voting to private platform use.

## 2. Goals

1. **Multi-tier ballots** — local → district → regional → national; candidates, offices, measures, and “anyone/anything” nomination modes where policy allows.
2. **Strong anti-fraud** — one eligible person, one vote per contest; device + identity binding; liveness + full-face match; anomaly detection.
3. **Transparency with privacy** — public verifiable tallies and audit trails without revealing *how* an individual voted (secret ballot).
4. **Coercion-resistant ceremony** — short random windows, home presence, solitude checks for high-stakes contests, limited retries.
5. **Operational realism** — push-driven 5-minute windows; up to 2 additional chances on alternate days if missed.

## 3. Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Ballot stuffing / fake accounts | Verified identity + unique biometric template hash + governance eligibility + sanctions blocks |
| Impersonation | Full-face match to enrolled template + passive/active liveness |
| Coercion / vote buying | Random short window; home geofence; solitude check; no printable receipt of *choice*; delayed public tallies |
| Remote takeover of device | Native app only; device attestation; recent unlock; session bound to push challenge |
| Insider tally tampering | Append-only event log; Merkle commitments; optional external verifier federation |
| Location spoofing | OS location integrity signals where available; historical home pattern; sudden-jump rejection |
| Deepfakes / video injection | Challenge-response liveness; camera integrity APIs; reject virtual cameras when detectable |

### 3.1 Tension: solitude vs classic coercion-resistance

Classic cryptographic voting prefers **receipt-freeness** (voter cannot prove how they voted). Camera-based “prove you are alone” helps against *over-the-shoulder* coercion but can itself become a surveillance channel if vote *choice* is ever visible on screen to a second party’s recording.

**Policy:** During the sealed ballot step, the UI must never show a shareable proof of *which* option was selected. Solitude and face checks gate *access to the booth*, not disclosure of the ballot content. High-stakes contests may offer an optional **duress / abort** path that voids the session without recording a countable choice.

## 4. Election model

### 4.1 Tiers (`civic_election_tier`)

| Tier | Typical office examples |
|------|-------------------------|
| `neighborhood` | Block / building steward |
| `local` | Local responsible authority, ward / municipality |
| `district` | District / county equivalent |
| `regional` | Province / state equivalent |
| `national` | Country-level legislature seats, executive (e.g. president) |
| `supranational` | Future multi-country Civizen contests (optional) |

### 4.2 Contest kinds

- `office` — elect a person/entity to a defined office
- `measure` — yes/no/abstain or ranked options on a question
- `open_nomination` — policy-gated “anyone or anything” candidacy list (subject to eligibility filters and steward review)

### 4.3 Security class

| Class | Window | Home required | Alone required | Face + liveness | Retries |
|-------|--------|---------------|----------------|-----------------|---------|
| `ordinary` | Configurable (default 15–60 min) | Optional | No | Soft / skippable where enrolled | More lenient |
| `elevated` | 5 min push window | Preferred | Soft warn | Required | 1 primary + 2 retries |
| `constitutional` / presidential-tier | 5 min push window | **Required** | **Required** | **Required** | 1 primary + 2 retries (every other day) |

## 5. Voter journey

```mermaid
sequenceDiagram
  participant Sched as Session scheduler
  participant Push as Push service
  participant App as Native app
  participant Gate as Verification gates
  participant Booth as Sealed booth
  participant Ledger as Ballot ledger

  Sched->>Sched: Pick random time in home presence pattern
  Sched->>Push: Send vote-now challenge (5 min TTL)
  Push->>App: Notification
  App->>Gate: Eligibility + device + location + solitude + face/liveness
  alt All gates pass
    Gate->>Booth: Open sealed ballot UI
    Booth->>Ledger: Commit encrypted ballot + eligibility proof
    Ledger->>App: Acceptance (no choice receipt)
  else Gate fails or timeout
    Gate->>Sched: Mark attempt failed; schedule retry if remaining
  end
```

### 5.1 Push window policy (product default)

- **Primary attempt:** one random time during predicted “at home alone” slot inside the election’s voting period.
- **Window length:** **5 minutes** from notification delivery (server TTL + client countdown).
- **Retries:** up to **2** additional chances if the voter does not cast a valid ballot.
- **Retry spacing:** **every other day** (≈48h) after a missed or failed attempt, still inside the election close time.
- If all attempts exhausted → `missed` (not counted); optional steward appeal path later.

### 5.2 Home presence model

1. Member enrolls a **usual home** (address + geofence, consent required).
2. App optionally learns **presence patterns** (coarse time-of-day histograms from consented location samples) — not continuous tracking by default.
3. Scheduler samples a random eligible minute where historical presence probability ≥ threshold and solitude risk is acceptable.
4. At challenge time: fresh location must be inside geofence; integrity flags checked; large teleportation from last sample rejected.

### 5.3 Solitude (important occasions)

For `constitutional` / national executive contests:

- On-device camera scene analysis: single face dominant; no secondary faces above threshold.
- Ambient / proximity heuristics as soft signals only (never sole fail reason).
- Accessibility exceptions: documented caregiver mode with steward pre-approval and higher audit weight — not silent bypass.

### 5.4 Face + liveness

1. **Enrollment** (once): capture during identity verification; store **template hash / embedding** — not raw gallery photos in the ballot path.
2. **At vote:** challenge-response liveness (blink / head turn / random prompt) + 1:1 face match to enrolled template.
3. Fail → session closed; does not consume a “successful vote”; may consume attempt depending on fraud score.

Reuse / extend existing identity tables (`identity_verification_cases`, artifact kind `live_presence`) rather than inventing a parallel KYC silo.

## 6. Fraud prevention & transparency mechanisms

### 6.1 Eligibility pipeline

Must all pass before booth opens:

1. Native mobile app (`isNativeGovernanceApp`)
2. Profile verified + governance-eligible (existing `evaluateGovernanceEligibility` + sanctions)
3. Scope membership for the election’s geography (country / region / locality)
4. Age / residency rules declared on the election
5. Not already voted in this contest
6. Device enrolled and attestation fresh
7. Biometric gates as required by security class

### 6.2 Cryptographic transparency (phased)

**Phase A (ship first):**

- Append-only `civic_voting_events` with hash chain
- Public **election commitment** (Merkle root of eligibility roster hashes + ballot commitment hashes)
- Tallies published as aggregate counts; individual choices never public

**Phase B:**

- Voter receives a **confirmation code** that proves *inclusion* in the tally set without revealing choice (hash of (ballot_id ‖ salt) published)
- External verifier mirrors (reuse governance public-audit / federation patterns)

**Phase C (research):**

- Homomorphic / mix-net tallying for stronger end-to-end verifiability

### 6.3 Separation of duties

| Role | May see |
|------|---------|
| Identity / eligibility steward | Who is eligible; never how they voted |
| Tally / audit steward | Aggregate tallies + commitments; not linkable raw ballots |
| Voter | Own session status; confirmation of *cast*, not shareable choice receipt |

## 7. Suggested additions (beyond the ask)

| # | Addition | Status | Implementation |
|---|----------|--------|----------------|
| 1 | **Duress PIN** — lookalike booth, void ballot, silent watcher alert | **Built** | `src/lib/civic-voting/duress.ts`, `civic_duress_settings` / `civic_duress_alerts` |
| 2 | **Observer mode** — turnout / gate fails without PII | **Built** (live data since 2026-10-06 via `civic_election_observer_metrics`; says plainly when no roster/gates/risk/canvass exist) | `src/lib/civic-voting/observer.ts`, `observer-metrics.ts`, `/governance/voting/:id/observe` |
| 3 | **Risk engine** — velocity, device farm, GPS cluster, impossible travel | **Built** | `src/lib/civic-voting/risk-engine.ts`, `civic_risk_findings` |
| 4 | **Paper / assisted fallback** — dual-control audit | **Built** | `src/lib/civic-voting/assisted-ballot.ts`, `civic_assisted_ballots` |
| 5 | **Candidate / measure challenge period** | **Built** | `src/lib/civic-voting/challenge-period.ts`, `civic_candidate_challenges` |
| 6 | **Cooling-off** after enrollment / home change | **Built** | `src/lib/civic-voting/cooling-off.ts` (+ `cooling_off_until`) |
| 7 | **Open-source client attestation** | **Built** | `src/lib/civic-voting/client-attestation.ts`, `civic_client_attestations` |
| 8 | **Post-election canvass** | **Built** | `src/lib/civic-voting/canvass.ts`, `civic_canvass_samples` |

Schema migration: `supabase/migrations/20260731210000_civic_voting_extras.sql`.

## 8. Data model (implementation)

Primary tables (migration):

- `civic_elections` — event metadata, tier scope, security class, open/close
- `civic_contests` — offices/measures inside an election
- `civic_candidates` — nominees / options
- `civic_voter_eligibility` — roster snapshot rows (hashed identifiers for public commit)
- `civic_vote_sessions` — scheduled push windows, attempts, status
- `civic_ballots` — sealed ballot commitments (choice ciphertext or opaque payload)
- `civic_voting_events` — append-only audit log
- `civic_home_profiles` — consented home geofence + pattern summary
- `civic_device_registrations` — push tokens + attestation metadata
- `civic_verification_checks` — per-session gate results (face, liveness, location, solitude)

Existing proposal voting (`governance_proposals` / `governance_proposal_votes`) remains for **hub proposals**. Civic elections are a **sibling** subsystem, not a reuse of approve/reject proposal votes.

## 9. Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **P0** | Design doc + schema + domain libs + hub UI scaffold + tests |
| **P1** | Session scheduler + attempt/retry policy + admin create election |
| **P2** | Push notifications (`/settings/notifications` + Capacitor push + token store) |
| **P3** | Home geofence + presence pattern + location gate |
| **P4** | Face enrollment + liveness provider integration |
| **P5** | Sealed booth UX + ballot commit RPC + public tally page |
| **P6** | Observer / risk / federation audit hooks |

## 10. Non-goals (v0.1)

- Claiming legal authority over state elections
- Storing raw face videos long-term in the ballot path
- Continuous GPS tracking without consent
- Web-browser casting for elevated/constitutional classes (native only)

## 11. Related code

- Eligibility baseline: `src/lib/governance-eligibility.ts`
- Identity cases: `identity_verification_*` tables
- Hub UI: `src/pages/Governance.tsx`
- New module: `src/lib/civic-voting/`
- New routes: `/governance/voting`, `/governance/voting/:electionId`

## 12. First public consultation

**A Single World Citizenship** is the first real public Civizen consultation. It is not demo, sample, or test data.

| | |
| --- | --- |
| Stable key | `single-world-citizenship` (`civic_elections.metadata.consultation_key`) |
| Title | A Single World Citizenship |
| Ballot question | Should humanity work toward establishing a single world citizenship, shared by all people regardless of nationality? |
| Options | Support · Oppose · Abstain |
| Scope | Global |
| Type | Ordinary nonbinding consultation (`consultation_kind = nonbinding`, `catalog = live`) |
| Routes | `/governance/voting` and `/governance/voting/:electionId` |
| Published | 2026-09-30. Voting opened then and closes 2027-09-30, using the existing one-year default. |
| Publication | Existing path only: Matter → voting proposal → `publish_voting_proposal` (founder/admin/system). Not a schema seed. |

A Support vote expresses support for working toward such a citizenship. An Oppose vote expresses opposition to that direction. Abstain records participation without supporting either position.

The consultation does not create a citizenship, replace any nationality, establish a government, or confer legal status. Voting Support does not enroll anyone.

Later consultations, if opened, stay separate. This ballot does not ask about shared land or resources, a common currency, cashless finance, a specific government or constitution, or common legal, economic, health, or education standards.

Canonical copy: `src/lib/civic-voting/single-world-citizenship.ts`. Idempotent publication: `scripts/publish-single-world-citizenship.ts`.

### 12.1 Joining and voting (ordinary consultations)

- The vote block (Support / Oppose / Abstain, or "Create account to vote" and "Sign in" for guests) sits directly under the question so it is visible without scrolling on a phone.
- Guest buttons carry the ballot page as the return path. Sign-in returns there; sign-up returns there too (immediately when the account is active, otherwise through the confirmation link and a remembered path kept for 24 hours).
- Arriving at sign-up from a ballot shows a short form: phone or email, password and the terms. Name, date of birth and language are asked later in the profile.
- A voter can change the choice until close, or withdraw the ballot (`withdraw_consultation_ballot`).
- A member can delete their own account from Settings > Privacy (`delete_my_account`): open-consultation ballots are withdrawn, the public listing is removed, personal details are cleared, the profile is marked deleted and the sign-in identity is disabled and freed. Staff, system agents and current constitutional office holders cannot delete themselves.
- Public counts show a split of ballots from verified members and from accounts not yet verified (`civic_election_verification_split`). Identity uniqueness (one person, one account) is not enforced for ordinary consultations; stronger verification is a separate, later tier.

## 13. Consultation ballot integrity (Phase A, 2026-10-06)

Migration `supabase/migrations/20261006060000_consultation_ballot_integrity.sql`; SQL test `supabase/tests/consultation_ballot_integrity_test.sql` (run with `scripts/local-supabase/run-sql-tests.sh consultation`).

| Concern | Contract |
| --- | --- |
| Eligibility (server) | `consultation_eligibility_reason(election, profile)` is checked inside `cast_consultation_ballot`. Reasons: `election_not_open`, `demo_not_votable`, `consultation_cast_ordinary_only`, `not_authenticated`, `profile_unavailable`, `voter_blocked` (active `governance_sanctions` with `blocks_voting`/`blocks_governance_all`), `verification_required` (election `metadata.requires_verified`), `age_unknown` / `under_age` (election `metadata.min_age` vs `profiles.date_of_birth`), `outside_scope` (non-global `scope_country_code` vs `profiles.country_code`). The UI reads `my_consultation_eligibility` and shows the reason with the ballot buttons disabled. |
| Secrecy | The choice is stored only in `civic_ballots.encrypted_payload` as `pgp_sym_encrypt` under a per-election secret in `civic_election_secrets` (RLS on, no API grants). Ballot/session metadata and `civic_ballot_selections` carry no option for consultations. Tallies decrypt inside the SECURITY DEFINER function `civic_election_public_tallies`. Known limit: the database owner / service role can still decrypt (Phase B/C of §6.2 remains open). |
| Receipt | `cast_consultation_ballot` returns `{ballot_id, receipt}`; the receipt is a random 24-hex `ballot_commitment`, kept when a counted choice is changed, regenerated after a withdrawal. `civic_election_receipt_included(election, receipt)` and `civic_election_receipts(election)` are public; neither reveals a choice. |
| Audit chain | Every cast, change, withdrawal, ledger start and close appends to `civic_voting_events` through `civic_append_election_event`: `event_hash = sha256(prev_hash|election_id|event_type|payload::text|created_at UTC µs)`, `actor_id` and `session_id` always NULL. Events are public-read. |
| Lifecycle | `civic_close_due_elections()` (pg_cron `civic_elections_close_tick`, hourly at :20) sets `status = closed` once `voting_closes_at` has passed, stores `metadata.final_tally` / `closed_at`, appends `election_closed`, and closes the published proposal. The client uses `resolveVotingWindow` so an election past its close time is treated as closed before the tick runs. |
| Withdrawal | Sets `is_countable = false`, clears the ciphertext, removes the directory listing, appends `consultation_withdrawn`. The former reversible `prior_choice_hash` is no longer written. |

## 14. Member-initiated consultations and notifications (2026-10-06)

Migration `supabase/migrations/20261006070000_voting_proposals_member_support.sql`; SQL test `supabase/tests/voting_proposal_support_test.sql`.

| Concern | Contract |
| --- | --- |
| Draft | Unchanged: the initiator or responsible person of a Matter (or a manager) creates a draft with `create_voting_proposal_from_matter`. |
| Open for support | The author (or a manager) calls `open_voting_proposal_for_support(proposal, threshold)`; `metadata.open_for_support = true`, `metadata.support_threshold` (1–1000, default 10). Open drafts are readable by every signed-in member. |
| Support | `toggle_voting_proposal_support(proposal)` adds or removes one row in `civic_voting_proposal_support` for the caller (signed in, profile not deleted, no `proposal_create` sanction). `voting_proposal_support_summary` reports count, threshold, whether the caller supports it, and `ready`. |
| Scope and timing | While a draft, `update_voting_proposal_settings` sets `scope_kind` (`global` or `country` + ISO-3166 alpha-2), `voting_opens_at`, `voting_closes_at` (closes must follow opens). |
| Publish | `publish_voting_proposal`: managers at any time; the author once `ready`. Tier follows scope (`country` → `national`, else `supranational`). A future opening time creates a `scheduled` election; the lifecycle tick (`civic_close_due_elections`, hourly) opens it and appends `election_opened`. Publication appends `election_published` and notifies the author, supporters and Matter parties (`civic_consultation_published`, entity `civic_election`). |
| Close | The tick notifies everyone whose ballot counted (`civic_consultation_closed`). |
| Notifications | `public.user_notifications` is read and marked read directly by the owner (existing RLS); producers are server functions only (`civic_notify_profiles`). UI: bell in the app chrome, `/notifications`, Settings › Notifications. |
| Member surface | `/governance/workspace` is the one member Governance page: Votes (open / scheduled / results), Proposals (open for support, mine, published, closed), Tools (steward console `/governance/tools/steward`, legacy workspace `/governance/tools`; shown only to founders/admins/system, role or settings managers, and office holders). `/governance/new` redirects to the steward console. |
| Legacy proposal votes | `governance_proposal_votes.weight` is clamped to 0..1 by trigger; the client can no longer inflate a vote. |
