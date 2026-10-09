---
title: Product inventory and implementation plan (2026-10-07)
status: current
version: 0.1
date: 2026-10-07
owners: Armen Yeremyan (owner); maintained by the agents working on Civizen
canonical: true
related:
  - information-architecture-and-content-standards.md
  - voting-system-and-app-audit-2026-10-05.md
  - ../../01-governance/participation/civic-voting-system-design-v0.1.md
  - ../../00-foundation/recognized-planetary-citizenship-pathway.md
  - ../../institutional/institutional-blueprint.md
---

# Civizen product inventory and implementation plan (2026-10-07)

**Audience:** the owner and every agent working on Civizen.
**Scope:** the whole application (web and Android) from the point of view of every user type.
**Basis:** read-only review of `main` at `cd98df6` (v0.1.201, build 203), the live site (guest view), 234 docs, 278 migrations, and read-only counts from the production database on 2026-10-07. Nothing was changed in code or data while producing this document.
**How to use it:** Section 7 is the ordered step list. When a step ships, its row in Section 10 is updated with evidence in the same change. This file is the single product-wide tracker; AyMe keeps the reasons and decisions; detailed specs stay in their own documents.

---

## 1. What Civizen is for

Civizen is the software expression of *Mature Humanity*: a voluntary, non-governmental civic network where people act as citizens of one planet. It claims no state authority. Its promise is a complementary layer of world citizenship in which people **learn shared civic rules, raise matters, discuss them, develop solutions, decide together within Civizen's delegated scope, contribute work, cooperate economically, and improve the governance itself**, with everything built in the open and audited in public ([charter](../../00-foundation/the-civizen-charter.md), [pathway](../../00-foundation/recognized-planetary-citizenship-pathway.md)).

The pathway is staged: voluntary identity and principles (Stage 1) → broad participation and verified community institutions (Stage 2) → partnerships, pilots and public consultation (Stage 3) → constitutional development (Stage 4) → lawful recognition (Stage 5) → recognized planetary citizenship (Stage 6). The product today is in Stage 1 moving into Stage 2.

**The outcome this plan serves** (owner priority, through 2026-12-22): a functional platform ready for meaningful public participation across countries, with the end-to-end loop **issue raising → discussion → solution development → voting → contribution → shared-governance improvement**, delivered through a decentralised, open-source, continuously audited system. Weekly public communication is an outreach commitment outside the app and is not planned here.

**What the landing page promises today:** World Citizen profile, Study, Governance, Market, Agreements, Messaging, Contribute; "expanding next": iPhone test distribution, full verifier federation, insurance modules.

## 2. How Civizen must be built (rules already adopted)

These are binding on every step below. Sources: [`AGENTS.md`](../../04-operations/dev/AGENTS.md), [IA standards](information-architecture-and-content-standards.md), [governance framework](../../institutional/governance-framework.md), [citizen status model](../../01-governance/participation/citizen-status-model-v0.1.md), [decentralization architecture](../decentralization/decentralized-transition-architecture.md).

| Rule | Meaning in practice |
| --- | --- |
| **Simple by default. Advanced by need. Always.** | Smallest clear interface for the immediate goal; progressive disclosure; prefill from what the member already told us; icons with accessible labels for common actions; empty states stay minimal; `+` beside the title creates. |
| **Epistemic honesty and visible status** | Never show invented numbers or placeholder features as real; every surface says what it is (draft, demonstration, prototype, interim). Disabled actions explain what is missing. |
| **Mobile-first, accessible** | One primary action per screen; works without hover; keyboard, labels, contrast; nothing under persistent nav. |
| **One authoritative source** | Specs in `docs/`, feature registry in `src/lib/feature-registry.ts`, Civi knowledge regenerated in the same session as any user-facing change. |
| **Status layers stay separate** | Registered → Verified → Citizen → Active → Governance-eligible are distinct states and badges; Founder is an office, not a civic state. |
| **1 eligible citizen = 1 vote** | Score is an eligibility condition only; never a vote weight. Token ownership or money never creates voting authority. |
| **Progressive decentralization** | Founder-led bootstrap → institutional governance → distributed participation. Founder powers are explainable and scoped; impersonation is forbidden; sensitive checks move server-side; governance events become signed and auditable. Do not reduce founder bootstrap access without a decision. |
| **Server-side enforcement** | Eligibility, roles and ownership must hold against a crafted client (RLS, RPC, triggers). Client checks are convenience only. |
| **Languages** | English plus hand-written Armenian and Russian for everything a participant must understand; machine translation only as a labelled fallback. |
| **Autosave default; outlined fields; standard shells** | Editable app pages autosave; `OutlinedField`; member pages use the app shell, public pages the public shell. |
| **Engineering standards** | Files ≤ 400 lines (baseline ratchet); typed Supabase client; `npm run typecheck`, `lint`, `test`, `build`; `verify:post-dev` after UI changes; SQL tests for migrations on the local stack; Playwright for primary flows. |
| **Releases** | Production by default from one build (website + both Android tracks); Testing track only when a change must be tried on a device first; procedure in [`RELEASING.md`](../../04-operations/dev/RELEASING.md). Production database migrations are applied by hand after a backup and only with the owner's go. |
| **Backends** | The dev server on `:8080` talks to **production** Supabase; every browser write during development goes to the local stack (`:8081` container or `.env.local`), never to production. |

## 3. Reality check: what production shows (read-only, 2026-10-07)

| Signal | Value | Reading |
| --- | --- | --- |
| Profiles | 31 (17 verified; roles: certified 11, member 9, system 4, founder 2, others 1 each) | Tiny, founder-adjacent community. |
| Sign-ups | 27 in 90 days, **1 in the last 30 days** | Growth has stalled. |
| Active in last 30 days | 5 | Essentially the team. |
| Live consultation (A Single World Citizenship) | 1 open, 19 certified samples, **0 countable ballots** | The flagship participation act has not happened yet. |
| Matters | 1,193 (1,111 issues, 82 questions); **3 creators**; 1,192 participants-only, 1 public; 234 created in 30 days | Volume comes from development stories and the team, not from members. |
| Development stories | 646 | Internal change log surfaced as Home "Stories". |
| Home posts | 8, by 2 authors | |
| Private messages | 4 | |
| Market listings / Agreements / credit ledger entries | 0 / 0 / 0 | The economic layer is unused. |
| Endorsements | 0 | |
| Identity verification cases | 3 | |
| Opportunity participations / Happiness check-ins | 2 / 1 | |
| Funding interest inquiries | 0 | |
| Civi interactions | 20 total, 9 in 30 days | |
| Notification rows | 5,025 | Mostly historical rows surfaced by the new center. |
| Scheduled jobs | 9 pg_cron ticks (elections close, matter timeouts, federation, relay, emergency access) | Platform machinery runs; participants do not. |

**Reading for the plan.** The codebase is broad (302 tables, 489 components, 24 areas) and the participation funnel is empty. The product does not need more surfaces; it needs **(a)** to be safe to trust, **(b)** one participation loop a newcomer can complete end to end in ten minutes, **(c)** honest surfaces that do not promise what is not there, and **(d)** the stall points removed from sign-up to first ballot. Everything else is sequenced behind that.

## 4. User types and what each can do today

Roles in code: `guest, member, citizen, verified_member, certified, moderator, market_manager, admin, founder, system` (`src/lib/access-control.ts`). Civic status layers: `registered_member → verified_member → citizen` plus `is_active_citizen`, `is_governance_eligible`. Office: `founder` (single key). Domain roles: 12 governance domains with lead/steward/reviewer. Business accounts: `linked_accounts` (several per owner). Civi runs as system-agent profiles.

| User type | Entry points | Can do today | Gaps and defects |
| --- | --- | --- | --- |
| **Visitor (guest)** | Landing, Why, Areas, Documents, Governance landing and voting catalog, ballot pages (read), Fund, Market Jobs, Download, Terms, public Civi widget | Read everything public; browse listings; post a job or a "looking for work" entry; read the open consultation; ask Civi | Sign-in links on ballot carry return path only for the ballot; `/partners`, `/fund/*`, Area pages show "Create agreement" and "Contribute" buttons that lead to sign-in; `/terms` uses the member shell; 404 page has no chrome; `/features` is protected; closed or scheduled consultations still show "Create account to vote" and hide the outcome |
| **Registered member** | Home, Study, Contribute, Market, Messaging, Profile, Settings, Governance workspace, Notifications, Happiness | Post, like, comment, repost; message 1:1 and Civi; raise Matters; join opportunities and challenges; read Knowledge; cast ballots in ordinary consultations; support and draft proposals from a Matter; create agreements; check in on Happiness | **Can vote without any verification** and no uniqueness check; can edit any column of own profile row (role, permissions, verified flags) **(S1)**; can approve own verification case **(S2)**; can link and switch into any other account **(S3)**; no email/password change, no data export; phone sign-up has no SMS check and no recovery |
| **Verified member** | Same, plus "verified-only" content | Verification badge; verified ballots counted separately | Verification is manual (steward approves ID + selfie); nothing automates citizenship after 30/14 days; "verified" means two different things (flag vs role) |
| **Citizen / Active citizen / Governance-eligible** | Governance pages | Status chips | No path advances status over time; eligibility computed in the browser from the old endorsement score; the native-app requirement makes every web user "Ineligible" in the legacy governance tools; contradictory chips |
| **Certified professional** | Settings → Professions; Study/Law contributions | Contribute and review moderated content; profession badge | Assigned automatically on profession approval; little visible benefit |
| **Business (linked) account** | Profile menu → Accounts | Register/connect/switch business account; post jobs as employer; publish opportunities | Access requests cannot be approved anywhere; employer detection by `biz_` username prefix; agreements always list creator as individual; business profiles can vote and endorse like persons |
| **Moderator** | Settings → Messaging reports; Law review | Review reports and endorsements, moderate content | No post/comment moderation UI; no report route for users (`/report/user/:id` has no route) |
| **Market manager** | Settings → Market → credits | Mint prototype credits | Credits cannot be spent or moved |
| **Steward / office holder (founder office)** | `/governance/tools/steward`, `/governance/workspace` Tools tab | Review identity verification cases; appoint/transfer/end the founder office; read policies | Only one office key exists; Tools gating checks a non-existent permission; domain reviewers have database rights but no screen |
| **Admin / Founder** | Settings → Admin (users, roles, permissions, governance, modules, funding) | Change roles (including founder), verify, sanction, grant permissions, create users, review emergency access, edit permission matrix, manage budgets and funding sources | Founder still has blanket permissions and skips route checks; impersonation flow stops at an approved request (function disabled); "Modules" is a read-only list |
| **System agents (Civi)** | Messaging, public widget, edge function | Answer from knowledge pack, then Gemini/OpenAI; EN/HY/RU detection | No actions; no member-data context; English fixed replies; guest rate limit based on a spoofable header |

## 5. Section-by-section inventory

Legend: ✅ working · 🟡 partial · ⚪ stub or placeholder · 📐 planned, not built · ⛔ defect. Evidence paths are relative to the repo root.

### 5.1 Public surfaces and onboarding
| Capability | Status | Notes |
| --- | --- | --- |
| Landing (`/onboarding`), Why this exists, Areas, Documents (14 interim docs), Governance landing, Fund pages, Download, Terms | ✅ | Public shell, light/dark, phone layout sound. Documents English only. |
| Open consultation banner on landing and Home | ✅ | Shipped v0.1.201. |
| Sign-up (email or phone), sign-in (email/username/phone), password reset | 🟡 | Phone sign-up creates a fake email and skips SMS; reset is email only; no resend confirmation; no social login (`src/contexts/AuthContext.tsx:600-620`). |
| Return-to-ballot after sign-in / sign-up | 🟡 | Works for the ballot route only. |
| Public job board and "looking for work" sentence | ✅ | Guests can post; contact unlock needs sign-in. |
| 404, `/terms` shell, `/features` redirect | ⛔ | Inconsistent shells; `/features` protected. |
| Public Civi widget | ✅ | On every public page except auth pages. |

### 5.2 Account, identity and verification
| Capability | Status | Notes |
| --- | --- | --- |
| Profile row ownership (RLS) | ⛔ **S1** | Owner may update **all 54 columns** including `role`, `granted_permissions`, `is_verified`, `is_governance_eligible`; no trigger guards them (confirmed on production). |
| Identity verification (ID photo + selfie, steward review) | 🟡 / ⛔ **S2** | Flow and private bucket work; owner may update own case including `status`, and the projection trigger then sets `is_verified` (confirmed on production). No duplicate, liveness or face checks; `identity_verification_providers` unused. |
| Profiles readable by everyone, signed out | ⛔ **S4** | `SELECT … USING (true)`; exposes date of birth, place of birth, phone, official ID and the generated identity number. Today 6 rows have a birth date, 0 a phone. |
| Login identifier resolution callable anonymously | ⛔ **S5** | `resolve_login_email` returns the email behind any username or phone. |
| Business account linking and switching | ⛔ **S3** | Any member may insert a `linked_accounts` row pointing at any profile; `linked-account-switch` then issues a sign-in token for that profile. Profile ids are public. `create-linked-business-account` is dead code (not deployed, not called). |
| Citizenship after 30 days (or 14 with acceptance), Active status, governance eligibility | 📐 | Policy exists; nothing advances status; eligibility client-side; snapshots owner-writable **(S7)**. |
| Terms re-consent gate | ✅ | |
| Name/username change windows, World Citizen ID format | 🟡 | Enforced in the browser only; later trigger rewrites dropped the server rules. |
| Self-service deletion | 🟡 | Works; leaves verification files, certificates, identity numbers, entries and owned business accounts. |
| Email/password change, data export | 📐 | Missing. |

### 5.3 Profile, Score, endorsements, search
| Capability | Status | Notes |
| --- | --- | --- |
| Own profile with Score dial, tiers, history, domains; contributions ledger | ✅ | Score computed in the browser from five inputs. |
| Public profile `/user/:id` | 🟡 | Score built from tables only the owner can read, so visitors see a lower or empty score; Report link has no route; "Request endorsement" opens "endorse someone". |
| Endorsements (pillar, 1–5 stars, 30-day rule) | ✅ | 0 in production. `/endorse/select` linked from four places but has no route. |
| Two scores | ⛔ | Governance eligibility uses the legacy endorsement-only score, contrary to the score spec. |
| Directory search (people, companies, products, services, content) | ✅ | |
| Pillars rename | ⚪ | Saved only in this browser. |

### 5.4 Home
| Capability | Status | Notes |
| --- | --- | --- |
| Composer (bold/italic/underline/lists), feed of 50 newest, likes, comments, reposts, edit with revisions, view counts | ✅ | Text only; no paging; no following. |
| Score card, Happiness shortcut, Governance card, endorsements, consultation banner | ✅ | |
| Stories tab | ⛔ **S6** | `ingest_development_story` is executable by any authenticated user and upserts by key, so any member can publish or overwrite public stories. English-only UI. |
| "Favourite" tab | ⚪ | No favourites feature; tab only hides the feed. |
| Post or comment moderation, reporting | 📐 | None. |
| Device-only fallback when tables are missing | ⛔ | Silent. |

### 5.5 Contribute hub
| Capability | Status | Notes |
| --- | --- | --- |
| Hub with lanes (Volunteer, Professional, Financial, Community, Tasks, Knowledge, Improve, Organization, Impact) | ✅ | Three lanes leave the app (interest form, Fund, Partners); related links never shown. |
| Matters (questions, issues, suggestions): raise → comments, files, mentions → formal actions, responsibility, timers → tasks and decisions → proposed resolution → initiator review → follow-up | ✅ | Largest feature. **No public list** (all queues personal); recipient must be a specific person or organization; region/city never sent; attachments cannot be opened; Overview/Discussion/Activity tabs do not change content; duplicate Matters on upload failure; three silent failures; timers need pg_cron (present on production). |
| Matter → voting proposal → consultation | 🟡 | Links both ways, but **the outcome never returns to the Matter**; the proposal is public while the Matter is participants-only ("not found" for voters); organization representatives may draft in the UI but the backend rejects them. |
| Matter → Agreements, Impact, Challenge or Solutions | 📐 | Deferred in the spec; no agreements card on Matters; Matters absent from Impact. |
| Matter AI agents (research, planning, facilitation) | 🟡 | Wired; Gemini; sees only title and description; canned output without a key; `CIVIZEN_ACTIVATION_FORCE_FAILURE` test hook still in production code; Coding agent assignable by any lead but runs only from a dev workstation; form prefilled with dev leftovers. |
| Opportunities (apply → accept → evidence → verify → evaluate → score event) | ✅ | Labels "paid/stipend/credit" pay nothing; URL says `professional`. |
| Community challenges (challenge → proposals → coordinator selection → project → outcome → solution record) | ✅ | No community vote on proposals. |
| Knowledge spaces and resources | 🟡 | Members read only; coordinator adds resources and gaps and reviews their own. |
| Impact (My Contributions) | 🟡 | Lists opportunity applications only. |
| Tasks, Projects | ⚪ | Redirects. |
| Demo programs seeded into production | ⛔ | Three seed migrations ship founder-owned demo content shown as real listings. |

### 5.6 Governance and civic voting
| Capability | Status | Notes |
| --- | --- | --- |
| Hub and catalog (`/governance/voting`), tier filters, history | ✅ | Reads device location on first visit and writes city/region/country to the profile silently; location pill "— , —". |
| Ballots: single, approval, ranked (instant run-off); change; withdraw | ✅ | Ordinary consultations only; elevated and constitutional classes rejected server-side. Production has both newest migrations (confirmed). |
| Sealed choice, hash-chained events, receipt | ✅ | Receipt "Verify" only re-checks the returned receipt; events table has no UI; owner/service role can still decrypt. |
| Server eligibility | 🟡 | Sanctions, age and scope; `requires_verified` and `min_age` exist but nothing sets them, so **any signed-in account votes**; no one-person-one-account rule. |
| Lifecycle | 🟡 | Hourly close tick with final tally, quorum, threshold, outcome; nothing ever certifies, cancels or withdraws; drafts cannot be edited after creation. |
| Member proposals: support threshold, author publication, scope, opening time | ✅ | Author can support own proposal and set threshold 1, so one person can publish alone; settings editable after support started; running tallies public while open. |
| Observer console | ✅ | Real data; mostly empty for consultations. |
| Notifications | 🟡 | Published and closed only; English hard-coded in SQL; no opening notice, reminders or push. |
| Legacy proposal system (`governance_proposals`, approve/reject) at `/governance/tools` and steward page | ⛔ | Browser-side resolution; native-app requirement makes web users "Ineligible"; contradictory chips; any member can open by URL. |
| Steward console: verification review, founder office appoint/transfer/end, policies | ✅ / 🟡 | Single office key; policies read-only static. |
| Simulator for sample elections | ⚪ | Hard-coded demo PINs, fingerprints and timestamps; labelled "simulate". |
| Push windows, geofence, biometrics, duress, canvass, delegation, admin create/schedule election, Merkle commitment, external verifiers for civic votes | 📐 | Library code and tables only. Design doc marks several "Built"; they are not. |
| Surface count | ⛔ | Seven governance surfaces, three "proposal" concepts, open votes shown in five places; Tools tab checks a permission that does not exist. |

### 5.7 Solutions hub (`/governance/solutions`)
| Capability | Status | Notes |
| --- | --- | --- |
| Post a problem; three-model AI council (ChatGPT, Gemini, Claude) debates up to 3 rounds; members endorse proposals; "Solve" routing to authorities | 🟡 | Consensus requires identical summaries, so most end "split"; missing provider keys become proposals; default Claude model id likely retired; any signed-in user can trigger paid runs on any problem; citizen comments never reach the agents; spinner forever on first failure; status editable freely by authors; authorities list duplicated. 0 problems in production. |

### 5.8 Study and Law
| Capability | Status | Notes |
| --- | --- | --- |
| Constitution reader (draft Universal Constitution, 12 articles), search, bookmarks | ✅ | English only; copy still says "Universal Constitution" though the Community Governance Charter superseded it. |
| Law library (12 instruments) with contribution review | ✅ | English only. |
| Courses | ⚪ | Three cards linking to other tabs. |
| Tests | ⚪ | "Start test (coming soon)"; no questions exist. |
| Schedules | ⚪ | Seven identical placeholders. |
| Progress and certification | ⛔ | Progress table read, never written; "AI Explain" is a template; certification set only by governance actions. |
| Specialists ("Civi Specialist Council") | ⚪ | Keyword matcher over eight canned English personas; hidden from menu but routable. |
| Domains | 🟡 | 5 of 10 switched off; citizenship materials open `/terms`; economy articles show "superseded" stubs. |

### 5.9 Market and Jobs
| Capability | Status | Notes |
| --- | --- | --- |
| Post / browse / archive listings | 🟡 | No edit, images, category, location or detail page; feed shows latest 50. |
| Category tabs, Local, For you, Saved, Filters | ⚪ | Same feed; Saved always empty; filters "coming soon". |
| Contact seller | 🟡 | Opens the general inbox. |
| Buy / checkout | ⚪ | Removed; transfer RPC always raises; stock never changes. |
| Jobs board, masked contacts, unlock, Employment agreement prefill | ✅ | No admin review screen despite statuses; posters cannot edit or withdraw; employer inferred from username prefix. |
| Taxonomy page | 🟡 | Reachable only from Settings. |

### 5.10 Agreements and Earnings
| Capability | Status | Notes |
| --- | --- | --- |
| Collaboration agreements: typed templates, document editor, review, propose, versioned signing with consent, paper/external signing with PDF, executed PDF, amend, complete, terminate | ✅ | The one complete economic flow. 0 agreements in production. |
| Agreements started from a Market listing | 🟡 | Older code path: raw text box, sign/cancel only, signed copy shown as JSON, no notifications, "Levela" and "Lumens" wording in generated text. |
| Earnings | 🟡 | Reads only older listing agreements where you are seller; "sold" means "signed"; dollar icon. |
| Fulfilment / order / payment | 📐 | No Order object; no settlement anywhere. |

### 5.11 Prototype credits (Luma)
| Capability | Status | Notes |
| --- | --- | --- |
| Balance, activity log, admin mint | 🟡 | Credits cannot be spent or moved; listings still require a Luma price; three routes and "wallet" naming for one page; superseded monetary policy is the only definition. |

### 5.12 Fund
| Capability | Status | Notes |
| --- | --- | --- |
| Public lanes (support, investor information, institutional, contribute, transparency, project finance) | ✅ | Honest inquiry-only copy; no payment processing by design. 0 inquiries. Nobody is notified of a new inquiry. |
| Admin: Budget (versioned, approve, publish), Program plan, Economics, Sources ledger, Interest list | ✅ | All manual entries. |
| Legacy tabs (ledger, audit, compliance, contributors) | 🟡 | Marked inactive, yet the only switch that publishes `/fund/transparency` lives there; interest "Add to ledger" writes to the legacy ledger; contributor distribution periods stubbed. |

### 5.13 Messaging and calls
| Capability | Status | Notes |
| --- | --- | --- |
| 1:1 chats, Civi chat, edit/unsend (1 min), disappearing messages, hide, block, report, contact search, images/files/voice notes | ✅ | One 4,848-line component. |
| End-to-end encryption | 🟡 | One key per device, no recovery or multi-device; **attachments blocked in encrypted chats**, and encryption is on by default. |
| Group chats | ⚪ | Keyword filters saved on the device. |
| Voice/video calls | ⛔ **S8** | Signals broadcast on one public channel filtered in the browser; group calls ring everyone with `/messaging` open; STUN only, no TURN; no push, so calls ring only when the page is open. |
| Read state, favourites, mute, wallpaper | 🟡 | Per device only. |

### 5.14 Civi (built-in assistant)
| Capability | Status | Notes |
| --- | --- | --- |
| Grounded answers from knowledge pack, capability catalog, cheat sheet; Gemini / OpenAI fallback; EN/HY/RU detection; voting FAQ hand-written in HY/RU; learned-answer memory | ✅ | Knowledge regenerated per release; edge function and client bundle both need deploying. |
| Actions, member-data context, authorized runtime data | 📐 | Not wired; "my account" questions get a fixed English reply. |
| Guest rate limit | 🟡 | In-memory, per spoofable header. |
| Admin page `/settings/ai-agent` | 🟡 | Read-only log, not settings. Old name "Nela" remains in bundle and ids. |

### 5.15 Happiness, Work Fulfillment, Wellbeing Insights
| Capability | Status | Notes |
| --- | --- | --- |
| Happiness check-ins (five levels), life areas, trends, improve plans, privacy settings; Work fulfillment overview/current/joy/fit/improve | ✅ | Real tables; no numeric score, as the spec requires. 1 check-in in production. |
| Wellbeing Insights and Human Outcome Review | 🟡 | Needs an operator-configured viewer scope and snapshots that nothing writes (no job, no function); English only; tables missing from generated types. |

### 5.16 Notifications
| Capability | Status | Notes |
| --- | --- | --- |
| Bell (60 s poll) and `/notifications` center | ✅ | Only consultation published/closed events; English SQL text; no in-app events for Matters, messages, agreements, endorsements; no push; no email digests. |

### 5.17 Settings
| Capability | Status | Notes |
| --- | --- | --- |
| Edit profile (ID card, avatar, identity fields, verification), professions, messaging preferences and security, privacy (biometric toggle, delete account), social accounts (org only), credits, taxonomy link, help, legal | ✅ / 🟡 | Privacy label promises visibility controls that do not exist; biometric sign-in can never work in the shipped app (plugin unregistered); "Taxonomy" is a single link; `/settings/legal` duplicates `/terms`. |

### 5.18 Admin and steward tools
| Capability | Status | Notes |
| --- | --- | --- |
| Users admin (role, verify toggle, experience, per-user permissions, professions, sanctions and appeals, create user, emergency access requests with review and audit) | ✅ | Any admin can assign `founder`; verify toggle bypasses uploads; impersonation function disabled and uncalled. |
| Roles (read-only), Permissions matrix (editable), Modules (read-only list), Governance admin (eligibility, signing key, maturity, multisig, anchoring) | ✅ / 🟡 | Finance-only users see admin links that redirect Home; AI Agent link gated by role while the route checks a permission. |
| Business access request approval | 📐 | No screen. |

### 5.19 Areas
| Capability | Status | Notes |
| --- | --- | --- |
| `/areas` and five Area pages | 🟡 | Static content; four of five Areas have no initiative; Area tags on Matters/Challenges/Opportunities never surface; guest buttons lead to sign-in. |

### 5.20 Native apps and updates
| Capability | Status | Notes |
| --- | --- | --- |
| Android (Capacitor 8.5), sideload APK, in-app update check on two channels, production-by-default publishing | ✅ | Debug builds published as release; no checksum on downloaded APK; generic release notes; `android/` untracked except `build.gradle`. |
| iOS | 📐 | No project; button "coming soon". |
| Web OTA layer, push notifications, biometrics | 📐 / ⛔ | Plan only; no push plugin; biometric plugin never registered. |
| Store distribution | 📐 | None. |

### 5.21 Languages
| Capability | Status | Notes |
| --- | --- | --- |
| English source: 6,375 strings | ✅ | |
| Hand-written HY/RU | 🟡 | 291 strings each (about 4.6%), mostly governance, voting, notifications, Help, Study strings. |
| 233 selectable languages | ⛔ | Machine-translated in the browser through an unofficial Google endpoint, one request per string, cached per device; failures fall back to English silently; no label that text is machine-translated. |
| Untranslated | ⛔ | Home tabs and Stories, Study specialists and reader, constitution and law texts, document bodies, Wellbeing copy, `index.html` failure screen, Civi fixed replies, notification SQL text. |

### 5.22 Platform, decentralization and data model
| Capability | Status | Notes |
| --- | --- | --- |
| Supabase (self-hosted) with RLS, RPCs, pg_cron; 302 tables; 9 edge functions | ✅ | Three 2026-05 tables still missing on production (unused). |
| Governance machinery: execution units, implementation queue, guardian multisig, relay nodes, public-audit anchoring, verifier mirrors, federation, activation feeds, emergency access | 🟡 | Extensive schema, workers and cron ticks; member-facing use is nil; several federation steps are "rehearsal" only. |
| Signed governance events, external anchoring of civic ballots, client-verifiable proofs for consultations | 📐 | The decentralization backlog items 1–7 remain open for the civic voting path. |
| Typed client | 🟡 | Regenerated 2026-10-06; five civic-voting files still untyped; Wellbeing tables missing from types. |
| Dead code | ⛔ | `src/lib/deployment/**` (~1,860 lines), `identity/did-manager.ts`, `i18n.ts` duplicate, two placeholder migrations with conflicting shapes, `create-linked-business-account`, `admin-impersonate-user`, `EndorseSelect.tsx`. |

### 5.23 Quality: tests, CI, standards
| Capability | Status | Notes |
| --- | --- | --- |
| Vitest 286 files (~1,870 tests), SQL tests on the local stack (7 files), Playwright 1 spec, 26 `verify:*` browser scripts, CI (audit, knowledge freshness, test, build), standards check with baseline | ✅ | No RLS/permission test harness; no tests for Matter detail, AI panels, Solutions, knowledge resource page, legacy governance vote path; e2e covers the ballot only; `RELEASING.md` has no database migration step. |

### 5.24 Documentation drift (fix as steps ship)
Design doc marks unbuilt voting features "Built"; audit progress log says Phases 0–3 "not committed"; governance README lists old funding URLs; funding README gives two different "immediate ask" figures; assistant cheat sheet places Agreements under Market and omits Earnings; integration guide route table outdated; Phase 1 pilot doc says "no LMS, quizzes" while Study advertises courses and tests; Contribute redesign draft still says "Replace current implementation".

## 6. Findings that set the order of work

### 6.1 Security and integrity (confirmed against production policies and grants)
| Id | Finding | Impact | Severity |
| --- | --- | --- | --- |
| **S1** | `profiles` UPDATE policy allows the owner to change every column; no trigger protects `role`, `granted_permissions`, `denied_permissions`, `custom_permissions`, `is_verified`, `is_admin`, `is_active_citizen`, `is_governance_eligible`, `citizenship_*`, `is_system_agent`. | Any member can make themselves founder/admin; RLS `has_permission()` then trusts it. | **P0** |
| **S2** | Owner may update own `identity_verification_cases` row including `status`; the AFTER trigger projects `approved` into `is_verified`. | Self-verification without review. | **P0** |
| **S3** | `linked_accounts` INSERT only requires `owner_profile_id` to be yours; `linked-account-switch` issues a sign-in token for any directly linked profile; profile ids are public. | Full account takeover of any member, admin or founder. | **P0** |
| **S4** | `profiles` SELECT is `true` for anon and authenticated; `UserProfile` loads every column. | Identity data exposed to the internet. | **P1** (design) |
| **S5** | `resolve_login_email` executable by anon. | Account enumeration by username or phone. | **P1** |
| **S6** | `ingest_development_story` executable by any authenticated user; upsert by key. | Any member publishes or overwrites public Home Stories. | **P1** |
| **S7** | `governance_eligibility_snapshots` insert/update by owner. | Eligibility display forgeable. | **P1** |
| **S8** | Call signalling on one public channel; no TURN. | Privacy and reliability of calls. | **P1** |
| **S9** | Guest Civi rate limit keyed on a spoofable header; Solutions council runnable by any user. | Paid-model cost exposure. | **P2** |
| **S10** | Deletion leaves identity files and numbers; verify toggle bypasses uploads; any admin can assign `founder`. | Policy and audit gaps. | **P2** |

### 6.2 Product and honesty
| Id | Finding | Severity |
| --- | --- | --- |
| H1 | Study Tests, Schedules, Courses, "Specialist Council"; Market Saved, Filters, categories, Local, For you; Home "Favourite" tab: placeholders shown as features. | P1 |
| H2 | Demo programs and challenges seeded into production as real listings; Stories tab surfaces the internal change log. | P1 |
| H3 | Broken routes: `/report/user/:id`, `/endorse/select` (four links), Request-verification link target. | P1 |
| H4 | Fragmentation: seven governance surfaces; three problem-raising systems (Matters, Solutions, Challenges) that do not link; two scores; two agreement systems; two funding ledgers; three credit routes. | P1 |
| H5 | Participation loop disconnected: no public Matter list; outcome never returns to the Matter; no agreements or impact from Matters. | P1 |
| H6 | Any signed-in account votes, no uniqueness, author can publish alone with threshold 1; running tallies public while open. | P1 (policy) |
| H7 | Machine translation everywhere without a label; core civic texts untranslated. | P1 |
| H8 | Stall points: phone sign-up without SMS and without recovery; no resend confirmation; guest CTAs into sign-in walls on public pages; closed consultations hide the outcome from guests. | P1 |
| H9 | Legacy governance tools reachable by URL with contradictory eligibility; "verified" means two things; Explorer naming clash. | P2 |
| H10 | Dead code and placeholder migrations; `RELEASING.md` lacks a migration step. | P2 |

## 7. The plan

Order of phases is by **risk → trust → participation loop → everything else**. Sizes: S ≤ 1 day, M 2–4 days, L 1–2 weeks of agent work including tests and docs. Every step follows the working method in Section 8. Dependencies are noted; otherwise phases may overlap.

### Phase 0 — Trust and safety hotfix (start immediately; production deploy needs the owner's go)
| Step | What | Acceptance | Size |
| --- | --- | --- | --- |
| 0.1 | **Protect privileged profile columns.** BEFORE UPDATE trigger (or column-level privileges) that rejects changes to role, permission arrays, verified/admin/civic flags, system-agent flag and official ids unless the caller has `role.assign`/`settings.manage` or is the service role; staff changes go through the existing admin RPCs. | SQL test: member updating own `role` fails; admin succeeds; existing admin flows pass; RLS harness added. | M |
| 0.2 | **Lock verification cases.** Owner may only create and edit draft/submitted content fields; `status` and decision fields change only through review RPCs by reviewers; projection trigger unchanged. | SQL test: self-approve fails; steward approve works. | S |
| 0.3 | **Close the account-switch hole.** Linking requires proof of control: Register creates the business account server-side for the caller; Connect requires a fresh sign-in of the target (server verifies a token for that user) or an approved access request from the target's owner; `linked-account-switch` accepts only rows created through those paths (e.g. `verified_at` set by the function). Remove `create-linked-business-account`. Audit existing rows (2 on production). | SQL + function tests: insert without proof rejected; switch refused for unverified rows; owner switch works. | M |
| 0.4 | **Profile privacy.** Replace the public `profiles` SELECT with a `public_profiles` view (name, username, avatar, country, score-safe fields, badges) for anon/other members; owner and staff read the full row; `UserProfile`, search and directory read the view. Restrict `resolve_login_email` to the auth flow (service-side) or return only a boolean. | Anon query of `profiles` returns no identity fields; sign-in by username/phone still works; e2e login spec. | M |
| 0.5 | **Stories ingest.** Grant `ingest_development_story` only to service role and the official Civizen org account; Home shows Stories as "Development log" with that source label. | Member call rejected. | S |
| 0.6 | **Eligibility snapshots** writable only by server functions; reads unchanged. | SQL test. | S |
| 0.7 | **Call signalling** on per-conversation private channels authorized by membership; add TURN (self-hosted coturn or provider) with credentials from an edge function. | Two accounts in different conversations do not receive each other's signals; call connects across NAT in a manual test. | M |
| 0.8 | **Ship.** Backup, apply migrations to production in order, deploy edge functions, release v0.1.202 production-by-default, verify live with the QA accounts; record in the audit doc §6 and here. Add "database migrations" to `RELEASING.md`. | Live checks pass; `RELEASING.md` updated. | S |

### Phase 1 — Honest surfaces and dead ends (week 1)
| Step | What | Size |
| --- | --- | --- |
| 1.1 | Study: remove Tests and Schedules tabs and the "Specialist Council" route until content exists; keep Constitution and Law; label the constitution as the superseded draft and link the Community Governance Charter as the current text. | S |
| 1.2 | Market: remove Saved/Filters/category/Local/For you placeholders; show listing descriptions and a detail view; rename "Products sold" to "Agreements signed"; remove the dollar icon; fix "Levela/Lumens" text in generated agreements. | M |
| 1.3 | Home: remove the "Favourite" tab; translate tabs; label Stories as the development log. | S |
| 1.4 | Fix broken routes and links: `/report/user/:id` (reuse the messaging report flow), `/endorse/select` → `/search?tab=people`, Request-verification → `/settings/profile`, Request-endorsement label. | S |
| 1.5 | Public pages: guest-aware CTAs (hide "Create agreement" for guests; "Contribute" explains sign-in first); `/terms` on the public shell; 404 with chrome; `/features` public redirect; closed consultations show the outcome to guests. | S |
| 1.6 | Production demo content: mark the three seeded programs and challenges as "Demo" with a badge and filter, or remove them (owner decision D5). | S |
| 1.7 | Legacy governance tools: remove `/governance/tools` and `/governance/tools/steward` from member navigation and gate the routes by steward permissions; keep the steward console; fix the Tools tab permission check. | S |
| 1.8 | Documentation drift: correct the design doc "Built" markers, audit progress log, funding README figures, governance README URLs, cheat sheet (Agreements, Earnings), integration guide routes; regenerate Civi knowledge. | S |

### Phase 2 — One participation loop, end to end (weeks 2–4)
Goal: a newcomer signs up, finds a public Matter or raises one, discusses, supports a proposal, votes, sees the outcome return to the Matter, and is notified at each step. Depends on Phase 0.
| Step | What | Size |
| --- | --- | --- |
| 2.1 | **Public Matters.** Public and organization-wide Matters appear in a browsable, searchable list with Area and scope filters; "Community" as an addressee (the official Civizen organization) so a member can raise a Matter without naming a person; region and city scope sent. | M |
| 2.2 | **Outcome returns to the Matter.** When a consultation closes, write the outcome into the Matter as a decision event, open a follow-up action for the responsible party, and show the vote result on the Matter; a proposal drafted from a participants-only Matter makes the Matter public or warns the author. | M |
| 2.3 | **One Governance surface.** `/governance` for signed-in members = Open votes · My votes · Proposals · Results · Tools (permission-gated); hub and catalog stay the public view; remove the duplicate entry points (Home "Add suggestion" goes to Matter create); one chrome. | M |
| 2.4 | **Eligibility policy (owner decision D2).** Default recommended: consultations stay open to every signed-in member, but countable ballots require a verified identity, unverified ballots are shown separately as advisory, and publishing a proposal requires the author to be verified and the threshold to exclude the author. Implement server-side; show prerequisite reasons; one account per verified identity enforced through the verification case (duplicate check on ID hash). | M |
| 2.5 | **Notifications for the loop.** Vote opened, closes in 7 days/24 hours, result published, Matter comment/mention/action due, agreement to sign; message text from i18n keys, not SQL; email digest optional per member. | M |
| 2.6 | **Return path everywhere.** Sign-in and sign-up keep the return path for Matters, proposals and agreements, not only ballots; resend confirmation email; phone sign-up either gets SMS OTP or is disabled (owner decision D8). | S |
| 2.7 | **Proposal hygiene.** Drafts editable until first support; settings frozen after support starts; threshold cannot be lowered; cancel/withdraw and certify states; approval and ranked outcomes set `passed`. | M |
| 2.8 | **Civi knows the loop.** Catalog cards and HY/RU answers for "raise a matter", "where are public matters", "what happens after the vote"; Civi can open the relevant page. | S |
| 2.9 | **E2E suite** for the loop: sign-up → Matter → proposal → support → ballot → close tick → outcome on Matter → notification (Playwright on the local stack). | M |

### Phase 3 — Identity and status layers done right (weeks 4–6)
| Step | What | Size |
| --- | --- | --- |
| 3.1 | Citizenship automation: 30 days verified → citizen; 14 days with explicit acceptance; status badges separate; server-side job. | M |
| 3.2 | Eligibility service in the database (`is_eligible(profile, scope)`) used by consultations, proposals and the workspace; retire browser-side eligibility and the legacy endorsement score as a gate; one Score. | M |
| 3.3 | Verification queue for domain reviewers (identity_verification domain) with assignment, notes, and decision RPCs; duplicate check; revoke flow; verify toggle in Users admin removed or logged as emergency override with reason. | M |
| 3.4 | Founder as office: founder role loses blanket permissions in favour of explicit baseline + office powers; only the office transfer RPC can change the founder holder; admins cannot assign `founder`. (Do not reduce bootstrap access without the owner's decision.) | M |
| 3.5 | Account lifecycle: change email and password; data export (JSON); deletion removes verification files, certificates and identity numbers, and transfers or deletes owned business accounts. | M |
| 3.6 | Business accounts: owner approval screen for access requests; explicit employer/seeker choice on Jobs; agreements created from a business session list the business as party; business accounts cannot cast ballots. | M |
| 3.7 | Public profile correctness: score shown to visitors from a server-computed snapshot; privacy settings that actually control visibility (name, country, score, endorsements). | M |

### Phase 4 — Contribute and Solutions consolidation (weeks 6–8)
| Step | What | Size |
| --- | --- | --- |
| 4.1 | One way to raise a problem: Matters is the entry; Solutions becomes a Matter mode ("AI council") and Challenges a Matter outcome ("community project"); cross-links and one shared vocabulary ("Solution Record"). | L |
| 4.2 | Impact page lists Matters, challenge proposals, knowledge resources and agreements; profile contributions ledger linked both ways. | M |
| 4.3 | Knowledge: members may propose resources and gaps; coordinator reviews; "Reviewed" means someone else reviewed. | M |
| 4.4 | Areas populated from real data: initiatives from Programs, Challenges and Matters tagged with the Area; Area pages list them; guest buttons guest-aware. | M |
| 4.5 | Matter agents: pass discussion, tasks and evidence as context; remove the force-failure hook and dev-prefilled form; coding agent hidden unless a runner is registered; supervisor picker matches backend rule. Solutions council: fix round cap, server-side trigger permission and rate limit, show failures, feed citizen comments to agents, verify model ids. | M |
| 4.6 | Attachments openable; tabs do what they say; errors surfaced; duplicate-Matter guard on upload failure. | S |

### Phase 5 — Study that teaches (weeks 8–10; owner decision D4)
| Step | What | Size |
| --- | --- | --- |
| 5.1 | Three real learning paths with progress recording: "The Civizen Charter and pathway", "How Civizen decides" (voting, proposals, eligibility), "Your rights and duties as a member" — EN/HY/RU, written from the canonical docs. | L |
| 5.2 | Progress and completion stored per member; completion shown on profile; optional short knowledge checks only when written by a person (no fake tests). | M |
| 5.3 | Law library and constitution texts: translation plan, source links, current-document labels. | M |
| 5.4 | Remove or rebuild Specialists as a real Civi mode with declared sources. | S |

### Phase 6 — Economic cooperation, honest and useful (weeks 10–12; owner decision D3)
| Step | What | Size |
| --- | --- | --- |
| 6.1 | Unify agreements: listing-based agreements use the collaboration document flow; party names in the list; notifications on create/sign; Earnings counts all signed agreements where you provide. | M |
| 6.2 | Market: listing edit, images, category and location fields, detail page, contact opens a conversation with the seller; jobs admin review screen; poster edit/withdraw. | L |
| 6.3 | Prototype credits: either remove the price requirement and the credits pages until a lawful settlement path exists, or keep one clearly labelled demonstration page; one route, one name. | S |
| 6.4 | Fund: notify the owner on new inquiries; move the transparency publish switch to the Sources ledger; retire the legacy ledger. | S |

### Phase 7 — Messaging, calls, Civi (weeks 12–14)
| Step | What | Size |
| --- | --- | --- |
| 7.1 | Attachments in encrypted chats (encrypt file keys); key backup/recovery phrase; multi-device. | L |
| 7.2 | Push notifications (Capacitor plugin + edge function) for messages, calls, votes and Matters; web push where supported. | L |
| 7.3 | Real group conversations (schema, membership, RLS) if the owner confirms the need. | L |
| 7.4 | Civi: member-data context under authorization (my votes, my matters, my agreements), page actions, server-side rate limiting, remove "Nela" remnants; split `chat-bar.tsx` under the 400-line rule. | M |

### Phase 8 — Languages and accessibility (continuous; milestone weeks 14–16)
| Step | What | Size |
| --- | --- | --- |
| 8.1 | Hand-written HY/RU for everything in the participation loop (sign-up, Home, Matters, proposals, ballots, notifications, profile, settings); translated SQL notification keys; constitution/charter/pathway in HY/RU. | L |
| 8.2 | Label machine-translated text; translate through a server function with caching instead of per-string browser requests; reduce the 233-language list to languages with a reviewer or label them "automatic". | M |
| 8.3 | Accessibility: axe tests on every primary page; keyboard paths for ballots and Matters; skip link check. | M |

### Phase 9 — Native and distribution (weeks 16–18; owner decision D7)
| Step | What | Size |
| --- | --- | --- |
| 9.1 | Signed release builds; checksum verification for in-app updates; real release notes from commits. | M |
| 9.2 | Google Play internal track alongside sideload; iOS project and TestFlight; biometric plugin registered or removed. | L |
| 9.3 | Web OTA layer per `OTA_UPDATES_PLAN.md`. | M |

### Phase 10 — Decentralization and public audit (program; starts after Phase 2)
| Step | What | Size |
| --- | --- | --- |
| 10.1 | Publish per-election Merkle commitments and a public inclusion check for receipts; events table viewable. | M |
| 10.2 | Signed governance events for proposals and ballots (citizen signing keys already in profiles); client shows proof status. | L |
| 10.3 | Anchor event batches through the existing public-audit anchoring machinery; external verifier mirrors read civic voting; reproducible client build. | L |
| 10.4 | Founder powers reduced by domain maturity per the thresholds doc; emergency actions threshold-gated; impersonation removed. | L |

### Phase 11 — Engineering hygiene (continuous)
Typed client in the remaining civic-voting files and Wellbeing types; delete dead code (`src/lib/deployment`, `did-manager`, `i18n.ts` duplicate, placeholder migrations, unused functions, `EndorseSelect`); RLS/permission test harness run in CI against the local stack; standards baseline to zero; Playwright to 10 specs; docs drift closed as each area ships.

## 8. Working method for every step

1. Read `memory-bank/activeContext.md`, `docs/04-operations/dev/AGENTS.md`, the area spec, and this document's row for the step.
2. `git status --short` must be clean or the dirty files must belong to the same step; never stage another session's files.
3. Browser writes only against the local stack; confirm `supabase.supabaseUrl` is local before any sign-up, vote or edit.
4. Defects start with a failing test (SQL test for policies and RPCs, Vitest for logic, Playwright for flows).
5. Implement to the rules in Section 2; keep files under 400 lines; typed client only.
6. `npm run typecheck && npm run lint && npm test`; `npm run verify:post-dev` for UI; `scripts/local-supabase/run-sql-tests.sh` for migrations.
7. Update the area spec, the feature registry, the Civi catalog/cheat sheet and `npm run assistant:knowledge` in the same change; update Section 10 here.
8. Commit by topic with conventional messages; push and release per `RELEASING.md` (production by default) after the owner's go for anything that touches the production database or edge functions.
9. Verify live with the QA accounts, record evidence in Section 10, and log the outcome, reason, docs and evidence to AyMe.

## 9. Decisions needed from the owner (recommended option first)

| Id | Decision | Recommended | Alternative |
| --- | --- | --- | --- |
| D1 | Apply the Phase 0 security hotfix to production as soon as it passes tests | **Yes, this week; backup first, release v0.1.202** | Wait for a bundle with Phase 1 |
| D2 | Who may cast countable ballots in ordinary consultations | **Everyone may vote; countable = verified identity; unverified shown as advisory; publishing requires a verified author** | Verified-only voting (smaller numbers, stronger claim) |
| D3 | Market and Luma positioning | **Market = Jobs + Agreements; remove Luma price requirement and credits pages until lawful settlement exists; one clearly labelled demonstration note** | Keep listings and credits as a labelled prototype |
| D4 | Study scope | **Three real learning paths with progress; no tests/schedules until written by people** | Keep shells as "coming soon" |
| D5 | Seeded demo programs in production | **Badge as Demo and hide from default lists** | Delete |
| D6 | Legacy governance proposal system | **Retire for members; keep steward console** | Rebuild server-side |
| D7 | iOS timing | **After Phase 2 (participation loop first)** | Start now in parallel |
| D8 | Phone sign-up | **Disable until SMS OTP exists** | Add SMS provider now |

## 10. Status tracker

| Step | Status | Evidence | Updated |
| --- | --- | --- | --- |
| Inventory and plan (this document) | done (owner review pending) | this file; production read-only checks 2026-10-07 | 2026-10-07 |
| 0.3 Close the account-switch hole | on production since 2026-10-08 (owner confirmation pending) | migration `20261007100000_linked_accounts_proof_of_control.sql` applied to production after backup `civizen-pre-linked-accounts-20261008-154742.dump`; `linked-account-switch` (established rows only) and `admin-impersonate-user` (kill switch) redeployed; web release v0.1.202; SQL test `linked_accounts_proof_of_control_test.sql` (18 checks); `create-linked-business-account` removed; production audit: 2 rows, both the founder's; spec `docs/04-operations/dev/business-accounts-linking.md` | 2026-10-08 |
| 0.1 Protect privileged profile columns | live on production (migration applied 2026-10-08 after backup `civizen-pre-phase0-hardening-20261008-234337.dump`; web v0.1.203) | migration `20261008120000_profiles_privileged_columns_guard.sql` (BEFORE INSERT/UPDATE guard; staff and server functions pass); SQL test `phase0_trust_hardening_test.sql` | 2026-10-08 |
| 0.2 Lock verification cases | live on production (2026-10-08, same backup) | migration `20261008120100_identity_verification_case_owner_lock.sql` (owner: draft → submitted only; reviewers unchanged); same SQL test | 2026-10-08 |
| 0.5 Stories ingest | grant + policy live on production (2026-10-08); "Development log" label pending with 1.3 | migration `20261008120300_development_story_ingest_privileged.sql`; member seed loop removed from the Home Stories hook; "Development log" label still to do with 1.3 | 2026-10-08 |
| 0.6 Eligibility snapshots | live on production (2026-10-08) | migration `20261008120200_governance_eligibility_snapshots_privileged_writes.sql`; client persists only for staff (`governance-eligibility-snapshots.ts`) | 2026-10-08 |
| 0.8 Ship | S3 shipped as v0.1.202 (sibling session); S1/S2/S6/S7 shipped as v0.1.203; `RELEASING.md` has the migration step | production post-check 2026-10-08: guard triggers present, ingest grants service_role only, snapshot policies admins only | 2026-10-08 |
| 0.4 Profile privacy (S4) | live on production: profile rows need a signed-in reader (migration `20261009090000_profiles_require_sign_in.sql`, applied 2026-10-09 after backup `civizen-pre-profiles-privacy-20261009-000239.dump`); guest surfaces keep their SECURITY DEFINER functions | SQL test `profiles_privacy_test.sql`; production post-check: anon REST read of profiles returns no rows, guest job-board RPC answers | 2026-10-09 |
| 0.4 Login lookup (S5) | username/phone sign-in runs through the `sign-in-with-identifier` edge function (deployed 2026-10-09, uniform refusal smoke-tested; web v0.1.204); the anonymous lookup RPC is revoked by `20261009090100_login_lookup_service_role_only.sql`, applied to production 2026-10-09 after Armen confirmed username sign-in works (backup `civizen-pre-login-lookup-revoke-20261009-093053.dump`); the client falls back to the legacy lookup only while the function is unreachable | unit tests `sign-in-with-identifier.test.ts` (7); local-stack logic check: lookup + password grant ok, wrong password refused, anon lookup denied | 2026-10-09 |
| 0.4 member-to-member identity fields | deferred to Phase 3.7 (privacy settings + private identity table); members still read other members' full rows through the shared table | | 2026-10-09 |
| 0.7 Call signalling (S8) | implemented, shipping as v0.1.205: private per-member inbox topics authorised by row-level security on realtime.messages (migrations `20261009100000`, `20261009100100`); `turn-credentials` edge function hands out relay credentials when an operator configures a TURN server; roster-less group calls removed from the UI | SQL test `call_signalling_inbox_test.sql` (6 checks), unit tests `call-signalling.test.ts` (8); spec `docs/04-operations/dev/messaging-calls.md` | 2026-10-09 |
| 1.1 Study honesty | shipped (v0.1.206) — Tests/Schedules/Courses/Specialists removed, routes return to Study, constitution labelled as the superseded draft | commit `feat(honesty)…` 2026-10-09; smoke list and vitest updated | 2026-10-09 |
| 1.2 Market honesty (D3) | shipped (v0.1.206) — Market is Jobs + Agreements; listings grid, categories, Saved, filters, taxonomy and prototype credits retired; retired routes redirect | commit `feat(market)…`; `Market.test.tsx` rewritten; nav spec noted | 2026-10-09 |
| 1.3 Home | shipped — Favourite tab removed, tabs translated, Stories → Development log, suggestion opens a Matter | same commit as 1.1 | 2026-10-09 |
| 1.4 Broken routes | shipped — endorse → People search, Request verification → profile settings, Report on a profile opens a real report dialog | `UserProfileActions`, `ReportUserDialog` | 2026-10-09 |
| 1.5 Public pages | shipped — 404 and Terms on the public shell, `/features` public redirect, closed consultations show the outcome to guests, Area CTAs send guests to sign in with a return path | same commit as 1.1; `Areas.test.tsx` guest case | 2026-10-09 |
| 1.6 Demo content (D5) | shipped (v0.1.206) — seeded programs and their items flagged `is_demo`, hidden from browse lists, badged on detail pages | migration `20261009110000_demo_content_flag.sql`; SQL test `demo_content_flag_test.sql` | 2026-10-09 |
| 1.7 Legacy governance tools (D6) | shipped — removed from member navigation; routes need `role.assign`/`settings.manage`; phantom `governance.manage` removed | same commit as 1.1 | 2026-10-09 |
| 1.8 Docs drift | shipped — design-doc feature table, funding READMEs, integration guide routes, pilot doc, Civi cheat sheet and catalog | this commit | 2026-10-09 |
| 2.4 Eligibility policy (D2) | shipped (v0.1.207) — unverified ballots stored as advisory (voter sees choice + receipt, public split shows them, promoted to countable on verification approval while open); author support excluded from proposal thresholds; member publish requires verified identity; one-account-per-identity duplicate check deferred to 3.3 | migration `20261009120000_consultation_verified_countable.sql`; SQL test `consultation_verified_countable_test.sql`; e2e `consultation-ballot.spec.ts` verified + advisory cases | 2026-10-09 |
| 2.6 (part) Phone sign-up (D8) | shipped (v0.1.207) — sign-up is email only; `signUp` rejects phone-only credentials; return path and resend-confirmation parts of 2.6 still open | `SignUp.tsx`, `AuthContext.signUp` | 2026-10-09 |
| 2.1 Public Matters | shipped (next release) — public Matters list is the Matters landing view with search, Area, country and type filters (`list_public_matters`); Community addressee button; Region and City scope with geo pickers | migration `20261009130000_public_matters_browse.sql`; SQL test `public_matters_browse_test.sql`; `Matters.test.tsx`, `MatterForm.test.tsx` | 2026-10-09 |
| 2.2 Outcome returns to the Matter | shipped (next release) — close tick writes a system event + Decision onto the Matter and opens an outcome follow-up for the responsible party; publishing from a non-public Matter makes it public with a warning beforehand | migration `20261009140000_consultation_outcome_to_matter.sql`; SQL test `consultation_outcome_to_matter_test.sql` | 2026-10-09 |
| 2.3 One Governance surface | shipped (next release) — `/governance` is the member page when signed in (Open votes · My votes · Proposals · Results · Tools) and the public landing for guests; `/governance/workspace` redirects; Settings, notifications, Civi and docs point to `/governance` | `GovernanceEntry.tsx`, `governance-member-model.test.ts` | 2026-10-09 |
| 2.5 Notifications for the loop | shipped (next release) — voting opened, closes in 7 days / 24 hours (non-voters only), result published (existing), new comment on a Matter you are part of, proposal withdrawn, agreement to sign (existing); text rendered from i18n keys (`notificationTypes.*`, EN/HY/RU) with stored English fallback; opt-in daily e-mail digest (Settings > Privacy) with the `notification-digest` edge function — sender needs the operator's SMTP env + cron (AyMe task) | migration `20261009150000_participation_loop_notifications.sql`; SQL test `participation_loop_notifications_test.sql`; `notification-text.test.ts` | 2026-10-09 |
| 2.6 Return path everywhere | shipped (next release) — public toolbar Sign in / Sign up carry the protected page a guest came from; resend confirmation e-mail on the sign-up success screen and on sign-in when the address is not confirmed; phone sign-up disabled (v0.1.207) | `PublicPageToolbar.tsx`, `Login.tsx`, `SignUp.tsx`, `AuthContext.resendSignUpConfirmation` | 2026-10-09 |
| 2.7 Proposal hygiene | shipped (next release) — settings freeze once another member supports; threshold cannot be lowered after opening; authors withdraw drafts (supporters told); custom-option, approval and ranked outcomes set `passed`; certify state deferred to Phase 4 | same migration; SQL test | 2026-10-09 |
| 2.8 Civi knows the loop | shipped (next release) — public Matters, raising a Matter for the community, Governance page tabs, what follows a vote (EN/HY/RU) | `faq-voting.ts` + HY/RU, `faq-1.ts`, `capabilities-1/2.ts`; `civi-governance-voting.test.ts` | 2026-10-09 |
| 2.9 E2E loop suite | shipped — Playwright: Matter for the community → proposal → support → publish → vote → close tick → outcome on the Matter → notifications | `e2e/participation-loop.spec.ts` (local stack) | 2026-10-09 |
| 3.1 Citizenship automation | shipped (next release) — verified members become citizens 30 days after verification, or 14 days after accepting the civic framework (Settings > Edit Profile > Civic status); daily job `citizenship_promotion_tick`; status separate from role; member notified | migration `20261010090000_identity_status_layers.sql`; SQL test `identity_status_layers_test.sql`; `CivicStatusCard.test.tsx` | 2026-10-09 |
| 3.2 Eligibility service | shipped (next release) — `is_eligible(profile, scope)` / `my_eligibility(scope)` for participate · vote_countable · propose · publish · governance (sanctions, verification, citizenship, business accounts); the election page reads governance eligibility from the server instead of a browser score gate; legacy Governance tools still use the client evaluator (retire with 3.4/10.4) | same migration | 2026-10-09 |
| 3.3 Verification queue | shipped (next release) — assign / decide / revoke RPCs with reviewer permission, duplicate-identity check on the ID document hash (case flagged, approval refused), member notifications, Users-admin toggle turned into a logged emergency override that requires a reason; direct review-row writes closed. Queue UI with assignment and notes stays on the steward console (follow-up) | same migration | 2026-10-09 |
| 3.6 (part) Business accounts cannot vote | shipped (next release) — `business_account` eligibility reason in the consultation rules and the eligibility service | same migration | 2026-10-09 |
| 3.4 Founder as office | owner decision pending (do not reduce bootstrap access without it) | | |
| 3.5 Account lifecycle | shipped (next release) — Settings > Account: change sign-in e-mail (confirmed by mail), change password after proving the current one, download all my data as JSON (`export_my_data`); deletion also removes verification artifacts/case/reviews, the member removes their identity files through the Storage API first, and solely-owned business accounts are closed (another owner keeps a shared one) | migration `20261010100000_account_lifecycle_and_profile_privacy.sql`; SQL test `account_lifecycle_privacy_test.sql`; `AccountSettings.tsx` | 2026-10-09 |
| 3.6 Business accounts | shipped — owner approval of access requests and the employer/seeker choice on Jobs already existed (verified); business sessions are the agreement party by construction (`current_profile_id` is the business profile); business accounts cannot cast ballots (batch A) | | 2026-10-09 |
| 3.7 Public profile correctness | shipped (next release) — privacy settings (country, city, score, endorsements) under Settings > Privacy; `public_profile` card honours them; owners' clients save a server score snapshot that visitors read instead of recomputing; the profile page hides the score card and endorsement grid when the owner says so. Sensitive profile columns (birth date, phone, place of birth) are still readable by signed-in members through the profiles table: column-level restriction is a follow-up (needs every `select('*')` on profiles revisited) | same migration; `public-profile-visibility.test.ts` | 2026-10-09 |
| 4.2 (part) Impact page | shipped (next release) — Impact also lists the Matters a member raised and the proposals they drafted; knowledge resources and a two-way profile ledger remain | `ImpactMattersAndProposals.tsx` | 2026-10-09 |
| 4.4 Areas from real data | shipped (next release) — Area pages list public, non-demo programs, challenges and public Matters tagged with the Area (`area_activity`, guests included, guest-aware links); curated initiatives stay | migration `20261010110000_area_activity.sql`; SQL test `area_activity_test.sql`; `area-activity.test.ts` | 2026-10-09 |
| 4.5 (part) Agent hygiene | shipped (next release) — dev-prefilled coding task and allowed paths removed; coding role offered only with `VITE_MATTER_CODING_RUNNER=1`; forced-failure hook removed from the execution function. Context passing (discussion, tasks, evidence), supervisor picker parity and the Solutions council fixes remain | `MatterAgentPanel.tsx`, `matter-agent-execute/index.ts` | 2026-10-09 |
| 4.6 Attachments, errors, duplicate guard | shipped (next release) — attachments open (signed URL for files, link for URLs); a failed upload after creation lands on the created Matter with a warning instead of a resubmit | `MatterDetailOverview.tsx`, `MatterForm.tsx` | 2026-10-09 |
| 4.1 (part) One way to raise a problem | shipped (next release) — a Solutions problem is also a public Matter addressed to the community and both pages link each other ("AI council discussion"); a community challenge can be started from a Matter (prefilled form, `source_matter_id`, Matter event) and the Matter lists its community projects. Remaining: folding Solutions and Challenges creation fully into the Matter form and the shared "Solution Record" vocabulary | migration `20261010120000_knowledge_proposals_and_solution_matters.sql`; SQL test `knowledge_proposals_solution_links_test.sql`; `matter-links.test.ts` | 2026-10-09 |
| 4.3 Knowledge proposals | shipped (next release) — any member who can read a space proposes a resource or reports a gap (drafts, coordinators notified, proposer sees own draft and is told when it goes live); "Reviewed" requires a reviewer other than the proposer | same migration; `KnowledgeProposalPanel.test.tsx` | 2026-10-09 |
| 4.2 (rest) Impact and ledger | shipped (next release) — Impact also lists the knowledge a member published or proposed and the agreements they are party to, and links to the contributions ledger; the ledger counts Matters raised and knowledge resources as contribution events and links back to Impact | `ImpactKnowledgeAndAgreements.tsx`, `civizen-contributions-civic-sources.test.ts` | 2026-10-09 |
| 4.5 (rest) Agents and council | shipped (next release) — Matter agents receive the discussion, tasks, decisions, evidence and activity the assignment allows (listed as sources on the artifact); the supervisor picker offers only people the assigner represents (backend rule). Solutions council: only the author or a steward can run it, one run at a time per problem and a daily cap per author, agents whose key is missing are left out and named on the page instead of filling the debate with placeholder proposals, consensus needs every answering agent, citizen comments reach the agents, a failed round leaves the problem open with a clear message, model ids fall through from a retired id to a current one (`gpt-4.1-mini`, `claude-haiku-5-5`). Production has a valid Gemini key only (operator task in AyMe) | `solutions-agent-council/index.ts`, `matter-agent-execute/index.ts`, `solutions-council-client.test.ts` | 2026-10-09 |
| 5.1 Three learning paths | shipped (next release) — "The Civizen Charter and pathway", "How Civizen decides" and "Your rights and duties as a member": five lessons each, written from the Mission Charter, the planetary citizenship pathway, the Community Governance Charter, the Civic Voting System Design and the Citizen Status Model; curated EN, HY and RU text; every reader lists its sources | `src/lib/study/learning-paths.ts`, `src/lib/study/paths/*`, `learning-paths.test.ts`; spec `docs/03-platform/product-design/study-learning-paths.md` | 2026-10-09 |
| 5.2 Progress and completion | shipped (next release) — each completed lesson is stored per member; the path certification is awarded by the server only when every lesson is done; completed paths show on the public profile. No knowledge checks until a person writes them (D4) | migration `20261010130000_learning_paths.sql`; SQL test `learning_paths_test.sql` | 2026-10-09 |
| 5.3 Law library labels | shipped (next release) — every catalog instrument links to its official text (UN, OHCHR, ICC, UNHCR); the Law page says plainly that summaries are Civizen's own, texts are in English and translations follow the languages plan; the constitution reader is labelled a research draft superseded by the Community Governance Charter | `law-catalog-sources.ts`, `Law.tsx`, `StudyCivicLearning.tsx` | 2026-10-09 |
| 5.4 Specialists | shipped (next release) — the keyword-matched persona council is removed from the code (orchestration, discussions, backend, feature catalog entry, Study section); `/study/specialists` redirects to Study. Database tables `specialist_discussion_sessions/turns` stay in place with no writer; drop them in a later schema cleanup once confirmed empty on production | commit | 2026-10-09 |
| 6.1 One agreement system | shipped (next release) — the legacy listing-agreement page (raw text, sign/cancel, JSON snapshot) is gone; every agreement opens in the collaboration document view; Earnings counts every agreement the member is party to and marks the ones where they provide (party role), with no credits or money; the list carries each party's profile and role. Production had zero agreements | migration `20261010140000_phase6_agreements_jobs_fund.sql`; `provider-earnings.test.ts` | 2026-10-09 |
| 6.2 (Jobs) Review and poster control | shipped (next release) — posters edit pay, city and notes and withdraw their own posting from the board; market managers (and settings/role admins) review every posting at Settings › Review Jobs postings with new / reviewing / contacted / closed / spam. Seeker names are shown as first name plus initial by the public list function (no username inference). Product listings stay retired (D3) | same migration; SQL test `phase6_jobs_fund_agreements_test.sql`; `MarketJobsAdmin.tsx` | 2026-10-09 |
| 6.3 Prototype credits | shipped (next release) — the last credits entry point (a Settings card pointing at a retired route) is removed; `prototype-credits.ts` remains only as a referenced library with no UI. One demonstration note lives on Earnings ("Civizen records agreements; it does not move money") | `Settings.tsx`, `Earnings.tsx` | 2026-10-09 |
| 6.4 Fund | shipped (next release) — a new inquiry notifies founders and admins (notification with a link to Funding › Interest); the transparency publish switch sits on the Funding Overview beside the Sources ledger; the legacy ledger, audit, compliance and contributors tabs are retired (pages removed, old paths land on Sources; tables stay for a later schema cleanup) | same migration; `FundingTransparencyPublishCard.tsx`, `admin-sections.test.ts` | 2026-10-09 |
| 4.1 (rest), 7.x–11 | planned | | |

Already shipped before this plan (for reference): sealed ballots with receipts and hash-chained events, approval and ranked ballots, server eligibility (sanctions, age, scope), hourly lifecycle tick with outcome, member-supported proposals, one member Governance workspace page, notification center, hand-written HY/RU for voting, error reporting hook, skip link, axe tests, Playwright ballot spec, typed client regeneration, landing consultation banner, production-by-default releases (voting audit §6).
