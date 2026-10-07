# Civizen documentation

Documentation is organized by **purpose and subject**, not by moderation lane or development stage.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `draft` | Work in progress; not adopted |
| `under-review` | Submitted for review |
| `accepted` | Formally accepted; may not yet be operational |
| `current` | Active / controlling for its domain |
| `superseded` | Replaced by a newer document; kept for history |
| `historical` | Completed implementation or phase record |
| `unknown` | Status not established from repository evidence |

Working institutional and platform documents also use **display** labels that map onto this vocabulary without requiring a mass retag:

| Display label | Typical YAML `status` | Meaning |
| --- | --- | --- |
| **Working** | `draft` | Authoritative project design direction; not adopted public policy |
| **Proposed** | `draft` | Named structure or rule not yet formed or adopted |
| **Adopted** | `current` / `accepted` | Controlling public or operational instrument |
| **Experimental** | `draft` | Trial design; not controlling |
| **Current** | `current` | In-force for that domain until a successor is adopted |
| **Historical** / **Superseded** | `historical` / `superseded` | Kept for continuity |

Do not treat `canonical: true` as “permanently immutable.” Canonical means the single editable source for the topic **as it currently stands**.

Substantive documents may include YAML front matter (`title`, `status`, `version`, `owners`, `last_reviewed`, `canonical`). Fields are omitted or set to `unknown` when evidence is missing. Do not invent owners or approval dates.

**Canonical** (`canonical: true`) means this is the single editable source for that topic. Prefer linking to canonical paths; do not maintain a second editable copy.

## Reading paths

| If you want to… | Start here |
| --- | --- |
| Understand why Civizen exists | [`00-foundation/why-civizen-exists-page-brief.md`](./00-foundation/why-civizen-exists-page-brief.md) · [`00-foundation/the-civizen-charter.md`](./00-foundation/the-civizen-charter.md) |
| Read the Philosophy of Mature Humanity | [`00-foundation/philosophy-of-mature-humanity.md`](./00-foundation/philosophy-of-mature-humanity.md) |
| Read the Institutional Blueprint (working architecture) | [`institutional/institutional-blueprint.md`](./institutional/institutional-blueprint.md) |
| Read the Governance Framework (how authority is exercised) | [`institutional/governance-framework.md`](./institutional/governance-framework.md) |
| Read the Stakeholder & Partnership Framework (who Civizen engages) | [`institutional/stakeholder-partnership-framework.md`](./institutional/stakeholder-partnership-framework.md) |
| Read the Pilot Framework (what Civizen tests with participants) | [`institutional/pilot-framework.md`](./institutional/pilot-framework.md) |
| Read the Founder Transition & Succession Framework | [`institutional/founder-transition-succession-framework.md`](./institutional/founder-transition-succession-framework.md) |
| Read the Contributor Framework (Contribution Record design) | [`institutional/contributor-framework.md`](./institutional/contributor-framework.md) |
| Read the Areas, Domains & Participation Framework | [`institutional/areas-domains-participation-framework.md`](./institutional/areas-domains-participation-framework.md) |
| Understand Civizen governance | [`01-governance/README.md`](./01-governance/README.md) · working Framework: [`institutional/governance-framework.md`](./institutional/governance-framework.md) |
| Review current policies | [`02-policies/README.md`](./02-policies/README.md) · especially [`02-policies/institutional/`](./02-policies/institutional/) |
| Understand the platform architecture | [`03-platform/README.md`](./03-platform/README.md) · product IA: [`03-platform/product-design/information-architecture-and-content-standards.md`](./03-platform/product-design/information-architecture-and-content-standards.md) · model evolution: [`03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md`](./03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md) · V1 registry: [`03-platform/model-evolution/shared-classification-registry-v1.md`](./03-platform/model-evolution/shared-classification-registry-v1.md) · public Areas & Initiatives: [`03-platform/areas-and-initiatives/public-areas-initiatives-v1.md`](./03-platform/areas-and-initiatives/public-areas-initiatives-v1.md) · Happiness & Fulfillment: [`03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md`](./03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md) |
| Plan or continue product work (whole-app inventory, gaps per user type, ordered step list, status tracker) | [`03-platform/product-design/product-inventory-and-implementation-plan-2026-10-07.md`](./03-platform/product-design/product-inventory-and-implementation-plan-2026-10-07.md) |
| Browse funding & budget planning index | [`04-operations/funding-and-budget/README.md`](./04-operations/funding-and-budget/README.md) |
| Review research and background | [`05-research/README.md`](./05-research/README.md) |
| Propose or review a change | [`proposals/README.md`](./proposals/README.md) |
| Browse historical implementation records | [`archive/README.md`](./archive/README.md) |
| Develop or release the app | [`04-operations/dev/AGENTS.md`](./04-operations/dev/AGENTS.md) · Contribute hub: [`04-operations/dev/contribute-page.md`](./04-operations/dev/contribute-page.md) · Matter collaboration: [`04-operations/dev/matter-collaboration.md`](./04-operations/dev/matter-collaboration.md) · Phase 1 pilots: [`04-operations/dev/phase-1-pilot-operating-model.md`](./04-operations/dev/phase-1-pilot-operating-model.md) · Agreements: [`04-operations/dev/agreements.md`](./04-operations/dev/agreements.md) · Public Market Jobs: [`04-operations/dev/market-jobs-public.md`](./04-operations/dev/market-jobs-public.md) · Home post formatting: [`04-operations/dev/home-post-formatting.md`](./04-operations/dev/home-post-formatting.md) · Home Repost editorial: [`04-operations/dev/home-repost-editorial.md`](./04-operations/dev/home-repost-editorial.md) · Historical development reconstruction: [`04-operations/dev/historical-development-reconstruction.md`](./04-operations/dev/historical-development-reconstruction.md) |
| Maintain Civi (built-in assistant) knowledge | [`assistant/README.md`](./assistant/README.md) · identity: [`assistant/civizen-identity.md`](./assistant/civizen-identity.md) · cheat sheet: [`assistant/civizen-assistant-cheatsheet.md`](./assistant/civizen-assistant-cheatsheet.md) · `npm run assistant:knowledge` |

## Top-level map

```text
docs/
├── 00-foundation/     Living philosophy, charter, pathway, purpose briefs
├── 01-governance/     Institutional models, roles, participation, funding models
├── 02-policies/       Adopted / operational public and platform policies
├── 03-platform/       Software architecture, decentralization, scoring
├── 04-operations/     Development, release, contributor processes
├── 05-research/       Academic, professional, and study materials
├── institutional/     Institutional Architecture — Blueprint · Governance · Stakeholder · Pilot · Founder Transition · Contributor · Areas/Domains (project reference)
├── proposals/         Draft and in-flight proposals
└── archive/           Superseded docs and implementation history
```

## Proposing documentation changes

1. Open a draft under [`proposals/drafts/`](./proposals/drafts/) (or edit an existing draft).
2. When ready for review, move or label it `under-review`.
3. After acceptance, place the canonical copy in the appropriate numbered section and leave a link from related indexes—do not maintain two editable copies.
4. Superseded material moves to [`archive/superseded/`](./archive/superseded/) with a short header pointing to the replacement.

Migration inventory: [`archive/implementation-history/docs-ia-migration-inventory-2026-08-10.md`](./archive/implementation-history/docs-ia-migration-inventory-2026-08-10.md).

Legacy moderation-lane paths and top-level redirect stubs were removed after confirming no published URL or application import depended on them. History remains in git and in the migration inventory.
