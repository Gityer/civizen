---
content_id: governance-implementation-roadmap-v0-1
title: Governance Implementation Roadmap v0.1
content_category: system_operations
moderation_lane: moderated
content_type: runbook
professional_domain: technology
contribution_policy: staff_only
owner_role: founder
review_status: draft
historical_note: Historical implementation planning notes. References to “activation review” describe legacy internal terminology; current product language is program readiness and availability.
---

# Governance Implementation Roadmap v0.1

> **Historical document.** Some sections still use legacy “activation review” terminology for schema and migration planning. Present user-facing language is **program readiness and availability**. See `docs/01-governance/participation/community-readiness-and-program-availability-framework.md` and `/about/planetary-citizenship-pathway`.

> **Institutional alignment (2026-08-12):** How institutions are structured is the [Institutional Blueprint](../../institutional/institutional-blueprint.md). How authority is distributed is the [Governance Framework](../../institutional/governance-framework.md). Who Civizen engages is the [Stakeholder & Partnership Framework](../../institutional/stakeholder-partnership-framework.md). What Civizen tests with those participants is the [Pilot Framework](../../institutional/pilot-framework.md). How founder authority evolves is the [Founder Transition & Succession Framework](../../institutional/founder-transition-succession-framework.md) (current conceptual stage **F0**; public availability ≠ official deployment). The public community process is the [Community Governance Charter](../../02-policies/governance/civizen-community-governance-charter.md), which replaced `civizen-constitution-v0.1.md`. This roadmap remains a historical implementation plan. Do not treat a minimum Civizen score as a rule that a numeric score determines voting power, and do not treat the in-app `ordinary` / `elevated` / `constitutional` scaffold as the Framework’s seven decision classes. Do not reduce founder bootstrap access from this historical roadmap.

## 1. Purpose

This roadmap turns the current governance draft set into an implementation sequence for the actual Civizen codebase. It maps constitutional and policy concepts to:

- schema changes
- role and permission model changes
- UI and route changes
- operational rollout phases
- testing requirements

## 2. Source Documents

The policy source of truth for this roadmap is currently:

- `docs/institutional/institutional-blueprint.md` (working institutional architecture)
- `docs/institutional/governance-framework.md` (working governance / authority distribution)
- `docs/institutional/stakeholder-partnership-framework.md` (who Civizen engages)
- `docs/institutional/pilot-framework.md` (what Civizen tests with participants)
- `docs/institutional/founder-transition-succession-framework.md` (how founder authority evolves; F0 current conceptual stage)
- `docs/02-policies/governance/civizen-community-governance-charter.md` (current public community charter)
- `docs/02-policies/legal/civizen-terms-of-use.md`
- `docs/01-governance/constitution/civizen-constitution-v0.1.md` (historical / superseded)
- `docs/02-policies/citizenship-and-verification/citizenship-and-verification-policy-v0.1.md`
- `docs/archive/superseded/founder-role-charter-v0.2.md`
- `docs/01-governance/roles-and-permissions/role-domains-and-maturity-thresholds-v0.1.md`
- `docs/01-governance/participation/citizen-status-model-v0.1.md`
- `docs/01-governance/roles-and-permissions/governance-permission-model-v0.1.md`
- `docs/01-governance/country-activation/country-activation-framework-v0.1.md`
- `docs/01-governance/institutions/advisory-high-council-model-v0.1.md`

## 3. Current Codebase Snapshot

### 3.1 Current identity and role model

Current profile and role state is centered in:

- `public.profiles`
- `src/contexts/AuthContext.tsx`
- `src/lib/access-control.ts`
- `supabase/migrations/20260327213000_add_role_based_access_control.sql`
- `supabase/migrations/20260413102000_add_citizen_role_and_refresh_content_rules.sql`

The current role model is still a product-era model:

- `guest`
- `member`
- `citizen`
- `verified_member`
- `certified`
- `moderator`
- `market_manager`
- `admin`
- `founder`
- `system`

### 3.2 Current governance state

Governance storage is currently concentrated in:

- `monetary_policy_profiles`
- `monetary_policy_approvals`
- `monetary_policy_audit_events`
- `governance_action_intents`

The current governance screen is:

- `src/pages/settings/GovernanceAdmin.tsx`

This screen is still mounted under an admin route:

- `/settings/admin/governance`

### 3.3 Current gaps

The codebase does not yet have first-class storage for:

- citizenship acceptance timing
- active citizen status
- governance-eligible status
- domain-based stewardship roles
- role maturity thresholds
- sanctions and governance blocks
- identity verification case workflow
- country activation review workflow
- founder office separated from blanket founder permissions
- advisory or constitutional council membership

## 4. Design Rules For Implementation

These rules should govern all implementation work:

1. Separate public reputation from governance eligibility.
2. Keep `1 eligible citizen = 1 vote` as the default.
3. Make minimum Civizen score mandatory for governance rights.
4. Treat Founder as constitutional office, not blanket super-admin.
5. Decentralize by domain, not by one big switch.
6. Keep sensitive identity data off-chain and minimally accessible.
7. Prefer append-only and auditable governance state for sensitive actions.

## 5. Policy Concept To Implementation Map

### 5.1 Registered Member

Current state:

- already exists through `profiles` and auth signup flow

Needed implementation:

- no major new state required
- ensure this remains the default onboarding state

Likely code surfaces:

- `src/pages/auth/SignUp.tsx`
- `src/contexts/AuthContext.tsx`

### 5.2 Verified Member

Current state:

- partially represented by `profiles.is_verified`

Needed implementation:

- add structured verification case workflow instead of only a boolean
- preserve `is_verified` as a fast-read projection

Recommended schema:

- `identity_verification_cases`
- `identity_verification_artifacts`
- `identity_verification_reviews`

### 5.3 Citizen

Current state:

- partially overloaded into `profiles.role = citizen`

Needed implementation:

- separate citizenship status from role
- store acceptance timing and review path

Recommended schema:

- add to `profiles`:
  - `citizenship_status`
  - `citizenship_accepted_at`
  - `citizenship_acceptance_mode`
  - `citizenship_review_cleared_at`

Recommended projection rule:

- role should no longer be the sole source of civic status

### 5.4 Active Citizen

Current state:

- does not exist as first-class state

Needed implementation:

- add active citizenship state separate from verified and citizen
- allow country and later world activation scope

Recommended schema:

- add to `profiles`:
  - `is_active_citizen`
  - `active_citizen_since`
- add new table:
  - `citizen_activation_scopes`
    - `profile_id`
    - `scope_type` such as `country` or `world`
    - `country_code`
    - `activated_at`

### 5.5 Governance-Eligible Citizen

Current state:

- only partially modeled in frontend logic inside `GovernanceAdmin.tsx`

Needed implementation:

- move from client-only derived state toward persisted eligibility snapshot plus server-side checks

Recommended schema:

- `governance_eligibility_snapshots`
  - `profile_id`
  - `civizen_score`
  - `governance_score`
  - `eligible`
  - `reason_codes`
  - `calculated_at`
  - `calculation_version`

Recommended projection fields:

- add to `profiles`:
  - `is_governance_eligible`
  - `governance_eligible_at`

### 5.6 Founder Office

Current state:

- `founder` is just a role with blanket permissions

Needed implementation:

- separate constitutional office from ordinary application permissions

Recommended schema:

- add to `profiles`:
  - `constitutional_office`
- or better:
  - `constitutional_offices`
    - `office_key`
    - `profile_id`
    - `assigned_at`
    - `is_active`

Recommended initial office values:

- `founder`

Implementation rule:

- remove long-term dependence on `founder: [...APP_PERMISSIONS]` in `src/lib/access-control.ts`

### 5.7 Domain Stewardship Roles

Current state:

- current roles are broad and product-oriented

Needed implementation:

- add governance domain roles independent from civic status

Recommended schema:

- `governance_domains`
- `governance_domain_roles`
- `profile_governance_roles`
- `governance_role_requirements`

Suggested initial domain keys:

- `identity_verification`
- `moderation_conduct`
- `constitutional_review`
- `policy_legal`
- `treasury_finance`
- `market_oversight`
- `technical_stewardship`
- `dispute_resolution`
- `security_incident_response`
- `civic_education`
- `activation_review`

### 5.8 Maturity Thresholds

Current state:

- policy only, not in schema

Needed implementation:

- store domain thresholds and current maturity status

Recommended schema:

- `governance_domain_maturity_thresholds`
- `governance_domain_maturity_snapshots`

### 5.9 Country Activation

Current state:

- policy only

Needed implementation:

- activation review workflow and auditable declaration state

Recommended schema:

- `activation_threshold_reviews`
- `activation_evidence`
- `activation_decisions`

Suggested fields:

- jurisdiction scope
- target population source
- verified count
- threshold percent
- review state
- declared_at

### 5.10 Advisory / High Council

Current state:

- policy only

Needed implementation:

- membership and standing model

Recommended schema:

- `constitutional_bodies`
- `constitutional_body_memberships`
- `constitutional_body_actions`

## 6. Permission Model Refactor

### 6.1 Current problem

Current permissions in `src/lib/access-control.ts` are too broad for the new civic design, especially:

- `role.assign`
- `settings.manage`
- founder blanket permission inheritance

### 6.2 Target structure

Keep application permissions for ordinary UI and content management, but add governance-specific permissions such as:

- `governance.vote.ordinary`
- `governance.propose.ordinary`
- `governance.review.ordinary`
- `governance.vote.constitutional`
- `governance.review.constitutional`
- `identity.verify`
- `identity.review.appeal`
- `activation.review`
- `treasury.review`
- `treasury.audit`
- `security.respond`
- `dispute.review`

### 6.3 Founder transition rule

Founder should no longer permanently derive all permissions from a single app role. Founder access should instead come from:

- constitutional office
- temporary bootstrap domain stewardship
- explicit audit and integrity rights

## 7. UI And Route Map

### 7.1 Existing surfaces to modify

- `src/pages/auth/SignUp.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Home.tsx`
- `src/pages/Settings.tsx`
- `src/pages/TermsOfUse.tsx`
- `src/pages/settings/UsersAdmin.tsx`
- `src/pages/settings/GovernanceAdmin.tsx`
- `src/pages/settings/Professions.tsx`

### 7.2 New user-facing surfaces to add

- `Citizenship Status` page
- `Governance Eligibility` page
- `Identity Verification` flow page
- `Governance Proposals` page
- `Governance Voting` page
- `Activation Status` page

### 7.3 New steward-facing surfaces to add

- `Identity Review` console
- `Activation Review` console
- `Governance Role Stewardship` console
- `Council / Constitutional Body` console

### 7.4 Navigation changes

Current `adminGovernance` route should eventually split into:

- citizen-facing governance area
- steward-facing governance operations area

The citizen-facing governance area should not remain only an admin route.

## 8. Schema Rollout Phases

### Phase 1. Civic status normalization

Goal:

- separate civic status from product role

Changes:

- add citizenship, active, and governance-eligible fields
- add governance eligibility snapshot table
- preserve current role field as compatibility layer

### Phase 2. Verification workflow

Goal:

- replace bare verification boolean with structured review flow

Changes:

- add verification case tables
- project final state back to `profiles.is_verified`

### Phase 3. Founder office and domain roles

Goal:

- separate constitutional office from all-powerful app role

Changes:

- add office and domain-role tables
- reduce founder blanket permissions

### Phase 4. Governance participation model

Goal:

- support citizen-facing proposals, voting, and review

Changes:

- add proposal, vote, quorum, and ratification tables
- make governance action intents part of normal proposal lifecycle

### Phase 5. Activation and maturity

Goal:

- allow country/world activation and domain transition

Changes:

- add activation review tables
- add maturity threshold and maturity snapshot tables

## 9. Proposed Migration Order

1. add civic status columns and governance eligibility snapshot table
2. add verification case tables
3. add sanctions and governance block state
4. add constitutional office and domain role tables
5. add proposal and voting tables
6. add activation and maturity tables
7. refactor permissions and route guards

## 10. Required Server-Side Enforcement

The current frontend checks are useful but insufficient long-term.

The system should move critical governance enforcement into:

- RLS policies
- SQL functions
- signed-intent verification flows
- server-side eligibility checks

Critical actions that must not stay client-only:

- governance eligibility determination
- governance role assignment
- proposal creation in reserved domains
- constitutional review access
- activation declaration

## 11. Testing Requirements

### 11.1 Unit tests

- score to governance-eligibility calculation
- founder office normalization rules
- civic status transition logic
- permission resolution logic

### 11.2 Integration tests

- verified member to citizen transition
- citizen to active citizen activation
- governance eligibility gating
- domain maturity threshold transition

### 11.3 Security tests

- private data isolation
- founder access logging
- no governance writes from ineligible users
- no bypass of mobile governance path where required

## 12. Immediate Repo Backlog

The highest-signal next engineering backlog for this repository is:

1. add first-class civic status fields and tables
2. create a reusable governance eligibility service backed by database snapshots
3. separate founder office from founder app super-role
4. add a citizen-facing governance entry point instead of admin-only governance
5. add identity verification workflow tables and UI
6. harden sanctions reporting, notification, and appeals analytics on top of sanctions/governance-block enforcement
7. add proposal and vote tables

## 13. Current Implementation Status

The repository has now completed a substantial portion of the early roadmap.

Implemented:

- civic status normalization fields and projections
- governance eligibility snapshots and gating logic
- identity verification workflow tables and UI flow
- citizen-facing governance route with proposals and voting
- governance execution units and implementation queue
- governed execution adapters for permissions, memberships, verification, activation, monetary policy, certification, and content state
- sanctions and governance-block state with server-side enforcement in proposal creation, voting, verification review, and execution paths
- steward-facing sanctions management tooling and citizen appeal workflow on top of sanctions/governance-block enforcement
- constitutional office normalization bootstrap (`constitutional_offices`) with founder office backfill and helper functions
- founder app-role hardening from blanket superuser inheritance to explicit founder baseline permissions
- privileged support impersonation path hardening (the `admin-impersonate-user` function was later removed entirely, commit c3ffc2d): it defaulted to disabled unless `ALLOW_ADMIN_IMPERSONATION=true` is explicitly set for audited emergency workflows
- auditable emergency support workflow baseline: `governance_emergency_access_requests` + `request_governance_emergency_access(target_profile_id, request_reason)` capture staff emergency-access intent as append-only request records; Users admin now submits requests (with required reason) instead of directly switching sessions
- emergency support review workflow baseline: `governance_emergency_access_request_board(requested_status, max_requests)` plus `review_governance_emergency_access_request(target_request_id, next_status, review_notes)` enable explicit manager approval/rejection, and Users admin now includes a steward-facing emergency access request review panel
- emergency support lifecycle hardening: approvals now carry bounded TTL (`approved_expires_at`), impersonation-path claims are one-time (`consumed_at`, `consumed_by`) via `claim_governance_emergency_access_request_for_impersonation`, and `admin-impersonate-user` now requires an approved unconsumed `requestId` before issuing any temporary magic-link token
- emergency support audit trail baseline: append-only `governance_emergency_access_request_events` captures request/review/expire/consume transitions (triggered from request row changes), with governance-facing summary and board RPCs (`governance_emergency_access_event_summary`, `governance_emergency_access_request_event_board`) plus Users admin event summary readout
- emergency support operations UX hardening: Users admin now supports emergency-request status filtering, text search, and per-request timeline expansion backed by `governance_emergency_access_request_event_board`, making approvals and claims reviewable without direct SQL access
- emergency support autonomous operations baseline: `expire_governance_emergency_access_requests` + hourly `gpav_emergency_access_expiry_tick` (pg_cron minute 10) auto-expire stale pending and stale approved-unconsumed requests; `governance_emergency_access_ops_summary` now surfaces stale-pending and near-expiry signals for steward monitoring
- governance hub cross-surface emergency ops escalation: `maybe_escalate_governance_emergency_access_ops_execution_page` opens/resolves `governance_emergency_access_ops_escalation` external execution pages (latest public audit batch context) and the Governance hub now surfaces those open page counts with direct links into Users admin stewardship
- emergency ops incident workflow hardening: Users admin now loads emergency-access escalation pages from `governance_public_audit_external_execution_page_board` and supports explicit acknowledge/resolve actions; `acknowledge_governance_public_audit_external_execution_page` adds acknowledgement status transitions and notes for on-call handoff clarity
- emergency ops timeline analytics baseline: `governance_public_audit_external_execution_page_history(requested_page_key_substring, requested_lookback_hours, max_pages)` provides cross-batch incident history, and Users admin now exposes 7-day escalation trend cards plus per-incident timeline details (opened/acknowledged/resolved) for emergency-access ops pages
- emergency ops policy controls baseline: `governance_emergency_access_ops_policies` plus `governance_emergency_access_ops_policy_summary` / `set_governance_emergency_access_ops_policy` provide steward-editable thresholds (pending max age, approved max age, near-expiry window, escalation enabled/channel), and the hourly expiry tick now reads policy values instead of hardcoded defaults
- emergency ops policy audit timeline baseline: `governance_emergency_access_ops_policy_events` plus `governance_emergency_access_ops_policy_event_history` capture/create attributable policy-change events from `set_governance_emergency_access_ops_policy`, and Users admin now exposes a policy-change timeline for stewardship reviews
- emergency ops rollback safety baseline: `rollback_governance_emergency_access_ops_policy_to_event(target_event_id, max_rollback_age_hours, required_policy_schema_version)` restores thresholds/channel/escalation state from audited policy-event metadata (created/updated snapshots), enforces rollback guardrails for snapshot age and policy schema compatibility, and records rollback provenance through policy metadata + follow-on update events; `governance_emergency_access_ops_policy_event_eligibility` now returns server-authoritative per-event rollback eligibility/reason so Users admin blocks stale/incompatible/incomplete snapshots using the same backend criteria
- governance domain-role normalization (`governance_domains`, `governance_domain_roles`, `profile_governance_roles`) with bootstrap backfill from execution-unit memberships
- sensitive governance-adjacent policies rerouted from unit-key checks to domain stewardship checks
- activation review workflow tables (`activation_threshold_reviews`, `activation_evidence`, `activation_decisions`) with declaration-gated activation controls
- steward-facing activation review console with decision logging and demographic snapshot ingestion automation (`activation_demographic_snapshots`, `capture_activation_demographic_snapshot`, `capture_scheduled_activation_demographic_snapshots`)
- signed external activation feed adapter layer (`activation_demographic_feed_adapters`, `activation_demographic_feed_ingestions`, `ingest_signed_activation_demographic_feed_snapshot`) with signature-verification-assisted steward ingestion
- adapter worker run + alerting baseline for signed demographic feeds (`activation_demographic_feed_worker_runs`, `record_activation_demographic_feed_worker_run`, `resolve_activation_demographic_feed_worker_alerts`, `activation_demographic_feed_worker_alert_summary`) with steward-facing sweep controls and freshness/signature-failure surfacing
- activation demographic feed worker escalation into public audit external execution paging when any active adapter breaches freshness SLA or has unresolved failure-class worker alerts (`maybe_escalate_activation_feed_worker_exec_page`, `activation_demographic_feed_worker_escalation` execution page; feed stewards may open/resolve that page key alongside verifier stewards)
- steward-managed **activation feed worker escalation policy** (`activation_demographic_feed_worker_escalation_policies`, `activation_demographic_feed_worker_escalation_policy_events`, `activation_demographic_feed_worker_escalation_policy_summary`, `set_activation_demographic_feed_worker_escalation_policy`, `act_feed_worker_esc_pol_evt_hist`) so freshness, minimum issue count, severity, and enablement are audited; schedule ticks use policy freshness (`use_policy_freshness` in `maybe_escalate_activation_feed_worker_exec_page` context) while steward manual refresh can force paging (`force_manual_escalation`); adapters panel surfaces policy controls and recent change history
- activation demographic feed worker **schedule + outbox queue** for cadence-based sweep work (`activation_demographic_feed_worker_schedule_policies`, per-adapter `worker_sweep_interval_minutes`, `activation_demographic_feed_worker_outbox`, `schedule_activation_demographic_feed_worker_jobs`, `claim_activation_demographic_feed_worker_jobs`, `complete_activation_demographic_feed_worker_outbox`, stale-claim release) with steward UI actions to queue due jobs and process the queue; optional **pg_cron** (`CREATE EXTENSION IF NOT EXISTS pg_cron`) registers hourly `activation_demographic_feed_worker_schedule_tick` calling `run_activation_demographic_feed_worker_schedule_automation` (superuser-only) to enqueue due sweeps without browser sessions
- maturity threshold and snapshot workflow tables (`governance_domain_maturity_thresholds`, `governance_domain_maturity_snapshots`) with baseline threshold seeding and founder-exit-aware domain access checks
- maturity workflow hardening with scheduled/event-driven snapshot refresh automation, steward review UI surfaces, and transition observability (`governance_domain_maturity_transitions`)
- sensitive execution threshold rules (`governance_execution_threshold_rules`) with server-side approval gating for proposal ratification and execution readiness
- guardian signer approval tracks for critical proposals (`governance_proposal_guardian_approvals`) with execution-readiness enforcement on guardian-threshold actions
- external guardian multisig infrastructure baseline (`governance_guardian_multisig_policies`, `governance_guardian_external_signers`, `governance_proposal_guardian_external_signatures`) with proposal-level external signoff attestations and guardian-summary integration
- public audit batching and anchor recording baseline (`governance_public_audit_batches`, `governance_public_audit_batch_items`) with hash-chain verification workflow
- guardian external multisig cryptographic verification path (`verifyExternalGuardianSignature`, `hashExternalSignedMessage`) wired into steward signoff capture
- replicated public-audit verifier infrastructure (`governance_public_audit_replication_policies`, `governance_public_audit_verifier_nodes`, `governance_public_audit_batch_verifications`, `governance_public_audit_network_proofs`) with steward UI and batch-level threshold summaries
- guardian relay quorum + chain-proof reconciliation layer (`governance_guardian_relay_policies`, `governance_guardian_relay_nodes`, `governance_proposal_guardian_relay_attestations`, `governance_proposal_guardian_relay_summary`) integrated into guardian-threshold execution readiness
- guardian relay diversity + attestation audit reporting baseline (`min_distinct_relay_*` policy thresholds, relay region/provider/operator/trust metadata, `governance_proposal_guardian_relay_diversity_audit`, `governance_proposal_guardian_relay_attestation_audit_report`, `governance_guardian_relay_audit_reports`) with steward capture snapshots and per-relay health surfaces
- trust-minimized relay quorum + client-verifiable guardian proof manifest baseline (`governance_proposal_guardian_relay_trust_minimized_summary`, `governance_proposal_guardian_relay_client_proof_manifest`, `governance_proposal_client_verification_manifests`, `capture_governance_proposal_guardian_relay_client_manifest`) with jurisdiction/trust-domain diversity and concentration-threshold policy surfaces
- deterministic client-verification package + distribution signing baseline for guardian relay proofs (`governance_proposal_client_verification_packages`, `governance_proposal_client_verification_package_signatures`, `governance_proposal_guardian_relay_client_verification_package`, `capture_governance_proposal_guardian_relay_client_verification_package`, `sign_governance_proposal_guardian_relay_client_verification_package`) with steward-facing package/signature distribution workflows
- immutable public-audit anchoring adapter + external execution orchestration baseline (`governance_public_audit_anchor_adapters`, `governance_public_audit_immutable_anchors`, `governance_public_audit_anchor_execution_jobs`, `governance_public_audit_verifier_jobs`, `schedule_governance_public_audit_anchor_execution_jobs`, `complete_governance_public_audit_anchor_execution_job`, `run_governance_public_audit_external_execution_cycle`, `schedule_governance_public_audit_verifier_jobs`, `complete_governance_public_audit_verifier_job`) with operations SLA dashboard summaries (`governance_public_audit_operations_sla_summary`, `governance_public_audit_anchor_execution_job_board`)
- immutable-anchor external execution worker production hardening (`governance_public_audit_external_execution_policies`, `governance_public_audit_external_execution_pages`, `governance_public_audit_external_execution_policy_summary`, `set_governance_public_audit_external_execution_policy`, `claim_governance_public_audit_external_execution_jobs`, `governance_public_audit_external_execution_paging_summary`, `governance_public_audit_external_execution_page_board`) with retry/backoff policy controls, queue-draining claim runtimes, and on-call paging workflows
- replaceable public-audit verifier mirror baseline (`governance_public_audit_verifier_mirrors`, `governance_public_audit_verifier_mirror_checks`, `governance_public_audit_verifier_mirror_health_summary`, `governance_public_audit_client_verifier_bundle`) with steward mirror health reporting and client-bundle hash surfacing
- verifier-mirror productionization baseline (`governance_public_audit_verifier_mirror_directory_signers`, `governance_public_audit_verifier_mirror_directories`, `governance_public_audit_verifier_mirror_failover_policies`, `governance_public_audit_verifier_mirror_probe_jobs`, `governance_public_audit_verifier_mirror_probe_job_summary`, `governance_public_audit_verifier_mirror_probe_job_board`) with signed-directory publication, configurable client failover policy, and probe-job scheduling/completion flows in steward UI
- signed directory trust-quorum baseline (`governance_public_audit_verifier_mirror_directory_attestations`, `governance_public_audit_verifier_mirror_directory_trust_summary`, `set_governance_public_audit_verifier_mirror_min_independent_signers`, `record_governance_public_audit_verifier_mirror_directory_attestation`) with independent-signer threshold policy surfaces and client-bundle trust-quorum gating
- governance and admin UI refactors needed to keep the active implementation maintainable
- engineering standards enforcement for file size and ongoing code health

Partially implemented:

- signed governance support exists in bootstrap form, but is not yet the sole enforcement path for all sensitive actions
- activation workflow now includes steward consoles, automated snapshot ingestion, signed external feed adapter ingestion, worker sweep/feed-health alerting baseline, external execution paging escalation for feed worker SLA breaches, governance-admin readout of the default worker schedule policy (cadence and stuck-claim timeout) plus live scheduler automation status (`activation_demographic_feed_worker_schedule_automation_status`) and latest cron run outcome visibility next to queue controls, append-only schedule automation run ledger + run history RPC, steward-scoped `activation_demographic_feed_worker_escalation_page_history` for on-call page incident analytics, steward-scoped batch board plus `acknowledge_activation_demographic_feed_worker_escalation_page` / `resolve_activation_demographic_feed_worker_escalation_page` so feed operators can acknowledge or resolve feed-worker escalation pages in-panel without public-audit verifier manager RPCs, and a steward action to re-run `maybe_escalate_activation_feed_worker_exec_page` from the signed feed adapters panel; schedule enqueue passes (steward UI and pg_cron) re-run that escalation check so paging stays fresh without requiring a browser-driven sweep, but production scheduler hardening and deeper paging integrations are not yet complete
- governance execution is now threshold-backed with guardian signoff, cryptographic external signatures, relay quorum/chain-proof reconciliation, diversity/audit reporting baselines, production relay operations hardening (worker runs, quorum-health alerting, trust-minimized + ops-readiness policy gates), and optional **pg_cron** ticks for guardian relay proof-distribution escalation (`gpav_gr_proof_dist_esc_tick`, Phase C.13) plus attestation SLA sync and critical external execution escalation (`gpav_gr_attestation_sla_sync_tick`, Phase C.14), but third-party verifier interoperability and deterministic client verification package distribution are not yet complete
- public audit and replicated-state anchoring now include immutable anchor adapters, external execution worker orchestration, queue-draining claim runtimes, retry/backoff controls, on-call paging baselines, an optional hourly **pg_cron** tick (`public_audit_external_execution_cycle_tick`) that runs external execution scheduling plus paging evaluation without steward browser sessions, a steward-readable automation status RPC (`governance_public_audit_external_execution_automation_status`), and governance automation panel telemetry cards for cron runtime health and latest cycle activity; distributed worker runtime deployment across independent operators is still not yet complete
- trust-minimized relay quorum and client-verifiable governance proof surfaces now include baseline policy thresholds, append-only manifest capture, deterministic verification package snapshots, distribution signing baselines, and an optional hourly **pg_cron** tick for `run_governance_public_audit_verifier_federation_distribution_verification` (see verifier federation rollout plan Phase C.12), but third-party verifier interoperability and federated verifier package exchange are not yet complete
- minimized trusted-backend rollout now includes replaceable verifier mirror registration, signed directory publication, failover-policy configuration, probe-job automation, signed-directory trust-quorum baselines, autonomous mirror-discovery federation sources/candidates, federated mirror-policy ratification baselines, independent directory-signer governance attestations/approval workflows, client-bundle federation diversity quorum gating for distinct operator/region thresholds, and externally operated multi-operator federation onboarding plus operations-hardening workflows
- distributed verifier-federation package distribution baseline now includes append-only package capture/signature ledgers and deterministic package/signature summary surfaces (`governance_public_audit_verifier_federation_packages`, `governance_public_audit_verifier_federation_package_signatures`, `governance_public_audit_verifier_federation_package`, `capture_governance_public_audit_verifier_federation_package`, `sign_governance_public_audit_verifier_federation_package`)
- cross-operator federation exchange accountability now includes append-only exchange attestation logs/summaries (`governance_public_audit_verifier_federation_exchange_attestations`, `record_governance_public_audit_verifier_federation_exchange`, `governance_public_audit_verifier_federation_exchange_summary`, `governance_public_audit_verifier_federation_exchange_board`) plus stewardship UI capture/review in federation distribution controls, but routine third-party operator rehearsals and signed external automation ingestion are still pending field adoption
- exchange receipt verification hardening now supports optional cryptographic receipt payload/signature evidence at attestation time and explicit stewardship verification decisions via `gpav_verify_federation_exchange_receipt` (plus long-form verifier RPC), with exchange summary/board visibility for receipt evidence and pending verification backlog
- exchange receipt operations now include autonomous backlog escalation: `maybe_escalate_verifier_fed_exchange_receipt_page` opens/resolves external execution pages keyed `verifier_federation_exchange_receipt_escalation`, and optional hourly tick `gpav_fed_exchange_receipt_tick` refreshes the signal from exchange summary backlog counters
- exchange receipt escalation controls are now governance-policy managed: `gpav_fed_exchange_receipt_policies` + `gpav_fed_exchange_receipt_policy_summary` / `set_gpav_fed_exchange_receipt_policy` configure lookback/threshold/channel/enablement, policy changes are append-only audited in `gpav_fed_exchange_receipt_policy_events`, and rollback to audited snapshots is supported via `rollback_gpav_fed_exchange_receipt_policy_to_event` with schema/age guardrails
- exchange receipt verification age SLO hardening now includes policyized stale-age controls (`receipt_max_verification_age_hours`, `critical_stale_receipt_count_threshold`) plus age-bucket backlog analytics (`gpav_fed_exchange_receipt_backlog_age_summary`) used by escalation severity logic and federation stewardship policy controls
- exchange receipt escalation automation telemetry now includes `gpav_fed_exchange_receipt_automation_status` (cron registration/activity, latest cron run details, latest pending/verified receipt timestamps, latest escalation page status) and steward UI readout in federation distribution controls so on-call can verify backlog automation health without querying `cron.job` directly
- exchange receipt escalation automation now includes an append-only run ledger (`gpav_fed_exchange_receipt_automation_runs`), steward-triggerable sweep RPC (`run_gpav_fed_exchange_receipt_automation_check`), and run-history RPC (`gpav_fed_exchange_receipt_automation_run_history`); the cron tick now uses the same run path so manual and autonomous checks share one auditable operations timeline
- federation receipt escalation incident operations now include historical analytics in stewardship load by querying `governance_public_audit_external_execution_page_history` for `verifier_federation_exchange_receipt`, with in-panel 24h open/resolve flow and unresolved/average-resolution metrics for faster on-call triage and trend detection

Not yet implemented:

- immutable public-state anchoring adapters with independent verifier automation
- minimized trusted-backend model with broadly distributed client-verifiable governance proofs

## 14. Immediate Next Steps

The next implementation sequence should now be:

1. productionize adapter worker scheduling and escalation routing for signed demographic feeds on top of the new worker + alerting baseline
2. productionize guardian relay diversity + attestation audit reporting with independent workers, stronger anti-concentration policy enforcement, and quorum-health SLA alerting
3. productionize trust-minimized relay quorum and client-verifiable governance proof distribution on top of the new manifest baseline
4. productionize minimized trusted-backend rollout with signed verifier mirror directories, autonomous health probing, and client-side mirror failover policy
5. begin distributed mirror-governance and verifier-federation rollout planning

Step 5 kickoff artifact: [Verifier federation rollout plan v0.1](verifier-federation/rollout-plan-v0.1.md)

Implementation tracking for Step 5 lives in that document (handoff status, steward polish notes, **§9 headline federation rollout implementation %** (~100% for §4 scope; not a formula), and **§10 multi-operator rehearsal checklist** for the non-percentage field gate).

## 15. Suggested Ownership Sequence

To keep implementation coherent, work in this order:

1. schema normalization
2. server-side eligibility enforcement
3. role and permission refactor
4. citizen-facing governance UI
5. steward consoles
6. activation and maturity workflows

## 16. Continuation Note

This roadmap is now the best repo-native handoff point for continuation. A new chat can resume effectively from the current codebase if it is directed to:

- continue Civizen decentralization from `docs/04-operations/dev/governance-implementation-roadmap-v0.1.md`
- use `docs/03-platform/decentralization/decentralized-transition-architecture.md` as the target architecture
- start with `Section 14. Immediate Next Steps`
- for **verifier mirror / federation rollout** status, headline program %, and multi-operator rehearsal gate, read `docs/04-operations/dev/verifier-federation/rollout-plan-v0.1.md` §8–§10 in the same session

The safest short continuation prompt is:

`Continue the Civizen decentralization work from docs/04-operations/dev/governance-implementation-roadmap-v0.1.md, starting with Section 14 Immediate Next Steps.`

## 17. Success Condition

This roadmap is complete when:

- civic status is first-class in schema
- governance rights are server-enforced
- founder office is constitutionally distinct from blanket admin power
- domain stewardship is modeled explicitly
- governance participation exists for citizens, not only admins
- activation and maturity can be tracked procedurally
