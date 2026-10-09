# Matter Collaboration System

**Project:** Civizen  
**Routes:** `/contribute/matters`, `/contribute/matters/new`, `/contribute/matters/:matterId`  
**Status:** Phase 1 + Phase 2 + Phase 3 + Phase 4A (Human–AI collaboration) + Phase 4B1 (controlled Coding Agent) shipped  
**Version:** 4.0

Canonical product/UX note for agents. Contribute hub: [`contribute-page.md`](./contribute-page.md).

A **Matter** is something one Civizen actor brings to one or more other actors for attention, response, discussion, consideration, or action. It is a generic collaboration object, not an Issues module and not limited to government/citizen interactions.

User-facing Contribute label: **Questions, Issues & Ideas**. Internal model remains `Matter`.

## Principle

Every **active** Matter must make clear:

1. who is expected to act next,
2. what action is expected,
3. when it is due,
4. what happens if no action is taken.

Operational state lives on **Matter Action Requirements**, not on one oversized Matter status enum.

## Lifecycle vs action state

Matter lifecycle: `draft` · `submitted` · `active` · `closed`.

User-facing status is **derived** (waiting for response, clarification needed, waiting for initiator, response overdue, addressed, automatically closed, reopened, …).

## Actors

Initiator and recipient are polymorphic:

- person (`profiles`)
- organization (business-linked `profiles` via `linked_accounts`)
- group (reserved; no groups table in this phase)

Do not model only `user_id`. Organization representatives use `current_profile_manages_publisher`.

## Invariants

1. A comment is not a formal action.
2. Disputing responsibility does not close or hide the Matter.
3. Auto-close is not initiator confirmation. Silence uses: *Closed automatically after no response from the initiator within the resolution-review period.*
4. Reopening is append-only; prior closure stays on the ledger.
5. Active Matters have a current action requirement, one or more pending actions, or an explicit waiting condition.
6. Deadline and history changes are attributable (human vs system).
7. Simple Matters stay simple: contextual formal actions only. Collaborative work is opt-in.
8. Completing a Task never marks the Matter resolved.

## Timing

Reusable `matter_timing_policies` (calendar days now; business days/hours reserved). Defaults for testing only:

| Policy | Period |
|--------|--------|
| Question response | 3 calendar days |
| Responsibility response | 2 calendar days |
| Clarification response | 5 calendar days |
| Resolution confirmation | 3 calendar days |
| Task acceptance | 1 calendar day |
| Task execution | 5 calendar days |
| Task review | 2 calendar days |
| Decision confirmation | 2 calendar days |
| Final work response | 3 calendar days |

Timeout behaviors are catalogued. Phase 1 **runs** `remind` and `auto_close` (initiator confirmation). Phase 3 **also runs** configurable escalation steps (`matter_escalation_steps`) for overdue `respond` / `responsibility_response` actions, marks actors unresponsive, notifies Responsible Lead, and can require manual review. Other catalogued types remain for later policy wiring.

`list_matters` is read-only. Timeouts, reminders, and auto-close run only in `process_matter_action_timeouts`, serialized by a transaction advisory lock and `FOR UPDATE SKIP LOCKED`. Production invocation:

1. **pg_cron** job `matter_action_timeout_tick` at minute 15 of every hour, when the `pg_cron` extension is installed.
2. Otherwise (or to run immediately): `scripts/db/run-matter-timeout-tick.sh`, which executes the same function as `postgres` over the remote database SSH path.

Page and list reads may **display** overdue from `due_at` without mutating workflow state.

## Question workflow

Comments and other ordinary discussion never start the initiator confirmation timer. Only **Provide final answer** (`respond`) does. The initiator can mark **Answered / satisfied** from discussion, ask for more information after a final answer, or record that the Question revealed an Issue without converting Matter type.

## Suggest Improvements

The Contribute card stays. `/contribute/improvements` is a shortcut into Matter create (`type=Suggestion`, intended recipient = official Civizen org). Area is left unset unless a future mapping is safe.

## Public browse, Community addressee, region and city scope (Phase 2 step 2.1, 2026-10-09)

- `list_public_matters(p_search, p_area_node_id, p_scope_country_code, p_matter_type, p_limit)` returns `matter_row_json` bundles for public, non-draft Matters (newest first, max 100) to signed-in members; guests get `[]`. The Matters page lands on this list (`/contribute/matters`, `?view=` opens the member's own queues) with a search box and Area / country / type filters; cards show type · scope · Area.
- A Matter can be addressed to the **Civizen community** without naming a person: the form's "Address it to the Civizen community" button resolves the official organization profile (`resolve_civizen_org_profile`), the same actor the Suggest Improvements shortcut uses.
- Geographic scope offers Global · Country · Region · City; region and city come from the shared geo catalog (`listGeoRegions`, `listGeoCities`) and are stored as `scope_region_code` / `scope_locality_code`, which `create_matter` already validated.
- SQL test: `supabase/tests/public_matters_browse_test.sql`.

## Phase 1 surfaces

- Contribute lane **Questions, Issues & Ideas**
- Queues: Public Matters (landing view) · Needs Your Action · My Matters · Participating · Organization
- Matter create, detail (current action, description, conversation, formal actions, activity)
- Formal actions, comments with replies, optional evidence URL/file
- Reminders, overdue, auto-close, reopen
- **Phase 2 Work:** optional **Start collaborative work**; Work / Decisions sections; Tasks with acceptance, execution, review, dependencies, subtasks; Decision records; Task comments and completion evidence; Contribute queue includes Task and Decision actions

## Distinct objects (Phase 2)

Keep these separate: **Matter** · **Matter Responsibility** · **Task** (`collaboration_tasks`) · **Task Assignment** · **Decision** · **Evidence** (matter attachments).

`matter_action_requirements` remains the only action clock. Task and Decision actions use `context_kind` + `context_id` so several pending clocks can exist at once. Timeout still runs only in `process_matter_action_timeouts`. Task overdue reminds; it does not auto-close the Matter. Auto-close remains initiator `confirm_resolution` only.

Responsible Lead is explicit (`matter_responsibilities`). A Task assignee is not automatically responsible for the Matter. Organizations can hold responsibility or Task assignment through the existing actor model. AI actors are reserved and not activated.

When work is finished, Responsible Lead calls **Review completed work and provide final response**, which assigns the existing Phase 1 `address` / `mark_addressed` flow, then initiator confirmation. No second resolution system.

Ordinary completion is allowed only when every required Task is in a **terminal** state: **Completed** or **Cancelled**. These are unfinished and block ordinary completion: Proposed, Assigned, Awaiting Acceptance, Accepted, In Progress, Blocked, Waiting, Submitted, Under Review. **Declined is not silently terminal.** The Responsible Lead must reassign, cancel, replace, or waive that assignment before ordinary completion.

**Complete with outstanding work** is an explicit exceptional path. It requires a reason, identifies the outstanding Tasks, is attributed to the Responsible Lead, and writes `collaborative_work_completed_with_outstanding` (not `collaborative_work_completed`). Outstanding Task statuses are not changed to Completed. The Matter waiting condition and final-response copy must be able to say that some work remained outstanding.

Reopening keeps completed Tasks, Decisions, and evidence. New work is additive; old Tasks are not silently reset.

### Shared responsibility vs participation

Inviting a Contributor, Specialist, Contractor, Observer, or Evaluator is **participation**. It does not create an accepted Responsible Collaborator.

Asking someone to become a **Responsible Collaborator** is a **shared-responsibility request**: a timed Action Requirement (`shared_responsibility_response` / *Respond to shared responsibility request*) using the existing Matter action clock. Responses: Accept responsibility, Accept partially, Request clarification, Decline / dispute, Suggest another responsible actor. `matter_responsibilities` shows that actor as an accepted collaborator only after acceptance. Decline stays in Matter history (status `declined`, with reason). Suggested reassignment and Task decline reasons are stored on the assignment and in event payload `reason`.

### Decision authority (current default, not a future-universal rule)

When a Responsible Lead proposes a Decision on a Matter where that Lead currently has decision authority, the Decision may be accepted in the same step. That is the **current default** for these Matters. It is not an architectural assumption that every future Decision is unilaterally decidable by the Responsible Lead. Later rules may require multi-party approval, organizational approval, voting, governance rules, or external authority. No advanced approval engine is implemented in this phase.

## Phase 3 — Resolution, evaluation, escalation, outcome

Formal **Resolution** records (`matter_resolutions`) are append-only cycles linked to a Matter. Responsible party position and initiator position are stored separately; disagreement is valid and visible.

Flow after work or final response:

1. Responsible Lead **proposes Resolution** (`propose_matter_resolution`) — outstanding Tasks are surfaced automatically in `outstanding_items`.
2. Initiator receives timed **`review_resolution`** action (3-day `resolution_review` policy; auto-close is **not** confirmation).
3. Initiator may confirm, partially accept, reject, need clarification, or cannot verify (`perform_resolution_review`).
4. Rejected / partial cycles preserve history; Lead gets `resolution_followup` work action. Partial resolution may **continue this Matter** or **create follow-up Matter** (`FOLLOW_UP_TO` relationship).
5. Optional **evaluations** (`matter_evaluations`) — qualitative 5-level dimensions; no Score effect.
6. Optional **outcome follow-up** (`matter_outcome_followups`) — separate from Resolution; qualitative outcome states only.
7. **Escalation** via `matter_escalation_steps` + idempotent `matter_escalation_executions`. Each Action Requirement stores the authoritative `escalation_policy_id` (selected at assignment from `matter_escalation_policy_defaults` or an explicit override). `process_matter_action_timeouts` executes steps for the **bound** policy only — not by re-deriving from `action_type`.
8. **Stalled Matter diagnostic**: `matter_find_stalled()` — active Matter with no pending action and no waiting condition. Operational use: monitoring / manual review queue; does not auto-repair or invent responsibility in Phase 3.

### Canonical terminology (do not collapse layers)

| Layer | Field | Example values |
|-------|--------|----------------|
| Matter lifecycle | `lifecycle_status` | `draft`, `submitted`, `active`, `closed` |
| Matter closure | `close_kind` | `confirmed_resolution`, `partially_resolved`, `auto_no_initiator_response` |
| Resolution record | `resolution_status` | `proposed`, `confirmed`, `partially_accepted`, `rejected`, `auto_closed` |
| Resolution closure | `closure_kind` | `confirmed_resolution`, `auto_closed_no_response`, `partial_resolution_accepted` |
| Positions | `responsible_party_position`, `initiator_position` | separate text; not lifecycle status |
| Outcome follow-up | `result` | `improved`, `partly_improved`, `no_change`, `worsened`, `unable_to_determine` |

`auto_no_initiator_response` (Matter) and `auto_closed_no_response` (Resolution record) are **different layers** — auto-close must never read as confirmed resolution.

### Partial resolution

`confirm_partially_resolved` on **`review_resolution`** is the Phase 3 path. **Continue this Matter** keeps the Matter active and assigns `resolution_followup`. **Create follow-up Matter** closes with `partially_resolved` and links via `FOLLOW_UP_TO`. Legacy `confirm_resolution` + `confirm_partially_resolved` remains for Phase 1 history but no longer auto-closes; it assigns follow-up work instead.

### Legacy `confirm_resolution` boundary

New Resolution proposals use `propose_matter_resolution` → `review_resolution`. Initiator review actions route through `perform_resolution_review`. Legacy `confirm_resolution` timed actions may still exist on older Matters; `perform_matter_formal_action` delegates compatible review verbs to `perform_resolution_review` when the pending action is `review_resolution`.

### Factual timeliness (no dashboards in Phase 3)

Events already emitted for later analytics: `action_assigned`, `timer_started`, `reminder_sent`, `action_overdue`, `action_completed`, `responsibility_accepted`, `resolution_proposed`, `resolution_confirmed`, `resolution_rejected`, `resolution_partially_accepted`, `matter_closed`, `matter_reopened`, `escalation_step_executed`, `outcome_followup_scheduled`, `outcome_followup_completed`. Action Requirements store `created_at`, `due_at`, `reminder_at`, `completed_at`. No additional analytics endpoint is required for Phase 3.

Closure kinds include `confirmed_resolution`, `auto_no_initiator_response`, `partially_resolved`, `unable_to_resolve`, `referred`, `administrative_close`. Auto-close copy: *Closed automatically after no response from the initiator within the resolution-review period.*

Human Outcome Review (`/wellbeing-insights/outcome`) remains separate; `human_outcome_review_id` on outcome follow-ups is reserved for optional linkage — not forced on generic Matters.

## Phase 4A — Human–AI collaboration foundation

AI agents are **first-class Matter participants** (`ai_agent` actor kind) with stable `ai_agents` records — not fake person profiles. They use the same Matter → Participant → Task → Action Requirement → Submission → Review → Decision / Evidence → Resolution architecture as humans.

### AI actor model

- **`ai_agents`**: stable agent identity (slug, display name, role type, capability profile, provider/model references).
- **`matter_agent_assignments`**: explicit authorization — which agent, why, supervisor, scoped context/capabilities, instructions.
- **`ai_agent_runs`**: auditable executions; retries create new runs; failed runs are preserved.
- **`matter_agent_artifacts`**: AI-generated outputs with provenance (`generated_by_agent_id`, `generated_by_run_id`, source references, review state).

Initial roles: **Research**, **Analysis**, **Planning**, **Facilitation**, **Documentation**, and **Coding** (Phase 4B1).

### Supervision and permissions

Every active assignment requires a **human supervising actor**. AI cannot be Responsible Lead, formal Responsible Collaborator, or final institutional authority. Server-side capability checks (`matter_ai_agent_has_capability`, blocked mutations during agent runs) enforce:

- allowed: read scoped Matter context, comment when permitted, submit Task work, propose Tasks/Decisions (human promotes), add marked AI evidence.
- forbidden: accept responsibility, assign humans, accept Decisions for accountable actors, close Matters, confirm Resolution, submit human-style evaluations, alter permissions/escalation/Score.

Matter content is **untrusted data** (prompt-injection safe); tool/action authority is enforced outside the model.

### UX

- Matter **Participants** list distinguishes Human · Organization · **AI Agent**.
- **Add AI assistance** flow on active Matters: role, instructions, context scope, supervisor, confirm.
- **AI assistance** section shows assignments, artifacts, review states (queued, working, awaiting review, changes requested, failed, completed).
- **Planning → Task adoption**: proposed Tasks from `proposed_plan` artifacts are selectable; authorized Leads edit title/description/dependencies and create ordinary `collaboration_tasks` via `adopt_matter_agent_plan_task` (provenance: `ai_plan_task_adopted`).
- **Facilitation → Decision promotion**: suggested Decisions from facilitation artifacts are reviewable; authorized humans promote via `promote_agent_decision_suggestion` into formal Phase 2 Decisions (provenance preserved).
- AI outputs remain **provisional** until human review (`AI-generated`, `Proposed`, `Awaiting human review` badges).

### Events

`ai_agent_assigned`, `ai_task_accepted`, `ai_run_queued`, `ai_work_submitted`, `ai_comment_added`, `ai_plan_proposed`, `ai_plan_task_adopted`, `ai_decision_promoted`, `ai_changes_requested`, `ai_work_accepted`, `ai_run_failed`, `ai_assignment_cancelled`, …

### Execution and authorization (stabilization)

- Edge function: `supabase/functions/matter-agent-execute` — user-triggered model **A**: caller JWT → `authorize_matter_agent_run` → service-role completion.
- Deployment: **self-hosted** Supabase on `soc.yeremyan.net` (`https://supabase.yeremyan.net`). Copy `index.ts` into `/home/ubuntu/supabase-stack/supabase/docker/volumes/functions/matter-agent-execute/`, then `docker compose restart functions`. Do **not** use Supabase Cloud `functions deploy` / project refs for this environment.
- Gemini keys come from the self-hosted Docker `.env` into the Edge Functions container (`GEMINI_API_KEY`, `GEMINI_MODEL`). Without the key, deterministic fallback output is labeled `execution_mode: deterministic_fallback` in run `usage_metadata` — never indistinguishable from provider output.
- **Analysis** and **Documentation** agents: registered framework capability only in Phase 4A (no dedicated E2E adoption flow).

## Phase 4B1 — Controlled Coding Agent execution

Coding Agent is a Phase 4A `ai_agents` role (`coding`), not a parallel identity. It may inspect/edit authorized files and run allowlisted development commands inside an isolated git worktree. It still cannot accept Matter responsibility, accept Decisions, close Matters, confirm Resolution, commit, push, merge, deploy, apply remote migrations, or restart Edge Runtime.

### Execution boundary

- **Where it runs:** the Civizen development workstation (`CIVIZEN_CODING_REPO_ROOT` or the local checkout). The runner maps allowlisted slug `maturehumanity/civizen` to that checkout.
- **Where it must not run:** production app host, self-hosted Supabase / Edge Runtime on `soc.yeremyan.net`. `matter-agent-execute` rejects `role_type = coding`.
- **Workspace:** `git worktree add --detach` from an explicit base SHA under `/tmp/civizen-coding-workspaces`. Unrelated dirty files in the primary tree are not copied. Agent edits stay in the worktree.
- **Authorization:** `assign_matter_coding_agent` with repository slug + allowed paths. Clients cannot supply `workspace_path` / `host_path` / `repo_root`.
- **Plan checkpoint:** runner stage `plan` hosts a model-driven inspect/plan loop and writes `implementation_plan`; a human **Approve and run** re-queues the same run; stage `execute` hosts a live model tool loop that mutates only authorized paths through the trusted runner, captures diff/tests, and submits a `code_change` artifact.
- **Human review:** existing Phase 2 `review_task` (accept / request changes / reject). Acceptance means Task completion — not git commit/push/deploy. `request_changes` queues a new run on the same assignment; the Coding Agent keeps the original path/command authorization unless a human expands it.
- **Trusted runner:** `npx tsx scripts/matter-coding-agent-execute.ts --run-id <uuid> --stage plan|execute`
- **Model loop:** Gemini (or a fake adapter in tests) proposes `list_files` / `read_file` / `write_file` / `run_command` / `request_scope_expansion` / `finish`. The deterministic policy/runner executes or denies each call. The model never receives unrestricted host/shell access.
- **Provenance:** Phase 4B1 SQL migration `20260903010000_matter_coding_agent_phase4b1.sql` was already applied remotely by the operator. Future remote migrations remain prohibited to the Coding Agent. Do not apply it again.

### Policy

Path denials always include `.env`, keys, and `.ssh`. Command allowlist is structured (`git` read-only, `npm test`, `npx tsc --noEmit`, selected `verify:*`). Denied: `git push` / commit / reset / clean, `sudo`, `docker`, `env`/`printenv`, deploy gates, shell metacharacters. Repository file text cannot grant authority. Model output cannot grant authority.

### UX

**Add AI assistance → Code** asks for repository, allowed paths, supervisor, and requested work. Artifacts show implementation plan, diff, test PASS/FAIL/NOT RUN, scope-expansion requests, and command denials. Provenance remains **Coding Agent · AI**.

### Gates

`verify:matters-coding-detail` (14+ states @ 390px + 1280px), plus existing Phase 1–4A Matter gates. Policy/isolation unit tests live in `src/lib/matters-coding-policy.test.ts`. Model-loop tests: `src/lib/matters-coding-agent-loop.test.ts`, `src/lib/matters-coding-agent-security.test.ts`.

## Deferred

Autonomous AI routing without human approval, autonomous Git commit/push or GitHub PR creation, production deployment, remote Supabase migration apply, Edge Runtime restart, external SaaS writes, financial/legal commitments, organizational AI-policy console, Projects as a separate collaboration layer, Community Challenge / Governance conversion, department trees and auto-assignment, Score/reputation/capability consequences, analytics dashboards, Gantt/Kanban, advanced evidence certification.

## Implementation map

- Domain: `src/lib/matters.ts`, `src/lib/matters-workflow.ts`, `src/lib/matters-work.ts`, `src/lib/matters-work-workflow.ts`, `src/lib/matters-resolution.ts`, `src/lib/matters-resolution-workflow.ts`, `src/lib/matters-ai.ts`, `src/lib/matters-coding-policy.ts`, `src/lib/matters-coding-runner.ts`, `src/lib/matters-coding-model.ts`, `src/lib/matters-coding-gemini.ts`, `src/lib/matters-coding-agent-loop.ts`
- API: `src/lib/matters-api.ts`
- UI: `src/pages/contribute/Matters.tsx`, `MatterForm.tsx`, `MatterDetail.tsx`, `MatterWorkPanel.tsx`, `MatterResolutionPanel.tsx`, `MatterAgentPanel.tsx`, `MatterAgentArtifactCard.tsx`
- Schema: `supabase/migrations/20260831010000_matter_collaboration_system.sql`, `20260831200000_matter_collaboration_stabilization.sql`, `20260901120000_matter_collaborative_work.sql`, `20260901140000_matter_collaborative_work_stabilization.sql`, `20260901160000_matter_resolution_phase3.sql`, `20260901170000_matter_resolution_phase3_stabilization.sql`, `20260902160000_matter_ai_collaboration_phase4a.sql`, `20260902160100_matter_ai_collaboration_phase4a_stabilization.sql`, `20260902160200_matter_ai_agent_run_service_fix.sql`, `20260902170000_matter_ai_phase4a_stabilization.sql`, `20260903010000_matter_coding_agent_phase4b1.sql`
- Edge: `supabase/functions/matter-agent-execute` (rejects Coding Agent)
- Runner: `scripts/matter-coding-agent-execute.ts` (development worktree only; model loop + trusted runner)
- Gates: `verify:matters-resolution-detail` (Phase 3 — 13 states @ 390px + 1280px), `verify:matter-agent-auth` (RPC/edge authorization negatives), `verify:matter-agent-activation` (provider-backed deployed E2E), `verify:matters-ai-detail` (Phase 4A — 18 states @ 390px + 1280px), `verify:matters-coding-detail` (Phase 4B1 — 14 states @ 390px + 1280px)

## Security: `search_path` and schema CREATE (2026-09-01)

Matter `SECURITY DEFINER` functions use `SET search_path = public`. That is safe on the deployed database because untrusted roles cannot create objects that would shadow unqualified names those functions resolve.

Live check (read-only) on schema `public`:

| Role | CREATE | USAGE |
|------|--------|-------|
| `anon` | no | yes |
| `authenticated` | no | yes |
| `authenticator` | no | yes |
| `service_role` | no | yes |
| `PUBLIC` (default ACL `=U/`) | no | yes |

`CREATE` remains with privileged owners only (`postgres`, `supabase_admin`, `pg_database_owner`). No Matter function change was required. Repeat with `scripts/db/verify-public-schema-create.sql`.
