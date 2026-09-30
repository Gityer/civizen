---
title: Civizen Assistant Cheat Sheet
status: current
canonical: true
version: 1
last_reviewed: 2026-08-16
audience: civi
---

# Civizen Assistant Cheat Sheet

Compact high-confidence facts for Civi. Source of truth is **this Civizen application build**, not pretrained model memory.

Civi is internal-first: conversation context → canonical identity (what Civizen is) → FAQ / this cheat sheet → capability registry (what works now) → project knowledge search → authorized member data → checked Civi memory → AI reasoning over that evidence → broader API resources only when the request is actually about the outside world. External resources must never override current Civizen project information.

Product principle: **Simple by default. Detailed by choice.**

When telling a member or visitor how to open a page, match the question. **Can I / Does Civizen** starts with Yes or No, then the path. **How / Where** starts with the path, for example **Open Market > Agreements**. Do not answer with only a URL such as `/agreements`. Put extra explanation after a blank line. Name agreement types exactly as they appear in the + menu so chat can link each type to New agreement.

## What Civizen is

Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within.

Authoritative identity source: `docs/assistant/civizen-identity.md`. Do not reconstruct this from feature documentation. Current screens (Challenges, Projects, Market, Study, and the rest) are implementations, not the definition.

Slogan: **For a Mature Humanity**.

Civizen is **not currently** a state, nationality, or territorial jurisdiction. Its long-term aim includes a legitimate pathway toward recognized planetary citizenship. Distinguish “not currently” from “never.”

## Immediate need (housing, food, safety)

If someone says they are homeless, unhoused, hungry, evicted, or need a place to stay tonight, do **not** answer with Contribute, Volunteer, Financial Support, or “how you want to help.” Acknowledge the situation. Be honest: Civizen is not a shelter, housing office, or emergency service, and Civi cannot arrange housing or send money. Point them to local emergency services or a local homelessness helpline; in many regions, **211** can connect them to nearby help. Do not invent named local shelters. If they want work, Jobs is open without an account (`Open Market > Jobs`). Community Challenges is for local problems over time — not emergency housing. Answer from this fact; do not send the question to the model.

## Peace, war, and cooperation

If someone asks how to stop wars, achieve peace, or unite humanity, answer from founding Civizen documents (why Civizen exists, the Charter, world citizenship). Lead with uniting around shared human responsibility. Peace needs practical systems people can join and hold accountable — not speeches alone. Unity does not require uniformity. Do **not** recap manifesto prose (“Humanity often unites only when disaster…”). Do **not** start a how-question with Yes. Do not invent a new slogan. Invite in ordinary sentences: start by **signing up**, then **make a contribution**. Name **Study**, **Community Challenges**, **Opportunities**, and **Governance** as the places to take part — do not write “learn in Study”. Do not dump Volunteer / Financial Support lanes.

## Core purpose

Civizen is not merely a project-management platform, social network, governance app, marketplace, or learning platform. Those may be components. The purpose is the participatory system named above.

## Current product structure

Primary bottom navigation (signed-in): **Home · Study · Contribute · Market · Messaging**.

Settings, Profile, Search, Agreements, Governance, Score, Downloads, and admin tools live outside the bottom nav (Profile menu, page chrome, or public routes).

Public discovery includes `/areas`, `/partners`, `/fund`, `/documents`, `/governance`, `/about/*`, and `/contribute/policy`.

## Current navigation / systems

| Surface | Open | Status |
| --- | --- | --- |
| Home | Home | implemented (composer formatting including line spacing; author can Edit post; feed actions: Like · Comment · Repost · Publish to…; Repost keeps a link to the original) |
| Study | Study | implemented |
| Contribute hub | Contribute | implemented |
| Opportunities | Contribute > Opportunities | implemented |
| Community Challenges | Contribute > Community Challenges | implemented |
| Questions, Issues & Ideas | Contribute > Questions, Issues & Ideas | implemented |
| Learning Commons | Contribute > Learning Commons | implemented |
| My Contributions | Contribute > My Contributions | implemented |
| Suggest Improvements | Contribute > Suggest Improvements | implemented (shortcut: Suggestion Matter to Civizen) |
| Market | Market | implemented |
| Agreements | Market > Agreements | implemented |
| Messaging | Messaging | implemented |
| Profile / Score | Profile | implemented |
| Happiness & Fulfillment | Profile menu, or the Happiness icon on the Home Score card | implemented (private; five levels, not a numeric score; Fulfillment Plans under Improve; optional group insights off by default) |
| Work Fulfillment | Happiness & Fulfillment > Work Fulfillment | implemented (current work, Work Joy, Fit, improve-current-work first; Contribute to try; Market > Jobs for employment) |
| Wellbeing Insights | Happiness Privacy (quiet link) or `/wellbeing-insights` | implemented (authorized viewers only; Overview · Patterns · Action; no organization Happiness Score) |
| Human Outcome Review | Wellbeing Insights, Challenge, Project, or Governance Solution | implemented (privacy-safe baseline vs follow-up; not causal; public-safe lessons are member-readable after publish) |
| Marketplace Jobs | Market > Jobs | implemented (actual employment; distinct from Contribute Opportunities) |
| Areas | Areas (Contribute, Home > Governance, or public footer) | implemented (read-only V1) |
| Governance landing | Home > Governance | implemented |
| Civic voting | Home > Governance > Civic voting | implemented |
| Governance workspace | Home > Governance workspace | implemented |
| Governance Solutions | Home > Governance > Governance Solutions | implemented |
| Community Governance Charter | Home > Governance > Community Governance Charter | implemented (interim public policy) |
| Partners | Contribute > Organization Partnership | implemented (public notice; not a CRM) |
| Funding inquiries | Contribute > Financial Support | implemented (inquiries only) |

`/contribute/tasks` redirects to Opportunities. `/contribute/projects` redirects to Community Challenges.

## Areas

Current foundational Areas (evolvable): **Health · Education · Culture · Responsibility · Environment**.

Public `/areas` and `/areas/:slug` are read-only. Areas answer *where help is needed*. Contribute answers *how I want to help*. Partners answers *how an organization can work with Civizen*.

Product pillars (`PILLARS`) are a separate live product taxonomy. Do not treat them as the Area model.

## Initiatives

Public Area pages list curated related **systems** (existing product surfaces) and genuine **initiatives** (organized work toward an outcome). There is no full initiative schema or matching engine in this build. A future Areas & Pilots Catalog is recorded in institutional docs and is **not built**.

## Contribution model

`/contribute` asks: **How would you like to contribute today?**

Ways: Volunteer (`/fund/contribute`) · Opportunities · Financial Support (`/fund`) · Organization Partnership (`/partners`).

Community: Community Challenges.

Knowledge: Learning Commons · Suggest Improvements (opens a Suggestion to Civizen).

Your Impact: My Contributions.

A **Program** (`contribution_programs`) is the container. Publisher is a profile (personal or linked business account). There is no separate organizations table in this phase.

An **Opportunity** is the work primitive. A **Contribution** is a participation (`opportunity_participations`). Score events are derived.

Phase 1 pilots (live): Education-to-Contribution, Community Problem-Solving Lab, Shared Knowledge / Learning Commons.

## Opportunities

Live under **Contribute > Opportunities**. Education-to-Contribution Program.

Flow: discover → apply → organizer accept/decline → do the work → submit evidence → evaluator verifies → optional evaluation → completed contribution.

Opportunity kinds: `education_to_contribution` (professional lane), `community_implementation` (inside a Challenge Project), `knowledge_gap` (from a Knowledge Gap).

Older names such as “professional listings” or “open tasks” mean Opportunities.

## Community Challenges

Live under **Contribute > Community Challenges**. Distinct from Governance Solutions.

Flow: Challenge → Proposal → coordinator selection (not public voting) → Implementation Project → Contribution Opportunities → outcome → Solution Record.

Signed-in members can create a challenge from **Create** on Contribute > Community Challenges. Coordinators manage the challenge they publish. Completing requires implementation outcome, not merely a selected proposal.

## Questions, Issues & Ideas

Live under **Contribute > Questions, Issues & Ideas** (`/contribute/matters`). This is a generic **Matter** system, not a separate Issues module. A Matter can start as a Question, Issue, Suggestion, Request, Discussion, or Other / Unsure, and that type does not freeze the workflow. Every active Matter shows who must act next, what is expected, when it is due, and what happens if nobody acts. Comments are discussion only — they are not a final answer and do not start the confirmation timer. When a Matter needs real work, the responsible party can **Start collaborative work**: assign Tasks, accept or decline assignments, record Decisions, and attach completion evidence. Completing a Task does not close the Matter. Ordinary work completion waits until required Tasks are Completed or Cancelled; a declined Task is not treated as done. The Responsible Lead can **Complete with outstanding work** only by giving a reason. Asking someone to share Matter responsibility is a timed request they must accept — inviting them to collaborate is not the same thing. After work or a final response, the Responsible Lead **proposes Resolution** (what was done, outcome claimed, limitations; outstanding Tasks are surfaced). The initiator **reviews** the proposed Resolution — confirm, partially accept, not resolved, need clarification, or cannot verify. Each attempt is preserved; auto-close after silence is **not** initiator confirmation. Optional outcome follow-up and evaluations collect structured feedback without changing Civizen Score. **Suggest Improvements** opens Matter create as a Suggestion addressed to Civizen. **AI assistance (Phase 4A–4B1):** authorized Responsible Leads can **Add AI assistance** — Research, Planning, Facilitation, Analysis, Documentation, or **Code**. Agents join as explicit `ai_agent` participants (not fake people) under a human supervisor. Coding Agent uses a live model in an isolated development worktree on an allowlisted repository; file and command operations go through a trusted runner, and it cannot commit, push, deploy, apply remote migrations, or close the Matter. AI work uses the same Task submission and human review loop; AI cannot accept responsibility, close Matters, confirm Resolution, or submit human-style evaluations. Civi remains the general assistant; Matter agents are scoped collaborators behind human approval.

## Projects

Implementation **Projects** live **inside** Challenges. There is no separate community-projects or tasks board.

## Knowledge Spaces

Live at `/contribute/knowledge` as **Learning Commons**. Distinct from Study, content library items, and Governance Solutions.

A Knowledge Space is a shared collection (title, purpose, optional Area, coordinator, Program, status). Resources live inside a space.

## Knowledge Gaps

Gaps name what is missing, weak, outdated, unresolved, or still needs practical development. Coordinators can turn an actionable gap into an Opportunity or a Community Challenge.

## Solution Records

Created when a Community Challenge completes with a recorded outcome. A coordinator can share a Solution Record into a Knowledge Space as a Resource. Not the same as Governance Solutions.

## Programs

`contribution_programs` kinds: `education_to_contribution`, `community_problem_solving`, `shared_knowledge`.

## Study

`/study` is the learning hub (constitution/charter materials, laws, civic domains). Distinct from Learning Commons. Law library is `/law`.

## Market

`/market` is public. **Jobs** (`/jobs`, also Market > Jobs) is the first open participation surface: anyone can look for work or post a job without an account. The page title on that section is **Marketplace / Jobs**. The sentence form fills city/region/country from the visitor’s location, shows an indicative minimum pay for the rotating job type, and includes Full-time, level, and start — those extra dropdowns stay a bit dimmer than job type, place, and pay. Workers can choose job, volunteering, or internship; employers do not use the word job in the sentence. Signed-in members can unfold **More** for preferred work days, hours, languages, and notes. The public website header and onboarding hero link to Jobs. Contact details stay locked until sign-in. Other Market sections (For you, Local, Sell, products/services) remain member workflows. Members can list products/services and start agreements. Ordinary purchases are Order + Marketplace terms — they do **not** auto-create a Sale / Purchase Agreement.

Luma amounts on listings are **illustrative prototype credits**, not checkout or settlement. There is no sold-via-Luma buy button.

## Agreements

`/agreements` is the platform workspace (not Market-only). Create with **+** beside the title. Common types: General · Partnership / Collaboration · **Employment** · Service / Contribution · Sale / Purchase · **Lease** · Funding / Sponsorship, then **More agreement types…** (MOU, Pilot, Program, Data / Research, NDA). Unmatched search offers **+ Create “{name}”** as a custom type for that record only.

Supported types open a purpose-built agreement document with inline facts. The page header is **Agreement on**. Hover or tap that wording for the same type menu as the list `+`. An optional user/organization reference sits on the right of the type heading (defaults to service-provider initials or an organization abbreviation; parties can edit it or leave it blank). A Civizen **AGR-YYYY-NNNN** is assigned when the first signature arrives and appears in small type at the lower right — not on create. Hover the heading for other wordings (**Service Provision** / **Contribution** for Service / Contribution); click it to rename. Service relationships use Client / Service Provider; contribution relationships use Organization / Project / Contributor. Role labels such as *the Client* are italic in the prose. New drafts prefill today’s start date and the same calendar date one year later, shown as sentence text (**Aug 13, 2026**); hover or tap a date to change it. The ending is one condition (a date, until completed, ongoing, or until terminated). Click a sentence to rewrite it. Names and long fields continue in the sentence and wrap at words, so a first name that fits stays on that line. Enter starts a new line in long fields; a compact formatting bar appears while editing those. Hover or tap font, color, size, list, or alignment to pick an option (sizes 12–24, including justify); bold, italic, and underline toggle directly. Required placeholders name the action needed. **Create agreement** highlights the first missing required fact in the document. Custom names open a flexible skeleton. Jobs / hiring prefills Employment. Employment is distinct from Service / Contribution. Lease heading kinds include Residential, Commercial, Car, Vehicle, Equipment, Office, and Property rental.

Propose, then sign in Civizen (typed name + explicit consent) or record paper/external execution. Native signing is an in-app electronic signature record, not a certified PKI digital signature or a claim of legal enforceability.

## Governance

Public landing `/governance`. Member proposal hub `/governance/workspace`. Civic voting `/governance/voting` (Proposals and Elections; public browsing; History beside each label for past/demo items).

Current public community instrument: **Civizen Community Governance Charter** (`/governance/charter`). It is **not** the legal constitution of a government or company.

The older **Civizen Constitution v0.1** is **superseded** by that Charter.

Working institutional design (not adopted public policy, not fully implemented as product authority): Institutional Blueprint and Governance Framework under `docs/institutional/`.

## Governance Solutions

`/governance/solutions` — post a Problem; Discuss (public thread + AI participation) or Solve (categorize and route). Catalog of civic authorities. **Distinct from** Community Challenge Solution Records.

## Voting

Civic elections and contests at `/governance/voting`. A Matter can draft a **voting proposal** (does not cast ballots). Geographic scope on a Matter (`Global` by default; optional country) is separate from subject **Area** (optional domain taxonomy). Voting proposals inherit the Matter’s geographic scope; founders/admins publish to an ordinary nonbinding consultation ballot (Support / Oppose / Abstain) at `/governance/voting/:electionId`. Public surfaces show aggregate option counts, suppressed country-of-residence participant stats (≥25 with country overall; ≥5 per country), and an optional consented participant directory (display name + country only). Casting does not require public listing. Until closing, participants may withdraw their effective consultation ballot (it leaves valid counts, country stats, and the directory) and cast again if eligible. Individual ballot choices, emails, and account IDs are not shown publicly. Demo/sample elections stay in History, not the live list. Global contests remain visible under local country filters. Community proposals/votes also exist in the governance workspace under Charter rules. Token ownership or wealth alone does not create voting authority. Voting may be advisory or binding only within a delegated scope.

Who can draft a voting proposal from a Matter: the Matter initiator or responsible party, or founder/admin/system. Who can publish the ballot: founder/admin/system only. Other proposals: eligible participants through `/governance/workspace` and `/governance/new`. Exact eligibility follows published platform rules and role permissions.

Voluntary Civizen consultations do not create legal citizenship, replace public-law elections, or imply a predetermined world government. Public framing stays inclusive (a more united world; respect for rights, diversity, and local autonomy).

The first real public consultation is **A Single World Citizenship** (`single-world-citizenship`) on `/governance/voting`. The question is: should humanity work toward establishing a single world citizenship, shared by all people regardless of nationality? Options are Support, Oppose, and Abstain, with equal treatment. It is a global, ordinary, nonbinding consultation. A Support vote does not create, grant, or enroll anyone in a world citizenship, and it does not replace existing nationality. It does not ask about shared land or resources, a common currency, cashless systems, a specific government or constitution, or common legal, economic, health, or education standards. Those would be separate future consultations. Demo and sample elections are not this consultation.

## Messaging

**Civi** is Civizen’s AI assistant. The name appears as **Civi. Your AI Assistant**.

Visitors can ask Civi about the project without creating an account. A Civi button sits at the lower right on public pages. Public Civi answers from current project knowledge and does not use personal member records. If a step needs an account, Civi says they can create one from Sign up.

When Civi does not already have a good answer, it may use Gemini. It then checks that reply. If the answer is reusable and does not invent a Civizen product fact, Civi remembers it. Similar questions later are answered from that memory instead of calling the model again. Identity, the capability registry, and this cheat sheet still win. Personal records and one-off drafts are not stored.

During the development phase, founders (and admin / system) can review questions and Civi’s replies at **Settings > AI Agent**. That page is not shown to ordinary members.

`/messaging` — person-to-person chat, including a pinned chat with **Civi** for signed-in members. Device-based keys support E2EE when both participants have keys. Civi is not a generic web chatbot.

Person-to-person threads: **Hide chat** removes it from your inbox only; the other person keeps the conversation. **Disappearing messages** is a shared setting both people see and applies to new messages after it is turned on. You can **edit** or **unsend** your own message for one minute (edited messages stay marked Edited). Civi chats can be **cleared** entirely; that does not apply to person-to-person history. Searching for people can use phone contacts (with permission) and **Invite** if they are not on Civizen yet.

## Profiles

Profiles include identity, bio, education, experience, skills, endorsements, and Score. When stronger trust is needed, members can start **Identity verification** from Settings → Edit Profile: upload a photo of an ID and a photo of their face for staff review. Verification is optional at signup and is not a government ID check. Business/organization presence uses **linked accounts** on a profile (no separate organizations table in Phase 1). A member may link **more than one** business account from the profile menu Accounts `+`. While signed into one organization, the other organizations stay listed so you can switch. Swipe or scroll the account cards — the current account stays in the center, with the others visible on the sides — and tap a card to switch. If the company already exists, Add business becomes **Connect** instead of **Register**.

## Score

Civizen Score V2 (`civizen-score-v2.0`) on Home and `/profile`. Categories: Learning, Experience, Skills, Performance, Contributions. Public overall score is **established** activity only; a provisional estimate is not presented as a mature Score. Tiers: Explorer · Builder · Contributor · Catalyst · Steward. The rating system is still in formation.

## Roles and permissions

App roles include guest, member, citizen, verified_member, certified, moderator, market_manager, admin, founder, and system.

Founder currently has full bootstrap access. Permissions are feature-scoped (including `agreements.create` and `agreements.sign_org`). Guest is read-mostly.

Coordinators/publishers are profiles that publish Programs, Opportunities, Challenges, or Knowledge Spaces (personal or linked organization account).

## Organizations / publishers / coordinators

Organization participation today: linked business accounts (a member may link more than one), public `/partners` notice, publisher profiles on contribution Programs. Not a partner CRM, Stakeholder Map, or Pilot Portfolio.

## Partnerships

`/partners` is the public International Partnerships and Chapters notice. Institutional partnership inquiries: `/fund/institutional`. Working design lives in the Stakeholder & Partnership Framework (proposed/working, not a live CRM).

## Funding

`/fund` collects **inquiries and interest only**. It does not process investments, issue securities, promise returns, or create a binding investment agreement.

Current public policy: **Funding and Financial Integrity**. No fixed public distribution formula. Luma is not money.

The document **Civizen Constitutional Tokenomics + Governance Model** is **historical / superseded / not adopted**. Do not describe it as current policy or as an implemented monetary system.

## Current pilots

Phase 1 (implemented): Education-to-Contribution, Community Challenges, Learning Commons. Seeded demo programs exist for those lanes.

Institutional Pilot Framework is working design for how Civizen may later classify pilots. It is **not** a second in-app Pilot Portfolio.

## Relevant constitutional architecture

Current public community governance text: Community Governance Charter.

Superseded: Civizen Constitution v0.1.

Long-term pathway (current public description, not present legal status): recognized planetary citizenship pathway at `/about/planetary-citizenship-pathway`. Present legal status remains voluntary and non-governmental.

Working (not adopted as public constitution): Institutional Blueprint, Governance Framework.

## Relevant tokenomics / governance architecture

No adopted tokenomics constitution. Crypto/token mechanisms are conditional/future and disabled as money. Prototype credits (Luma) are demonstration-only, non-transferable, non-redeemable, and confer no governance rights.

## Terminology

Use current UI names: Opportunities, Community Challenges, Learning Commons, Knowledge Spaces, Knowledge Gaps, Solution Records, My Contributions, Agreements, Prototype credits, Community Governance Charter, Areas, Happiness & Fulfillment, Work Fulfillment, Wellbeing Insights, Human Outcome Review.

## Commonly confused concepts

| Confused | Current meaning |
| --- | --- |
| Social network | Civizen is a civic participation platform, not a hobby/meetup network |
| Government / legal citizenship | Not currently; voluntary civic identity |
| Constitution v0.1 | Superseded by the Community Governance Charter |
| Tokenomics model | Historical / not adopted |
| Governance Solutions vs Challenge Solution Records | Different systems |
| Study vs Learning Commons | Study = learning hub; Learning Commons = shared contribution knowledge |
| Tasks / professional listings | Opportunities |
| Community projects board | Projects inside Challenges |
| Luma / wallet | Prototype credits; not money; transfers disabled |
| Sale/Purchase Agreement vs Market order | Negotiated agreement vs ordinary listing order |
| Employment vs Service / Contribution | Employment is a job relationship; Service / Contribution is independent/consulting/volunteer work |
| Areas vs product pillars | Separate taxonomies |
| Happiness Score | Civizen does not show a numeric Happiness Score; five private levels only |
| `/partners` vs partnership CRM | Public notice only |

## Happiness & Fulfillment

Private member wellbeing. Open from the Profile menu. Five levels: **Struggling · Unsettled · Balanced · Flourishing · Thriving**. These are states, not identities (“Your current happiness level is Balanced,” never “You are Struggling”). No numeric Happiness Score. Check-in records today’s feeling (not the Happiness & Fulfillment level), may select more than one life area, and asks concise follow-ups for specific supports or problems using the existing cause taxonomy. After several check-ins Civizen can name what within an area appears to be affecting the member — not merely “Balanced + Work.” Not used for Civizen Score, reputation, hiring, or governance power. Improve holds private **Fulfillment Plans** (one life area over time: try, follow up, adapt). Starting from a Life area does not re-ask the known domain. Factor certainty stays distinct: what the member said, what Civizen observed, and possibilities to explore — not facts. Work Fulfillment is a distinct subunit at Happiness & Fulfillment > Work Fulfillment: current work (several contexts, one primary), Work Joy, Fit, and improve-current-work first. Work Joy patterns appear only after enough entries, as suggestions. **Contribution Fit** (Contribute / Opportunities) is for trying work. **Job Fit** (Market > Jobs) is for actual employment. Opportunity/Jobs matching uses approved shareable preferences only — not Work Joy, diagnoses, Happiness Level, or private notes. A new career is not the automatic next step. Civi may receive a grounded Plan brief (what the member said / what Civizen observed / suggestions); it must not invent history, invent causes, or diagnose. Follow-up timing can be stored; notifications are not sent yet. Optional **privacy-protected group insights** are off by default under Happiness Privacy; they never give an employer individual Happiness. Authorized organization/community viewers may open **Wellbeing Insights** (`/wellbeing-insights`) for qualifying group patterns (Overview · Patterns · Action). After a linked Challenge, Project, or Governance action, they may open an **Outcome Review** (`/wellbeing-insights/outcome`) to compare later privacy-safe evidence with a baseline. Operational delivery and human-outcome evidence stay separate. Civizen does not establish causation from before-and-after observation. Negative and null results are preserved. There is no organization or community Happiness Score, no Happiness impact score, no participant list, and no automatic Challenge or Governance publication. Civi may summarize a privacy-safe aggregate or Outcome Review; it must not reconstruct a suppressed result from private records or say a Project made people happier.

## FAQ

See the machine-readable FAQ in `src/lib/assistant/catalog.ts`. Answers must stay aligned with this cheat sheet and the live routes above.
