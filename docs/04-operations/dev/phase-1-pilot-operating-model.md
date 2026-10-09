# Phase 1 Pilot Operating Model

**Project:** Civizen  
**Status:** Implemented operating note  
**Version:** 1.0  
**Related:** [`contribute-page.md`](./contribute-page.md) · [`pilot-framework.md`](../../institutional/pilot-framework.md)

This is the concise developer/operator description of what Phase 1 actually runs. It is not a strategy document.

Principle: **Simple by default. Detailed by choice.**

## Three pilot models

| Model | Hub lane | Program kind | What a person does |
|------|----------|--------------|--------------------|
| Education-to-Contribution | `/contribute/professional` | `education_to_contribution` | Join a short Opportunity, submit evidence, get it verified, optionally evaluated |
| Community Problem-Solving | `/contribute/challenges` | `community_problem_solving` | Name a local problem, propose, implement through a Project, record an outcome, keep a Solution Record |
| Shared Knowledge / Learning Commons | `/contribute/knowledge` | `shared_knowledge` | Collect practical Resources, name Knowledge Gaps, turn gaps into work, return results as reusable knowledge |

Study, Governance Solutions, Market Jobs, Score, and Questions, Issues & Ideas (Matter collaboration) remain separate systems.

## Shared Program architecture

A **Program** (`contribution_programs`) is the container. Challenges, Knowledge Spaces, and (where relevant) Opportunities belong to a Program. There is no second pilot container.

Publisher is a `profiles` row. Business/organization coordination uses `linked_accounts` (a member may link more than one business account). There is no organizations table in this phase.

## Opportunities and Contributions

An **Opportunity** is the work primitive. Kinds:

- `education_to_contribution` — professional lane
- `community_implementation` — work inside a Challenge Project
- `knowledge_gap` — work opened from a Knowledge Gap

**Contribution** means a participation in an Opportunity (`opportunity_participations`). That row is authoritative. Score events are derived (`profile_contribution_events`, `source_table = opportunity_participations`).

There is no separate Tasks system. `/contribute/tasks` redirects to Opportunities. Challenge **Projects** are implementation records inside Challenges, not a second community-projects board. `/contribute/projects` redirects to Challenges.

Demo Programs (seeded, founder-published, ordinary members can join): Education-to-Contribution, Community Problem-Solving Lab, Shared Knowledge Challenge.

## Verification versus evaluation

- **Verification** (`evaluate_opportunity_work`) confirms the work happened and who did it. Required to complete.
- **Evaluation** (`record_opportunity_work_assessment`) is optional after verified completion. It does not block completion.
- Only Quality, Impact, and Collaboration may update derived Performance estimates.
- Slice 1 `opportunity_evaluations.quality_score` / `impact_score` are compatibility fields only.

## Community Challenges

Flow: Challenge → Proposal → coordinator selection → Project → Opportunities → Contributions → Outcome → Completion → Solution Record. When the Challenge came from a wellbeing pattern, a Human Outcome Review may later compare privacy-safe baseline and follow-up evidence. That review is not a Happiness impact score and does not change contributor reputation.

Selecting a proposal is not completion. Completing requires a selected proposal, a Project, and a recorded outcome. Distinct from Governance Solutions (`solution_problems`).

## Projects and Solution Records

A **Project** carries out the selected proposal. A **Solution Record** is the reusable outcome of a completed Challenge. It can be shared into a Knowledge Space as a Resource without copying the body.

## Learning Commons

A **Knowledge Space** is a structured collection, not a social group. **Resources** are the useful items (guide, research, learning material, case study, framework, dataset, tool, solution record, other). Status is Draft / Shared / Reviewed. Optional `pathway_order` is only a suggested sequence — not an LMS.

## Knowledge Gaps

A **Gap** names something missing, weak, outdated, unresolved, contradictory, or still needing practical development. Coordinators convert it into an existing Opportunity or Challenge. Resolving a gap requires linking a resulting Resource or Solution Record.

## How the systems connect

```text
Knowledge Space → Resource → Knowledge Gap
        → Opportunity or Challenge
        → Contribution / Project / Outcome
        → Resource or Solution Record
        → Gap updated
```

That is also the Civizen cycle: Knowledge → Learning/Capability → Contribution → Problem-solving → Outcome → Reusable Knowledge.

My Contributions: `/contribute/impact` (participations) and Profile/Score (derived evidence).

## Intentional Phase 1 limitations

- No LMS, quizzes, credentials, or peer-review journal (Study's former Courses / Tests / Schedules placeholders were removed on 2026-10-09, decision D4)
- No contributor-share / IP accounting
- No automated knowledge synthesis
- No separate task board or community-projects board
- Suggest Improvements opens Matter create as a Suggestion to Civizen (not a separate backend)
- Financial contribution remains inquiry-only
- Local RLS harness for opportunities stays skipped without loopback Supabase credentials
