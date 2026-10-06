# Contribute Page

**Project:** Civizen  
**Route:** `/contribute`  
**Version:** 2.6  
**Status:** Phase 1 hub live. Three pilots: Education-to-Contribution, Community Challenges, Learning Commons. Operating model: [`phase-1-pilot-operating-model.md`](./phase-1-pilot-operating-model.md)

Canonical product/UX note for agents. Source draft: `docs/tmp/contribute_page`.

## Objective

`/contribute` is the primary hub where individuals and organizations contribute to Civizen and the Mature Humanity mission. It answers:

> **"How would you like to contribute today?"**

A future **Areas & Initiatives** surface answers a different question — **where** Civizen needs help — and should connect here rather than replace this hub. Spec: [`docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md`](../../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md). Public UX follows **Simple by default. Detailed by choice.** ([IA standards](../../03-platform/product-design/information-architecture-and-content-standards.md) §2). Minimal public `/areas` V1 is implemented (read-only). Do not redesign `/contribute` from the Areas spec.

It is a gateway — not a duplicate of Profile, Messaging, Score, or endorsement flows. Endorsement stays on Search people results and user profiles.

## Phase 1 layout

### Ways to Contribute

| Lane | Destination |
|------|-------------|
| Volunteer | `/fund/contribute` |
| Professional Skills / Opportunities | `/contribute/professional` (Education-to-Contribution) |
| Financial Support | `/fund` (inquiry hub only) |
| Organization Partnership | `/partners` |

Organization Partnership currently opens the public **International Partnerships and Chapters** notice. The working institutional parent for partnerships is [`docs/institutional/stakeholder-partnership-framework.md`](../../institutional/stakeholder-partnership-framework.md). Concrete programs and experiments sit under the [`Pilot Framework`](../../institutional/pilot-framework.md). Contribution Record *design* is the [`Contributor Framework`](../../institutional/contributor-framework.md); public `/contribute/policy` remains adopted contributor policy. Shared Area/Domain taxonomy is the [`Areas, Domains & Participation Framework`](../../institutional/areas-domains-participation-framework.md). A future public **Areas & Initiatives** experience is specified in [`public-areas-initiatives-v1.md`](../../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md) (minimal `/areas` V1 is read-only; not `/documents`). How those models may later evolve: [`Shared Classification & Model Evolution Architecture`](../../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md). A future **Areas & Pilots Catalog** is recorded under the Pilot Framework (Pilot Portfolio §40) and is not built yet. Do not treat `/partners` as a partner CRM, Stakeholder Map, or Pilot Portfolio.

### Community

| Lane | Destination |
|------|-------------|
| Community Challenges | `/contribute/challenges` |
| Questions, Issues & Ideas | `/contribute/matters` |

Implementation **Projects** live inside Challenges. There is no separate community-projects or tasks board. `/contribute/projects` redirects here. `/contribute/tasks` redirects to Opportunities. When a Challenge is linked from a wellbeing pattern, coordinators may open a **Human Outcome Review** after implementation. Operational delivery and later privacy-safe human-outcome evidence stay separate; causality is not inferred.

### Knowledge

| Lane | Destination |
|------|-------------|
| Learning Commons | `/contribute/knowledge` |
| Suggest Improvements | `/contribute/improvements` → Matter create as a Suggestion to Civizen |

### Your Impact

| Lane | Destination |
|------|-------------|
| My Contributions | `/contribute/impact` (participations across opportunity kinds) + Profile/Score |

Financial copy remains inquiry-only (no checkout, tax-deductibility, or fixed returns).

## Implementation map

- Hub: `src/pages/Contribute.tsx`
- Lane registry: `src/lib/contribute-lanes.ts`
- Slice 1 Education-to-Contribution: `src/pages/contribute/ProfessionalOpportunities.tsx`, `OpportunityDetail.tsx`, `OpportunityForm.tsx`
- Slice 3 Community Challenges: `src/pages/contribute/CommunityChallenges.tsx`, `ChallengeDetail.tsx`, `ChallengeForm.tsx`
- Slice 4 Learning Commons: `src/pages/contribute/KnowledgeSpaces.tsx`, `KnowledgeSpaceDetail.tsx`, `KnowledgeSpaceForm.tsx`, `KnowledgeResourceDetail.tsx`, `KnowledgeResourceForm.tsx`
- Matter Collaboration (Questions, Issues & Ideas): `src/pages/contribute/Matters.tsx`, `MatterForm.tsx`, `MatterDetail.tsx`, `MatterWorkPanel.tsx` · spec: [`matter-collaboration.md`](./matter-collaboration.md)
- My Contributions: `src/pages/contribute/ContributeImpact.tsx`
- Domain + RPC wrappers: `src/lib/opportunities.ts`, `src/lib/opportunities-api.ts`, `src/lib/challenges.ts`, `src/lib/challenges-api.ts`, `src/lib/knowledge.ts`, `src/lib/knowledge-api.ts`, `src/lib/matters.ts`, `src/lib/matters-api.ts`, `src/lib/matters-workflow.ts`, `src/lib/matters-work.ts`
- Schema: `supabase/migrations/20260813010000_education_to_contribution_opportunities.sql`, `20260813020000_opportunity_applicant_identities.sql`, `20260813030000_opportunity_work_assessments.sql`, `20260813040000_community_problem_solving_lab.sql`, `20260813041000_seed_community_problem_solving_lab.sql`, `20260813042000_solution_record_contributors.sql`, `20260813050000_shared_knowledge_learning_commons.sql`, `20260813051000_seed_shared_knowledge_learning_commons.sql`, `20260813052000_seed_education_to_contribution_program.sql`, `20260831010000_matter_collaboration_system.sql`, `20260831200000_matter_collaboration_stabilization.sql`
- Copy: `contribute.*` in `src/lib/i18n.base.ts`

## Slice 1 (Education-to-Contribution)

Live at `/contribute/professional`. Flow: discover open opportunity → essential details → apply → organizer accept/decline → participant works → submit evidence (description + URL/reference) → evaluator reviews → completed + verified → derived `profile_contribution_events` row (`source_table = opportunity_participations`). Publisher is a `profiles` row (personal or business via `linked_accounts`). No organizations table, payments, file upload, LMS, or Pilot Portfolio.

Progressive disclosure: cards show title, short purpose, a few skills, effort/location, and status or next action. Requirements, criteria, evidence detail, and administration stay behind detail views.

Verified work may appear as skill evidence and demonstrated experience. It does not overwrite declared skills, education, credentials, or employment history.

Development-story journal rows (including Cursor/chat and git backfill) are provenance. They are not independent contribution roots. Historical coherent outcomes are reconstructed by `reconstructHistoricalDevelopmentOutcomes` (`docs/04-operations/dev/historical-development-reconstruction.md`) and then verified through `evaluateDevelopmentContributionEvidence`. Live capture of a completed work unit is `recordDevelopmentOutcome` (`src/lib/civizen-development-capture.ts`): stable `outcomeRootId`, real features, commit/PR, `testsPassed`, roles. The collector reevaluates and Score V2 recomputes on read. See the Score page spec.

Organizer review shows each applicant’s existing profile identity (`full_name`, `username`, avatar, link to `/user/:profileId`) through RPC `list_opportunity_applicant_identities`. Identity is not copied onto participation rows, and `profiles` RLS is unchanged.

**Authorization verification:** Automated RLS tests against a local Supabase database are in `src/lib/opportunities-auth.integration.test.ts`. They stay skipped unless `CIVIZEN_OPPORTUNITY_AUTH_TEST=1` and loopback `CIVIZEN_LOCAL_SUPABASE_*` credentials are set. This environment has no Civizen local Supabase (app URL is remote; another project occupies local 54321). Manual SQL for the same cases: `scripts/db/local-dev-only/verify-education-to-contribution-auth.sql` (transaction + `ROLLBACK`; not for the remote application database).

## Slice 2 (Contribution Evaluation)

Optional quality layer after verification. Verification still confirms the work happened and who did it (`evaluate_opportunity_work`). Evaluation records how well it was done (`record_opportunity_work_assessment`) and is not required to complete a contribution.

The coordinator chooses which dimensions apply on the opportunity (Completion, Quality, Reliability / Timeliness, Collaboration, Outcome, Impact) without a nested configuration UI. Empty selection means the opportunity does not use evaluation. Participants see a summary first; dimension scores and notes stay behind More details.

`opportunity_participations` remains the authoritative record. Score/Performance events stay a derived projection. Only Quality, Impact, and Collaboration may update contribution-event estimates used by Performance. Completion, Reliability / Timeliness, and Outcome are stored and shown, not auto-fed into the overall score. Peer ratings (`profile_performance_ratings`) are unchanged.

Slice 1 `opportunity_evaluations.quality_score` / `impact_score` remain deprecated compatibility columns. Do not remove them. Do not use them for new evaluations.

## Slice 3 (Community Problem-Solving Lab)

Live at `/contribute/challenges`. Distinct from Governance Solutions (`solution_problems` / `solution_proposals`). Flow: Challenge → Proposal → Selection (coordinator, no public voting) → Implementation Project → Contribution Opportunities → Implementation → Outcome → Solution Record.

Challenges belong to a `contribution_programs` row (kind `community_problem_solving`), not a separate pilot container. Implementation work reuses Slice 1/2: Opportunity → Participation → Evidence → Verification → optional Evaluation → Completed Contribution. Community implementation opportunities use `opportunity_kind = community_implementation` and do not appear on the professional lane.

Participant-facing stages: Draft → Active → Proposal review → Implementation → Completed. Completing requires a selected proposal, an implementation project, and a recorded outcome — selection alone is not completion. Completing creates a `solution_records` row. A coordinator can share that record into a Knowledge Space (`publish_solution_record_as_resource`), which creates a Knowledge Resource and preserves Challenge/Project provenance. Do not merge this lane with Governance Solutions.

Cards stay concise: title, one-line problem, stage, primary action. Evidence, constraints, proposal administration, and success criteria stay off the default card.

## Slice 4 (Shared Knowledge / Learning Commons)

Live at `/contribute/knowledge`. Distinct from Study, `content_items`, and Governance Solutions. Principle: **Simple by default. Detailed by choice.** Loop: Knowledge Space → Resource → Knowledge Gap → Opportunity or Challenge → Result → improved/shared knowledge.

A Knowledge Space is a structured shared collection (title, purpose, optional Area, coordinator, linked `contribution_programs` row, status). Resources live inside a space (type, summary, internal content and/or URL, person and/or organization attribution, light Draft / Shared / Reviewed status). Optional `pathway_order` is only an ordered sequence of existing resources — not an LMS.

Knowledge Gaps name what is missing, weak, outdated, unresolved, contradictory, or still needs practical development. Coordinators convert an actionable gap into a Contribution Opportunity (`opportunity_kind = knowledge_gap`) or a Community Challenge. Those reuse Slice 1–3 work engines. A coordinator can later mark the gap resolved or partly resolved and link the resulting Resource or Solution Record.

Ordinary users browse spaces and resources, see attribution, see open gaps, and contribute through the linked Opportunity or Challenge. Coordinators create/manage spaces, resources, gaps, conversions, result links, and light validation. No new top-level navigation. No peer-review journal, credentialing, contributor-share accounting, or automated synthesis.

## Roadmap

- **Phase 1 (current):** Hub structure; cards → existing surfaces or placeholders
- **Slice 1 (current):** Education-to-Contribution at `/contribute/professional`
- **Slice 2 (current):** Optional contribution evaluation after verification
- **Slice 3 (current):** Community Problem-Solving Lab at `/contribute/challenges`
- **Slice 4 (current):** Shared Knowledge / Learning Commons at `/contribute/knowledge`
- **Matter Collaboration (current):** Questions, Issues & Ideas at `/contribute/matters` — generic Matter foundation plus optional collaborative work (Tasks, Decisions). Completing a Task does not resolve the Matter. Spec: [`matter-collaboration.md`](./matter-collaboration.md)
- **Later slices:** additional suggestion routing and Area mapping — Suggest Improvements already opens Matter create
- **Phase 3:** Funding portal, org dashboard, grants, scholarships, global initiatives
- **Phase 4:** Deep Trust Profile / Contribution Score / achievements / governance integration

## Guiding principle

Contribute is the engine of participation: connect people, organizations, and institutions with meaningful opportunities. Every contribution of time, expertise, funding, knowledge, or leadership should be discoverable from this hub.
