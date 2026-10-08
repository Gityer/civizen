# Active context

## Current focus

**Business-account linking needs proof of control (2026-10-08, S3 fix, not yet on production):** `linked_accounts` rows are created only by the owner+business session handshake (`begin_business_account_link` / `complete_business_account_link`) or by an established owner approving an access request (`review_business_account_access_request`, Approve/Decline in the Accounts menu); clients cannot insert. Switching, publisher rights and the Connect lookup honour only rows with `established_at`. `create-linked-business-account` is gone. Spec: `docs/04-operations/dev/business-accounts-linking.md`. Deploy = migration + copy `linked-account-switch` to the functions volume + web bundle.

**Product inventory + implementation plan (2026-10-07):** whole-app, per-user-type inventory with status, confirmed production security findings (S1 self-promotion via unrestricted `profiles` UPDATE, S2 self-approval of verification cases, S3 account takeover via `linked_accounts` insert + `linked-account-switch`, S4 anon-readable profiles, S5 anon `resolve_login_email`, S6 any member can upsert public Stories), production usage reality (31 profiles, 5 active/30d, 0 countable ballots, 0 listings/agreements), and the ordered plan (Phase 0 hotfix → honest surfaces → one participation loop → identity layers → consolidation → Study → economy → messaging → languages → native → decentralization). Single tracker: `docs/03-platform/product-design/product-inventory-and-implementation-plan-2026-10-07.md` (Section 10). Start new work from Section 7 in order; owner decisions D1–D8 in Section 9.

**Governance dashboard + local Supabase (2026-10-05):** `/governance/new` is a real member dashboard (open/closed proposals, weighted results, voting through the single path in `governance-voting-service.ts`) with a steward console (identity verifications, constitutional offices appoint/end on the real `constitutional_offices` table, read-only Policies tab that shows the rules the resolver actually applies). Reference: `docs/03-platform/civic-participation/governance-integration-guide.md`. Civizen now has its own isolated local Supabase (`scripts/local-supabase/`, `docs/04-operations/dev/local-supabase.md`); schema is complete, data is empty (production dump not yet available to agents). All legacy size-gate violations were split; the gate passes.

**Large-screen layout (2026-09-30):** Below `lg` (1024px) phone chrome is unchanged. From `lg` up: signed-in **AppSideNav** + **NavSecondaryDesktop** (phone bottom bar/arc only below `lg`); public header shows **PublicPrimaryNav** + Sign in / Join; public shell distinguishes **reading** vs **directory** widths; footer is a multi-column grid. Spec: `docs/04-operations/dev/large-screen-layout.md`. Tokens: `src/lib/responsive-layout.ts`.

**First public consultation (2026-09-30):** A Single World Citizenship (`single-world-citizenship`) is the first real global nonbinding consultation, published through Matter → voting proposal → `publish_voting_proposal`. Question: should humanity work toward establishing a single world citizenship, shared by all people regardless of nationality? Support does not create or grant citizenship. Shared land, currency, institutions, and standards stay off this ballot. Copy: `src/lib/civic-voting/single-world-citizenship.ts`. Record: `docs/01-governance/participation/civic-voting-system-design-v0.1.md` §12.

**Manual identity verification (2026-09-07):** Members verify only when needed (not at signup). Settings → Edit Profile uploads ID + face photo into `identity_verification_*`; stewards approve/reject from Steward Console. Private bucket `identity-verification`. Vendor liveness deferred. Spec: `docs/04-operations/dev/identity-verification-manual.md`. SQL: `20260907120000_identity_verification_storage.sql`.

**Consultation ballot withdrawal (2026-09-07):** Until close, ordinary nonbinding consultation voters can withdraw their effective ballot. Withdrawal sets `is_countable=false`, clears selection choice (keeps `prior_choice_hash` audit only), removes public directory listing, and drops the ballot from option tallies and country stats. Re-cast allowed before close. SQL: `20260907010000_withdraw_consultation_ballot.sql`. Verify: `node scripts/verify-consultation-withdraw.mjs`. Do not publish United World without explicit approval.

**Consultation public participation (2026-09-06):** Public consultation surfaces keep one effective private ballot. Public APIs expose aggregate option counts, country-of-residence participant stats with small-cell suppression (25 / 5), and an optional consented directory (display name + country only; withdraw anytime). No emails, internal IDs, device/IP, or individual choices in public RPCs. SQL: `20260906210000_consultation_public_participation.sql`, `20260906210100_fix_civic_ballots_owner_rls.sql`. Verify: `node scripts/verify-consultation-participation.mjs`. Do not publish United World without explicit approval.

**Matter geographic scope (2026-09-06):** Area remains subject/domain taxonomy (optional). Geographic scope is a separate Matter field (`scope_kind` + country/region/locality codes), default **Global**, no country/region/city required for global. Voting proposals inherit Matter scope on draft; publish still authorized-only. Hub keeps global contests visible under local country filters. SQL: `20260906201000_matter_geographic_scope.sql`. Form: `/contribute/matters/new` Geographic scope. Verify: `node scripts/verify-matter-geographic-scope.mjs`.

**United World voting workflow (2026-09-06):** Matter → voting proposal draft → authorized publish → ordinary nonbinding consultation ballot. Not auto-seeded. Routes: `/governance/voting` (Proposals + Elections; History beside each), `/governance/voting/proposals/:id`, `/governance/voting/:electionId`. Publish = founder/admin/system. Draft from Matter = initiator/responsible or those roles. Cast Support/Oppose/Abstain with change-until-close; public tallies exclude demos. Neutral public copy (no “citizens of humanity”). SQL: `20260906195000_civic_voting_proposals_workflow.sql`, `20260906195100_fix_cast_consultation_ballot.sql`.

**Home post formatting + author editing (2026-09-02):** Home composer reuses the Agreement `contentEditable` / `execCommand` stack with a restrained social toolbar (Bold · Italic · Underline · lists · Line spacing: Tight / Default / Relaxed). Authorized authors may edit ordinary published posts indefinitely. Previous wording is stored in `post_revisions`. Formal civic records are a later, separate rule. Spec: `docs/04-operations/dev/home-post-formatting.md`. Gates: `verify:home-post-format`, `verify:post-edit`.

**Matter Collaboration Phase 4B1 — Controlled Coding Agent (2026-09-02):** Coding Agent is a Phase 4A `ai_agents` role (`coding`). After plan approval, a live model (Gemini; fake adapter in tests) inspects/edits through the trusted isolated git worktree runner (`scripts/matter-coding-agent-execute.ts`). Allowlisted repo `maturehumanity/civizen`. Path/command policy remains the execution boundary — the model has no unrestricted host/shell access. `request_changes` re-runs inside the original authorization. `code_change` evidence includes diff, truthful PASS/FAIL/NOT RUN, and provenance that the Phase 4B1 SQL migration was already applied remotely; the agent must not apply it again. No commit/push/deploy. Gate: `verify:matters-coding-detail`.

**Matter Collaboration Phase 4A activation (2026-09-02):** Self-hosted deploy of `matter-agent-execute` to `volumes/functions` on `soc.yeremyan.net`; provider-backed Gemini E2E via `verify:matter-agent-activation`; live auth negatives via `verify:matter-agent-auth`. Shipped on `main` at `9a30d90`.

**Matter Collaboration Phase 4A stabilization (2026-09-02):** Fixed Phase 3 regression in `get_matter()` (restored `resolutions` + Phase 3 bundle fields). Added `authorize_matter_agent_run`, `adopt_matter_agent_plan_task`, plan Task adoption + facilitation Decision promotion UX (`MatterAgentArtifactCard`). Edge function auth model A (user JWT → authorize → service execution). Gates: `verify:matter-agent-auth`, `verify:matters-ai-detail` (18 states).

**CI pre-push gate (2026-09-01):** Today’s red CI runs were stale assistant knowledge (`knowledge-pack.ts` / `nela-bundle.js`) and npm audit advisories — fixed on `27c2f80`, but the pattern was push-first, fix-after. Added `npm run verify:pre-push` (local mirror of GitHub CI) as a mandatory step **before** every push; `verify:ci` remains mandatory **after** push.

**Matter Collaboration Phase 3 — Resolution, Evaluation, Escalation & Accountability (2026-09-01):** Shipped on `main`. Formal Resolution records with multi-cycle history; initiator `review_resolution`; separate responsible vs initiator positions; partial resolution (continue or `FOLLOW_UP_TO`); evaluations; outcome follow-up; escalation policy binding on Action Requirements; idempotent escalation execution; `matter_find_stalled()` diagnostic; Resolution/Outcome UX; action-queue context badges; gate `verify:matters-resolution-detail` (13 states). SQL: `20260901160000_matter_resolution_phase3.sql`, `20260901170000_matter_resolution_phase3_stabilization.sql`.

**Matter Collaboration Phase 2 stabilization (2026-09-01):** Ordinary `complete_matter_collaborative_work` cannot finish while required Tasks are non-terminal (Completed and Cancelled only; Declined is outstanding until the Lead reassigns, cancels, replaces, or waives). **Complete with outstanding work** is an explicit Lead path with a reason and a distinct event; Task statuses are not auto-completed. Shared responsibility is a timed request (`shared_responsibility_response`); invite-to-collaborate does not auto-accept a Responsible Collaborator. Task decline and suggested-reassignment reasons are stored on the assignment and in event payload `reason`. Lead self-accept of a Decision remains the current default only where that Lead has Matter decision authority — not a future-universal rule. SQL: `20260901140000_matter_collaborative_work_stabilization.sql`. Gate: `verify:matters-work-detail`.

**Matter Collaboration Phase 2 — Collaborative Work (2026-09-01):** Optional **Start collaborative work** on a Matter that needs execution. Generic `collaboration_tasks` + assignments, Decision records, and Matter responsibilities. Task/Decision clocks reuse `matter_action_requirements` (`context_kind`/`context_id`) so several actions can be pending at once. Completing a Task never resolves the Matter. Work complete returns to Phase 1 `address` → initiator confirmation. Simple Questions stay conversational. Spec: `docs/04-operations/dev/matter-collaboration.md`. SQL: `20260901120000_matter_collaborative_work.sql`. Gate: `verify:matters-work-detail`.

**Matter Collaboration stabilization (2026-08-31):** `list_matters` is read-only. Timeouts run only through `process_matter_action_timeouts` (pg_cron `matter_action_timeout_tick` at minute 15, or `scripts/db/run-matter-timeout-tick.sh`). Question comments are not final answers. Suggest Improvements is a Suggestion Matter shortcut. Live check 2026-09-01: `anon` / `authenticated` / `PUBLIC` cannot CREATE on schema `public`, so `SECURITY DEFINER` `search_path = public` does not allow application-user shadowing. Spec: `docs/04-operations/dev/matter-collaboration.md`. SQL: `20260831010000_matter_collaboration_system.sql`, `20260831200000_matter_collaboration_stabilization.sql`.

**Matter Collaboration Phase 1 (2026-08-31):** Generic Matter under Contribute > Questions, Issues & Ideas (`/contribute/matters`). Not a separate Issues module. Action Requirements carry operational state; comments are not formal actions; auto-close is not initiator confirmation.

**Sibling business accounts stay listed (2026-09-01):** While signed into one organization, other organizations of the same personal owner remain in Accounts. RLS previously only returned the current profile’s own `linked_accounts` row, so Civizen disappeared after switching into Healthy Vending Mart LLC. Live `linked-account-switch` previously rejected sibling hops (`Target account is not linked`); the deployed function now allows them, and a stale stored session falls back to that function. Accounts cards sit side-by-side with the current account centered; swipe or scroll the strip, and tap a card to switch (a swipe must not swallow the following tap). Add business looks up an existing company as you type and offers Connect instead of Register.

**Multiple linked business accounts (2026-08-31):** A member may link more than one organization. The original unique index on `linked_accounts.owner_profile_id` (`idx_linked_accounts_owner_business_unique`) was a first-version shortcut, not a product rule. It blocked a second org (for example Healthy Vending Mart LLC) from appearing in Accounts while Civizen was already linked. Migration `20260831120000_allow_multiple_linked_business_accounts.sql` drops that index. Pair uniqueness and global business-name uniqueness remain. Do not auto-link existing unlinked org users.

**Launch post reorganization (2026-08-17):** Civizen launch stays canonical; Armen’s Aug founder post is linked as Repost with thoughts (`post_reposts`). War/peace post author reassigned Armen → Civizen (same row). Armen’s war reflection is **prepared draft only** (composer prefill when Armen opens Repost with thoughts on that post) — not auto-published. Embed preview uses ~2–4 lines. Spec: `docs/04-operations/dev/home-repost-editorial.md`. SQL: `20260818030000_reorganize_launch_repost_relationships.sql`.

**Home Repost + sharing flow (2026-08-17):** Action bar is Like · Comment · Repost · Publish to…. Repost menu offers plain repost and Repost with thoughts (commentary post + embedded original). Schema `post_reposts` stores relationships (no content copy). Gate: `verify:post-reposts`.

**Post likes RLS fix (2026-08-17):** “Could not save like” was RLS, not a missing permission. Live policies bound unqualified `user_id` to `profiles.user_id` → `profiles.id = profiles.user_id`. Fixed migration `20260818010000_fix_post_likes_rls_user_id_binding.sql` (applied remote). Gate: `verify:post-likes-rls` in `verify:post-dev`. Home rolls back optimistic Liked state on failure.

**Live + Testing v0.1.194 (2026-08-16):** Build 196 (`20260816-v0.1.194`) published to Testing and Live. Employer Jobs sentences look for a person (no arrangement word “job”). The place token country flag sits on the text line.

**Live + Testing v0.1.193 (2026-08-16):** Build 195 (`20260816-v0.1.193`) published to Testing and Live. Public Market Jobs title is Marketplace / Jobs. Signed-in members can unfold More for days, hours, languages, and notes. Secondary sentence tokens stay dimmer than job type, place, and pay.

**Live + Testing v0.1.192 (2026-08-16):** Build 194 (`20260816-v0.1.192`) published to Testing and Live. Public Market Jobs sentence auto-fills city/region/country, shows indicative minimum pay for the rotating job type, and includes Full-time, level, arrangement, and start. `/jobs` stays public.

**Live + Testing v0.1.191 (2026-08-16):** Build 193 (`20260816-v0.1.191`) published to Testing and Live. Public Civi chat tails sit on the top outer corner (top-left for Civi, top-right for the visitor), only on the first message in a same-sender run.

**Live + Testing v0.1.190 build 192 with WhatsApp Web side-hook tails.**

**Public Civi peace aim (2026-08-16):** “How can we stop wars?” is in scope. The reply leads with uniting around shared human responsibility (founding docs), then ordinary linked sentences: signing up, make a contribution, Study, Community Challenges, Opportunities, Governance. Not “learn in Study”. How-questions do not start with Yes. Canonical reply: `src/lib/assistant/peace.ts`.

**Civi knowledge on every change (2026-08-16):** New or changed user-facing surfaces, flows, and public mission copy update the cheat sheet and catalog in the same session, then `npm run assistant:knowledge`. Knowledge regen indexes live nav, Contribute lanes, and Civi page links. Philosophy of Mature Humanity is in the indexed sources. Why Civizen Exists is a catalog capability.

**Public Civi widget resize (2026-08-16):** Hover the top or left edge for a rounded grip. Drag the top to change height only, the left to change width only, or the rounded corner for both. The last question and its answer stay in view when they fit. Chat tails match WhatsApp: top-left for Civi, top-right for the visitor, only on the first message in a same-sender run. LANGUAGE_PACK_VERSION 208.

**Public Civi resize, hidden scrollbar, peace answers (2026-08-16):** Public Civi answers peace/hardship from this build before calling the live model. The thread scrolls without a visible scrollbar.

**Civi personal hardship (2026-08-16):** “I'm homeless, can you help me?” must not be answered as Contribute / Volunteer routing. Civi acknowledges the situation, is honest that Civizen is not a shelter or emergency service, points to local emergency services / 211, and may mention Jobs (`Open Market > Jobs`). Community Challenges is not emergency housing. Canonical reply: `src/lib/assistant/hardship.ts`.

**Live + Testing v0.1.189 (2026-08-16):** Build 191 (`20260816-v0.1.189`) published to Testing and Live. Public Civi uses WhatsApp-style chat tails, rounded top/left resize grips, and a wars reply that leads with uniting around shared human responsibility.

**Live + Testing v0.1.188 (2026-08-16):** Build 190 (`20260816-v0.1.188`) published to Testing and Live. Public Civi answers “How can we stop wars?” from founding documents in ordinary sentences.

**Public Civi widget resize (2026-08-16):** Hover the top or left edge for a rounded grip. Drag the top to change height only, the left to change width only, or the rounded corner for both. The last question and its answer stay in view when they fit. LANGUAGE_PACK_VERSION 208.

**Public Civi resize, hidden scrollbar, peace answers (2026-08-16):** Public Civi answers peace/hardship from this build before calling the live model. The thread scrolls without a visible scrollbar.

**Civi personal hardship (2026-08-16):** “I'm homeless, can you help me?” must not be answered as Contribute / Volunteer routing. Civi acknowledges the situation, is honest that Civizen is not a shelter or emergency service, points to local emergency services / 211, and may mention Jobs (`Open Market > Jobs`). Community Challenges is not emergency housing. Canonical reply: `src/lib/assistant/hardship.ts`.

**Live + Testing v0.1.188 (2026-08-16):** Build 190 (`20260816-v0.1.188`) published to Testing and Live. Public Civi answers “How can we stop wars?” from founding documents in ordinary sentences.

**Live + Testing v0.1.187 (2026-08-16):** Build 189 (`20260816-v0.1.187`) published to Testing and Live. Peace answer still led with Yes; replaced by v0.1.188.

**Live + Testing v0.1.186 (2026-08-16):** Build 188 (`20260816-v0.1.186`) published to Testing and Live. Includes public Civi hardship-safe and peace answers, upper-left resize, and a hidden thread scrollbar.

**Civi checked memory + Settings > AI Agent (2026-08-16):** When Civi does not already have a good answer and uses Gemini, it checks that reply and may store it as Civi memory. Similar questions later are answered from memory instead of calling the model again. Identity, the capability registry, and the cheat sheet still win. Unverified Civizen product claims, personal records, and one-off drafts are not stored. Founders can review questions and replies at Settings > AI Agent during development (`/settings/ai-agent`; founder / admin / system only). LANGUAGE_PACK_VERSION 206.

**Live + Testing v0.1.185 (2026-08-16):** Build 187 (`20260816-v0.1.185`) published to Testing and Live. Includes Civi checked memory and Settings > AI Agent interaction history.

**Civi. Your AI Assistant (2026-08-16):** The name is **Civi. Your AI Assistant** (no longer “Civi (In-app assistant)”). Visitors can ask Civi about the project without registering — a Civi button sits at the lower right on public pages. Signed-in members still use Civi in Messaging. Public answers use project knowledge only (no personal records). LANGUAGE_PACK_VERSION 204.

**Public Market Jobs (2026-08-16):** `/market` is public. The Jobs section title is Marketplace / Jobs. The sentence fills city/region/country from the visitor’s location, shows indicative minimum pay for the rotating job type, and includes Full-time, level, arrangement, and start. Those extra dropdowns stay dimmer than job type, place, and pay. Employers omit the word “job” — they are looking for a person. Signed-in members can unfold More for preferred work days, hours, languages, and notes. LANGUAGE_PACK_VERSION 210.

**Live + Testing v0.1.184 (2026-08-16):** Build 186 (`20260816-v0.1.184`) published to Testing and Live. Includes public Civi (Civi. Your AI Assistant) so visitors can ask about the project without registering, plus Public Market Jobs.

**Live + Testing v0.1.183 (2026-08-16):** Build 185 (`20260816-v0.1.183`) published to Testing and Live. Includes adaptive Happiness check-in (feeling + areas on one page), Privacy from the Overview lock, and Improve only from the Improve tab.

**Happiness hub header (2026-08-16):** The Happiness first page has no Back chevron. The heart mark sits at the content inset without a circular background, using the same header gap as the title. The title row uses the same top offset and 40px height as Search and Profile. “This is private to you.” is a lock icon beside the current Happiness level on Overview; tap/click opens `/happiness/privacy`. Overview does not show a Privacy text link or an Improve an area button (Improve is the tab).

**Adaptive Happiness check-in (2026-08-16):** Check-in starts with today’s feeling and optional life areas on one page (compact chips). Helping vs making things harder, cause/support tags, and an optional note appear only after areas are chosen. Feeling-only save is one tap after choosing a feeling. Check in is available from Overview and from the Check-ins tab. Patterns on Overview name what within an area is affecting the member after several check-ins. LANGUAGE_PACK_VERSION 202.

**Happiness & Human Fulfillment consolidation (2026-08-15):** Phases 1–5 are one implemented capability. No Phase 6. Spec `happiness-human-fulfillment-v1.md` now leads with Implementation Status (implemented vs intentionally deferred). Member-facing copy no longer refers to development phases, model ids, or “tools being prepared.” Search maps Human Outcome Review to `/wellbeing-insights/outcome`; Work Fulfillment and Fulfillment Plans to their workspaces. Audit INSERT on outcome reviews requires the same scope viewer check as SELECT. Home Happiness shortcut and Work Fulfillment overview load latest snapshot fields only, not the full Happiness workspace. Public-safe lessons are signed-in member readable after publish, not anonymous internet-public. LANGUAGE_PACK_VERSION 200. Shipped in v0.1.182.

**Happiness Phase 5 — Human Outcome & System Learning Loop (2026-08-15):** Ready for acceptance on accepted Phases 1–4B. After a linked Challenge, Project, or Governance action, authorized coordinators open `/wellbeing-insights/outcome` to compare privacy-safe baseline and follow-up snapshots. Operational delivery stays distinct from human-outcome evidence. Comparison is `human-outcome-evidence-v1` / `human-outcome-compare-v1` (not causal). Public-safe lessons require an intentional publish step. Negative/null/insufficient results are preserved. Civi must not say a Project made people happier. SQL `20260815250000_human_outcome_reviews_phase5.sql`. Gate: `verify:human-outcome-loop`. Shipped in v0.1.182.

**Happiness Phase 4B — Institutional & Community Wellbeing Insights (2026-08-15):** Accepted. Authorized viewers open `/wellbeing-insights` (Overview · Patterns · Action) for privacy-safe group conditions — not an institutional Happiness Score or ranking. UI reads snapshots/candidates/`get_wellbeing_aggregate` only. Suppression is a calm unavailable state. Deliberate Challenge/Governance drafts carry aggregate evidence only (`autoPublish: false`). Civi gets safe aggregate context and cannot reconstruct suppressed results. SQL `20260815230000_wellbeing_insights_phase4b.sql`. Gate: `verify:wellbeing-insights`. Uncommitted.

**Happiness Phase 4A — Privacy-safe wellbeing intelligence (2026-08-15):** Accepted foundation. Trusted path: service_role `collect_wellbeing_structured_signals` → `generateWellbeingAggregateSnapshot` / `applyWellbeingAggregatePrivacy` → service_role `persist_wellbeing_aggregate_snapshot` (no historic rewrite) → viewer `getWellbeingAggregate` / `get_wellbeing_aggregate` (snapshots only; no raw observations). Happiness connected verify walks reset only the signed-in test member’s Happiness records first. Applied on `soc-yeremyan-net-agent` only (`20260815200000`, `20260815210000`, `20260815220000`). LANGUAGE_PACK_VERSION 197. Shipped in v0.1.182.

**Happiness Phase 3 — Fulfillment Plans (2026-08-15):** Improve is the home for private Fulfillment Plans (Exploring / Active / Paused / Completed / Stopped; qualitative progress only). Pause/Stop are not failure; Resume returns a paused plan to Active. Recommendations come from `fulfillment-library-v1` with explainable why. Feedback: Not relevant (permanent hide), Not now (current list only), Tried before (current hide + later rank), Save for later (discoverable). Same-member helpfulness uses cautious copy. Work Fulfillment domain delegates to `/happiness/work`. Actual employment uses **Marketplace → Jobs**; Contribute remains Contribution Fit / trials. Approved shareable Work Fit prefs may prefill Jobs; private Joy/diagnoses/notes never transfer. No Job Fit score. Civi gets a grounded Plan brief (what you said / observed / suggestions) + Messaging link. Follow-up timing is stored; notifications are not sent. Per-plan delete does not wipe check-ins or Work Fulfillment. LANGUAGE_PACK_VERSION 196.

**Market Jobs known-identity + outlined fields (2026-08-15):** Logged-in members no longer re-see Full name / Phone / Age on Market Jobs when those values already exist on the profile — the form still submits them. Visible text fields use `OutlinedField` (label on the upper-left border). Standing rule: AGENTS §3 Known-field use + Standard form fields; `.cursor/rules/form-fields.mdc`.

**Work Fulfillment Phase 2 (2026-08-15):** `/happiness/work` is the live Work Fulfillment workspace (Overview · Current · Joy · Fit · Improve). Current-work assessment, Work Joy Monitor, Fit profile (including environment, autonomy, and lifestyle), improve-current-work first with planned → in progress → completed, Contribute/Study/Opportunity handoff, and owner-only RLS. Several concurrent work contexts with one primary; Joy/assessment/patterns stay context-scoped. No public Work Fulfillment score. Happiness Phase 1 is accepted. LANGUAGE_PACK_VERSION 194.

**Happiness Home shortcut (2026-08-15):** The member Home Score card shows a compact Happiness state icon (no extra wording) immediately to the right of the tier label such as CONTRIBUTOR, using the same `gap-1.5` as View Score Details from the score value. The control matches that details chip: `h-7 w-7` circular bordered button, lucide-style face mark inside (five-state mouth curve; unassessed has no mouth). It is not part of Civizen Score. Compact hover tooltip: title + level (or “Not assessed yet”). Tap opens `/happiness`. Happiness mobile tabs: Overview · Life areas · Check-ins · Trends · Improve. The Happiness page title uses `SlowRunningText` only when it cannot fit on one line. “This is private to you.” is a lock icon beside the title (hover/tap), not a subtitle. LANGUAGE_PACK_VERSION 191.

**Happiness & Human Fulfillment Phase 1 (2026-08-15):** Private `/happiness` workspace. Five levels (Struggling · Unsettled · Balanced · Flourishing · Thriving) — no numeric Happiness Score. Quick check-in, weekly pulse, monthly review, causes, improvement actions, follow-up, privacy controls. Work Fulfillment remains a distinct subunit at `/happiness/work` (Phase 2 live). Happiness data is owner-only RLS and is not connected to Civizen Score, reputation, hiring, or governance power. LANGUAGE_PACK_VERSION 188.

**Canonical provenance inheritance (2026-08-13):** When a non-persisted reconstructed cluster is a duplicate or same-outcome overlap of a persisted canonical root, qualifying human provenance is inherited onto that root. The 47 non-persisted clusters are not minted. Strong product-path identity is required; merely related overlap, implementation-insufficient, attribution-insufficient, and bootstrap clusters do not transfer. Of 18 contribution-bearing messages stranded on non-persisted clusters, **0** met that bar (12 merely-related overlap, 2 implementation-insufficient, 4 attribution-insufficient). 6 no-outcome messages stay journal-only. Deduped by story ID. Live capture should set `outcomeRootId` from the start; historical reconstruction is fallback. Score V2 formulas and human-substance constants unchanged. Root count stays 87. Substance/observation unchanged.

**Score ring visual restore (2026-08-13):** Restored the Profile Civizen Score ring **presentation** to committed `HEAD` `src/pages/Profile.tsx` (the last working inlined geometry immediately before the uncommitted refinement pass). Recovered: `CORNER_RADIUS`/`NAME_RADIUS` seats, name-length icon sizing, `fill-primary/20` selected wedges, halo stroke 3.5 / weight 650·700, inner ring 176/19, photo `8.5rem` `border-4`, `mt-4`, no inner category-color ticks. Current Score V2 numbers still feed the ring. Center stays a rounded percent (`61%`); header keeps the precise value (`61.0`). `Profile.score-dial.test.tsx` and `verify:profile-score-dial` remain. Profile does not reference `CONTENT_RADIUS`.

**Score ring crash recovery (2026-08-13):** `/profile` crashed with `CONTENT_RADIUS is not defined` because Profile still referenced that identifier after the geometry extract dropped the import. Vitest `Profile.score-dial.test.tsx` waits for the dial (not the Loading shell). `verify:profile-score-dial` is in `verify:post-dev`.

**Human contribution provenance integrity (2026-08-13):** Audit of 133 reconstructed qualifying clusters vs 87 persisted roots: 86 historical matches + 1 live `outcome:operational-contribution-lifecycle` (not a git cluster; remains legitimate). 47 non-persisted clusters are overlapping/duplicate/insufficient, not suppressed product outcomes. Ambiguous chat is trace-only. Founder status does not create substance. Reconstruction `historical-reconstruction-v1.2`. LANGUAGE_PACK_VERSION 185.

**Score ring visual polish (superseded 2026-08-13):** The uncommitted shared-radius refinement (`civizen-score-dial-geometry.ts`, end-aligned values, inner category ticks, muted selected fill) was reverted visually. Presentation is again the committed inlined dial in `HEAD` `Profile.tsx`. Score data and runtime dial tests were kept.

**Human contribution substance (2026-08-13):** Contribution is determined by meaningful human input, judgment, effort, responsibility, and resulting value — not by whether work was done manually or through AI. A prompt is normally provenance. The scoreable unit remains one coherent Contribution Record. `human-contribution-substance-v1` assesses origination, decision responsibility, judgment, iterative control, specification depth, validation/acceptance, direct implementation, and outcome influence. Execution method (`manual` / `AI-assisted` / `mixed`) is separate from human role. Trivial cosmetic prompts are not standalone contributions. Prompt count and prompt length do not increase reputation. Effort/time may be recorded but is not hours × score. Human substance stays distinct from realized impact. Evaluation model is `contribution-evaluation-v3`. Historical reconstruction `v1.1` enriches human roles on existing roots. Agreements capability is a test fixture only — not a manually awarded production contribution. Score V2 formulas unchanged. LANGUAGE_PACK_VERSION 184.

**Agreements sentence dates (2026-08-13):** Agreement dates read as prose (**Aug 13, 2026**). Hover or tap opens a compact Apple-style calendar to change them. The calendar is kept inside the visible viewport (shifts left / opens above when needed). LANGUAGE_PACK_VERSION 179.

**Agreements party-role italics (2026-08-13):** In Agreement prose, labels such as *the Client* or *the Employer* are italic so party names stay visually primary. Roles stay inline-editable; italics remain after rename. Headings and other Agreement text are not italicized. LANGUAGE_PACK_VERSION 179.

**Agreements create-screen refinement (2026-08-13):** Document-first create keeps **Agreement on** + editable subject. New drafts prefill today’s local start date and the same calendar date one year later (Feb 29 → Feb 28). Ending condition is one in-document choice (specific date / until completed / ongoing / until terminated). Required placeholders name the action needed. Service vs contribution party roles differ (Client / Service Provider vs Organization / Project / Contributor). **Your reference** is the optional user/org number; Civizen AGR is still assigned on first signature. Create validates required facts in the document. Optional Add terms sections can be removed. Service heading default remains **Service Provision**. LANGUAGE_PACK_VERSION 179.

**Agreements dual numbering (2026-08-13):** Party/custom reference on the right of the type heading (default service-provider initials or organization abbreviation; editable or blank). Civizen **AGR-YYYY-NNNN** assigned on first signature, immutable, small type lower-right. Page title is **Agreement on**; hover/tap opens the same type menu as the list `+`. Service / Contribution headings are **Service Provision** and **Contribution**. LANGUAGE_PACK_VERSION 179.

**Civi avatar in place (2026-08-13):** Civi’s face in Messaging is **Civic C** by default (`public/avatars/civi-option-c.svg`). Hover (or tap / press-and-hold) shows only **Gather** and **Companion**; choosing one replaces the avatar everywhere in Messaging and persists locally. LANGUAGE_PACK_VERSION 176.

**Civi (in-app assistant) (2026-08-13):** The built-in Messaging assistant is named **Civi** (formerly Nela). Same system profile id (`a0000000-0000-4000-8000-000000000001`). Inbox label is **Civi (In-app assistant)**. LANGUAGE_PACK_VERSION 174.

**Messaging thread policy (2026-08-13):** Civi chats stay fully clearable. Person-to-person threads use **Hide chat** (inbox only; peer keeps their copy) instead of shared delete. Disappearing messages is a mutual conversation setting, visible in the thread, applying going forward — not a device-only localStorage filter. Edit and unsend are one minute, with **Edited** kept. Searching people asks for phone-contacts permission and offers **Invite** for numbers not on Civizen. LANGUAGE_PACK_VERSION 174.

**Civi canonical identity (2026-08-13):** `docs/assistant/civizen-identity.md` is the first-class source for what Civizen is. Identity / purpose / one-sentence questions use that definition. “What can I do right now?” uses the capability registry. Feature docs must not redefine the identity.

**Live + Testing v0.1.181 (2026-08-13):** Build 183 (`20260813-v0.1.181`) published to Testing and Live. Includes Agreements refinements, Civi, messaging thread policy, and contribution provenance integrity.

**Live + Testing v0.1.180 (2026-08-13):** Build 182 (`20260813-v0.1.180`) published to Testing and Live. Includes the Agreements workspace, contribution lifecycle/ledger, and Civi project-aware chat.

**Civi answer shape (2026-08-13):** Match the question. **Can I / Does Civizen** starts with Yes or No, then the path. **How / Where** starts with the path (`Open Market > Agreements`). Same FAQ body; the opener is chosen from the member’s wording.

**Civi selectable type links (2026-08-13):** Agreement type names in Civi’s main answer (General, Partnership / Collaboration, Employment, and the rest) are tappable and open New agreement for that type. Extra notes stay unlinked so a caveat like “Sale / Purchase Agreement” is not treated as a create shortcut.

**Civi extra detail tone (2026-08-13):** In Civi replies, the action stays full size. Extra notes (after a blank line, or a “Supported types…” caveat) render smaller and muted.

**Civi directions (2026-08-13):** Civi tells members the visible path (`Open Market > Agreements`), not a URL alone. Those page names are tappable in chat.

**Messaging message wrap (2026-08-13):** Thread body text wraps on word boundaries (`overflow-wrap: break-word`, not `word-break: break-all`) so a leftover letter never sits alone on the next line. Long URLs can still wrap.

**Messaging message selection (2026-08-13):** In a thread, tap the message itself to select it. No checkboxes. Selection is the highlight + the “N selected” header actions. Long-press still enters selection on touch.

**Civi project-awareness knowledge system (2026-08-13):** Built-in assistant is internal-first. Conversation context → FAQ/cheat sheet → capability registry → project knowledge index → authorized member data → AI reasoning over that evidence → external API resources only when the request is actually about the outside world. Cheat sheet: `docs/assistant/civizen-assistant-cheatsheet.md`. Refresh with `npm run assistant:knowledge`. “Are you sure?” / “Positive?” re-verifies the previous Civizen claim (walking back past an off-topic refusal) instead of failing the scope gate. Deploy `messaging-agent-reply` + `nela-bundle.js` for live Messaging.

**Simple by default. Advanced by need. Always. (2026-08-13):** Standing product/design principle for all surfaces. Agreements: `+` beside the title; searchable type menu; Employment and Lease in the common list; unmatched search offers **+ Create “{name}”** as a custom type (not a global registry entry); **More agreement types…** last in the same menu; supported types open purpose-built Agreement documents with inline tokens; page header is **Agreement on** (hover/tap opens the type menu); party/custom reference sits on the right of the type heading (default initials/abbreviation; editable or blank); Civizen **AGR-YYYY-NNNN** is assigned on first signature and shown small at the lower right; document heading is hover-selectable (**Service Provision** / **Contribution**; Lease includes **Car lease** and other kinds) — hover shows only alternatives, click/tap renames in place; party roles sit in the sentence (`the Client`); Service Provider is offered on the Client role and swaps the other party to Client; click a sentence/paragraph to rewrite it; long fields grow with the text, accept Enter, and show a compact formatting bar. LANGUAGE_PACK_VERSION 178.

**Agreements formatting toolbar (2026-08-13):** While a long Agreement field is focused, the dark pill toolbar opens option menus on hover or tap (font family, color, 12/14/16/18/24, bulleted or numbered list, left/center/right/justify). Bold, italic, and underline stay direct toggles. Hover is not required — tap/click opens the same menu. LANGUAGE_PACK_VERSION 183.

**Agreements long-field formatting (2026-08-13):** Scope, names, and other agreement fields continue in the sentence and wrap at word boundaries, so a first name that fits the remaining line stays there (not as one unbreakable input box). Long fields grow with the text; Enter starts a new line. While a long field is focused, a dark pill toolbar offers font, color, size, lists, bold, italic, underline, and alignment. Empty placeholders such as **Select or enter party** stay the fill-in (primary) color. Party/custom numbering sits on the type line; the Civizen **AGR** code appears after the first signature. Formatted HTML is kept in compiled section bodies; PDFs and structured search fields use plain text. Click→focus→type covered in `AgreementCreate.test.tsx`. LANGUAGE_PACK_VERSION 183.

**Agreements platform capability (2026-08-13):** `/agreements` is the canonical workspace. Create is document-first: supported types (including Employment, distinct from Service / Contribution) open actual templates; the page header is **Agreement on** (hover/tap opens the same type menu as the list `+`); a party/custom reference sits on the right of the type heading (default service-provider initials or organization abbreviation; editable or blank); a Civizen **AGR-YYYY-NNNN** is assigned on the first signature and shown small at the lower right; the document heading and party roles look like prose — hover shows alternatives, click/tap renames; inline party/fact placeholders are short in the sentence (**Party**, **Employer**, **position**) with longer accessible names; unique directory parties bind automatically (Person/Organization only if the name is not in Civizen, or the user must pick among similarly named matches); Jobs prefill Employment; Sale / Purchase remains for negotiated terms only. Native e-sign + external/paper execution. Built on the existing `agreements` table. Spec: `docs/04-operations/dev/agreements.md`.

**Operational contribution lifecycle (2026-08-13):** Approved lifecycle/impact/evaluator/context models are now live product workflows. Later evidence attaches to an existing canonical root (`contribution_evidence_records`) and Score V2 recomputes on read. Contributor function is role-based (artifact type kept separate). Overall evidence confidence stays Low until independent validators and realized-outcome evidence exist; 87 system-verified roots are not enough. One historical recall candidate was not persisted (weak process-style evidence). LANGUAGE_PACK_VERSION 158. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved. Score V2 formulas unchanged.

**Contribution lifecycle + evaluator reputation + context (2026-08-13):** Score V2 layers preserved. Contribution evaluation is now a lifecycle on one canonical root (`contribution-evaluation-v2`): initial → verified → realized impact → durability. Verification does not rewrite raw quality. Realized impact uses bounded breadth×depth (`contribution-impact-v1`). Evaluator reputation (`evaluator-reputation-v1`) is a separate derived pass from immutable ratings. Civizen context (`civizen-context-v1`) is declared/demonstrated/current-focus/historical and is not a score bonus. Reconstruction recall can recover disjoint surviving outcomes without scoring prompts. LANGUAGE_PACK_VERSION 157. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved.

**Contributions ledger + evaluation-on-read (2026-08-13):** Profile Contributions preview no longer hides canonical roots behind a “Platform improvement · 86” aggregate. `/profile/contributions` is the inspectable ledger (search, filters, sort, pagination, per-record detail). Activity evaluation is distinct from accumulated Contributions reputation; Score V2 shrinkage/priors unchanged. Stored 78/78/35 values were type/reconstruction placeholders, not per-outcome evaluations — ignored for development scoring on read. Unknown realized impact stays unknown. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved.

**Live + Testing v0.1.179 (2026-08-13):** Build 181 (`20260813-v0.1.179`) published to Testing and Live. Includes Phase 1 contribution pilots, Score V2, development outcome capture, Challenge export crash fix, and Home Score V2 `demonstratedProjects` guard.

**Historical reconstruction (2026-08-13):** Coherent historical development outcomes are reconstructed from git + journal provenance + surviving implementation (`src/lib/civizen-historical-reconstruction.ts`). Chat/git journal rows remain excluded as independent contributions. Reconstruction confidence is stored separately from contribution evidence confidence. No Score V2 formula change and no score-target restoration. Spec: `docs/04-operations/dev/historical-development-reconstruction.md`. LANGUAGE_PACK_VERSION 154. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved.

**Development contribution capture (2026-08-13):** Live pipeline so a completed development outcome (`outcomeRootId` + artifacts + passing tests) can become one system-verified contribution root via `recordDevelopmentOutcome` → `development_stories` → `profile_contribution_events` → Score V2 on read. Chat/git journal stays excluded. Owner profile ring shows a provisional estimate without presenting it as established. LANGUAGE_PACK_VERSION 154. No Score V2 formula change. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved.

**Development-evidence integrity (2026-08-13):** Contribution unit is a meaningful outcome, not a message/commit. `created_features.length > 0` is no longer verification. Chat/git backfill stays stored as journal/provenance; only traceable implemented/tested/published outcomes mint `development_story` score events. System verification does not require a second human; independent review strengthens the same root. No Score V2 formula change. LANGUAGE_PACK_VERSION 153. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved.

**Phase 1 Pilot QA / readiness (2026-08-13):** Hub simplified: Opportunities, Community Challenges, Learning Commons, My Contributions. Tasks/Projects placeholders removed (redirect to live primitives). Challenge detail export crash fixed. Education-to-Contribution Program seeded. LANGUAGE_PACK_VERSION 152. Operating model: `docs/04-operations/dev/phase-1-pilot-operating-model.md`.

**Slice 4 Shared Knowledge / Learning Commons (2026-08-13):** `/contribute/knowledge` is live. Knowledge Space → Resource → Gap → Opportunity or Challenge → result Resource/Solution Record. Distinct from Study, `content_items`, and Governance Solutions. Programs use `contribution_programs` kind `shared_knowledge`. LANGUAGE_PACK_VERSION 149.

**Civizen Score V2 (2026-08-13):** Architecture review of the existing engine (`SCORE_CALCULATION_VERSION = 'civizen-score-v2.0'`). Public `overall.score` is established only; `provisionalEstimate` averages observed categories and is not shown as a mature Civizen Score. Duplicate evidence roots collapse without extra volume (no 0.25 duplicate weight). Experience keeps duration primary; unique projects add shrunk bounded support (cap 12, prior center 0). Stable skill IDs preferred; lowercase-name matching remains an explicit temporary fallback. LANGUAGE_PACK_VERSION 150. Concurrent Slice 2/3/4 contribution work preserved.

**Civizen Score V2 (2026-08-13, earlier):** Architecture correction in the existing score engine (`src/lib/civizen-score-model.ts`, `SCORE_CALCULATION_VERSION = 'civizen-score-v2.0'`). Activity evaluation is separate from accumulated reputation. Verification no longer multiplies Impact/Quality. Evidence & Validation counts unique underlying roots. Category reputation uses bounded weights + small-sample shrinkage (prior 50 / strength 6; empty → unknown). Confidence is independent of score magnitude (one activity cannot reach Moderate). Coverage and tier readiness are first-class. Declared vs demonstrated skills merge without double-counting; Experience duration stays primary with bounded project support. No parallel score UI. LANGUAGE_PACK_VERSION 148. Concurrent Slice 2/3/4 contribution work preserved.

**Slice 3 Community Problem-Solving Lab (2026-08-13):** `/contribute/challenges` is live. Distinct from Governance Solutions. Flow Challenge → Proposal (`challenge_proposals`) → coordinator selection → implementation Project → Contribution Opportunities (`community_implementation`) → outcome → Solution Record. Programs use `contribution_programs`. Completing requires implementation outcome, not merely a selected proposal. Solution Records can be shared into a Knowledge Space in Slice 4. LANGUAGE_PACK_VERSION 147.

**Slice 2 Contribution Evaluation (2026-08-13):** Optional post-verification evaluation at `/contribute/professional`. Dimensions are selected per opportunity. Verification lifecycle unchanged. Only quality, impact, and collaboration may update derived Performance estimates. LANGUAGE_PACK_VERSION 145.

**Slice 1 Education-to-Contribution (2026-08-13):** `/contribute/professional` is live. Organizer review shows applicant identity via `list_opportunity_applicant_identities` (no copied profile fields). Local RLS harness is skipped without loopback Supabase credentials. LANGUAGE_PACK_VERSION 144.

**Public Areas V1 implemented (2026-08-13):** Read-only `/areas` and `/areas/:slug`. Area list from `listCurrentAreas()` (`foundational_areas.v1`). Curated systems/initiatives in `src/lib/areas/public-areas-content.ts`. Not in bottom nav. Discovery: public footer, Contribute, Governance landing. Partner → `/fund/institutional?area=`. Contribute → `/contribute`. `PILLARS` unchanged. Spec implementation note: `docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md`. LANGUAGE_PACK_VERSION 142.

**Public Areas & Initiatives V1 spec indexed (2026-08-13):** `docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md` — working product spec (not `/documents`). Principle **Simple by default. Detailed by choice.** recorded in IA standards §2 and AGENTS persistent directives. Areas = where help is needed; Contribute = how I want to help; Partners = how an organization can work with Civizen.

**Shared classification registry V1 (2026-08-13):** persisted `classification_sets` / `nodes` / `aliases` / `relationships`. Seeded `foundational_areas.v1` (Health · Education · Culture · Responsibility · Environment) and `product_pillars.v1` (live PILLARS ids, distinct; no Community→Environment or Economy→Health mapping). Library `src/lib/classification/` — public Areas V1 is the first consumer for Areas only. `PILLARS` remain controlling. Spec: `docs/03-platform/model-evolution/shared-classification-registry-v1.md`.

**Shared Classification & Model Evolution Architecture added (2026-08-12):** `docs/03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md` — working product architecture (not institutional item 8; not `/documents`). Doctrine: preserve purpose, not assumptions; stable evolution. Current Score model and live `PILLARS` stay as-is.

**Contributor Framework indexed (2026-08-12):** `docs/institutional/contributor-framework.md` — Working Contributor Framework (Contribution Record design). Item 6. Not `/documents`. Public `/contribute/policy` remains adopted. Doc `21` clarified as compensation planning.

**Areas, Domains & Participation Framework added (2026-08-12):** `docs/institutional/areas-domains-participation-framework.md` — shared Area/Domain/Topic/Initiative/Role taxonomy. Item 7. **Current foundational Area model** = Health, Education, Culture, Responsibility, Environment (from *Mature Humanity*; evolvable, not permanently immutable). Minimal public `/areas` V1 is a separate read-only landing. Product `PILLARS` remain unchanged.

**Founder transition clarified (2026-08-12):** functional self-sufficiency, not development percentage and not official-use designation alone. Official use increases controls; it does not automatically remove founder access. Preferred sequence: founder supervision → capability built → parallel/verified operation → demonstrated self-sufficiency → founder steps back. Founder permissions unchanged.

**Founder Transition & Succession Framework added (2026-08-12):** `docs/institutional/founder-transition-succession-framework.md` — specialized Working Framework (F0 current conceptual stage; public availability ≠ official deployment; economic rights ≠ governance rights). Not a public `/documents` page. Indexed fifth after Blueprint, Governance, Stakeholder & Partnership, and Pilot Frameworks. Does **not** change founder bootstrap/full access.

**Pilot Framework added (2026-08-12):** `docs/institutional/pilot-framework.md` — subordinate Working Pilot Framework (what Civizen tests with participants; domain vs type taxonomy; P0–P6 conceptual maturity; Person → Field → Organization → Pilot → Role; Need + Role + Relevance + Responsibility + Authorization). Not a public `/documents` page. Indexed fourth after Blueprint, Governance Framework, and Stakeholder & Partnership Framework. Existing concrete pilot/validation plans remain operational children. Future **Areas & Pilots Catalog** recorded under Pilot Portfolio (§40), not built.

**Stakeholder & Partnership Framework added (2026-08-12):** `docs/institutional/stakeholder-partnership-framework.md` — subordinate Working Stakeholder & Partnership Framework (who Civizen engages; multi-dimensional classification; partnership roles/modules; Contribution Record; future Stakeholder Map). Consolidates Stakeholder Map / Partnership Strategy / Framework / Packages. Not a public `/documents` page. Indexed third after Blueprint and Governance Framework.

**Institutional Blueprint added (2026-08-12):** Working institutional architecture at `docs/institutional/institutional-blueprint.md`. **Governance Framework added (2026-08-12):** `docs/institutional/governance-framework.md` — subordinate Working Governance Framework (how authority is distributed; seven decision classes; Contribution Record may support eligibility, not voting power). Indexed under Institutional Architecture. Not published as a primary public `/documents` page.

**Web login/signup lockout fix (2026-08-11):** Session could succeed while `profiles` fetch failed/hung; `TermsReconsentGate` waited forever on Loading, and `AuthRedirect` bounced `/login` + `/signup` to `/` — Login/Sign up looked dead. Root cause since Terms re-consent **2026-07-30**; more visible after **2026-08-03** auth no longer gated on profile. Fix: `profileLoadFailed` + 10s timeout recovery (Retry / Sign out); Login/SignUp submit try/finally. LANGUAGE_PACK_VERSION 141.

**Validation Budget v0.3 Recommended applied (2026-08-11):** Owner selected Recommended Validation Program from decision pack `33`. New app draft **Civizen Pre-Major-Build Validation Program v0.3** — exact Base **$634,400,000.00** (~$634M); same-scope Low/High ~**$552.4M / $833.2M**. Direct **$489.5M** + contingency **$78.3M** + safe-pause **$66.6M**. 13 groups / 53 lines (WS-15 $18M; VAL-EX16 $12M quote-dependent; WS-22 $11.5M corrected travel). Draft/unapproved/unpublished; committed/actual 0; public flags false. v0.1 ($446M) and v0.2 ($530.2M) preserved as superseded/historical; primary selector excludes superseded. Constrained ~$374M / Expanded ~$1.03B documented as **different scopes**. Tranches in Program plan/docs (T1 ~$132M; provisional escrow floor $60M) — not a Budget table dashboard. Economics model **0.1.6** restricted-validation = exact v0.3 Base; FPP **$14.7M** / eligible **$1,470M** unchanged; founder accrued only. Receiving-entity path unresolved — do not accept funds. LANGUAGE_PACK **140**.

**Scope/priority/tranche decision pack (2026-08-11):** Doc `33` + CSV — Recommended case **selected and applied** as Validation Budget v0.3. Separates Constrained / Recommended / Expanded scope from same-scope unit-cost L/B/H. Corrects WS-22 travel math.

**Line-adequacy audit v0.2 (2026-08-11):** Doc `32` + CSV — analysis only. Adequacy stress ~$662M superseded as recommended Base by doc `33` after travel-math correction.

**Live + Testing v0.1.176 (2026-08-11):** Build 178 (`20260811-v0.1.176`) published to Testing and Live. Includes bottom-nav hide-on-scroll, Funding Economics page, Validation Budget v0.2 draft model/docs, and capital/participation planning pack.

**Validation Budget v0.2 coverage adds (historical, 2026-08-11):** Exact Base **$530,200,000.00** — superseded as working draft by v0.3; retained historically. Prior **$524M** and **$446M** also retained. FPP **$14.7M** / eligible **$1,470M** unchanged through v0.3.

**Bottom nav hide-on-scroll (2026-08-11):** `MobileNav` uses `useShowOnScrollUp` — hide bottom bar (+ FAB) on scroll down, show on scroll up so long pages gain viewport on mobile. Secondary arc/strip closes while hidden; Market `persistCarousel` restores on scroll up. Spec: `nav-secondary-carousel.md` § Behavior.

**Coverage audit doc 29 (2026-08-11):** Read-only validation + five-year coverage audit. Separates (1) health system domain (2) workforce benefits OpEx EX-02 (3) insurance system domain (4) program insurance OpEx EX-16. WS-12 $32M kept intact; ten named sub-lines proposed with `15` indicative ranges (unmapped). No UI/DB/amount/approval changes. Matrix CSV companion. Next free was 29.

**Participation policy pack (2026-08-11, rev 0.1.2):** Docs `26`–`28` — CoA taxonomy; **Founder Participation Pool = 1% of Eligible External Monetary Receipts** (once). Reconciled base FPP **$14.7M** on **$1,470M** eligible vehicle equity-like capital; profit **10/10/80**. Private-capital L/B/H columns are eligibility cases **within** the ~$37.5B base ecosystem scenario (not ecosystem L/B/H). 

**Funding → Economics page (2026-08-11, model v0.1.3):** Read-only planning UI at `?section=economics`. Selected commercial scenario/horizon drives summary, waterfall, pools, and illustrations. Primary eligible base = deficit-recovered cumulative cash ($3,043.4M base/15y); floored annual sum ($3,527.5M) is alternate only. Policy $310M example collapsed. Investor default $100M / V-ENT capacity $500M FPP-eligible. DEV harness `/dev/economics-visual`. LANGUAGE_PACK_VERSION 137.

**Home post composer — process root cause + gates (2026-08-11):** Working `<textarea>` was replaced on **2026-08-03** (Testing **v0.1.128**, commit `737086f`) with floated `contentEditable` for wraparound aesthetics; click→focus→type was never gated, so empty-field taps died until reported. Product fix shipped in **v0.1.175**. Prevention now in-tree: AGENTS §3 **Input-control replacement gate**, AGENTS correction naming `737086f`, Playwright **`verify:home-post-composer`** inside `verify:post-dev`, cursor rule pointer, Vitest helpers.

**Investable-vehicle redesign (2026-08-11):** Docs `23`–`25` — ring-fenced commercial/OPS/JUR/DISC vehicles; FY2025 platform benchmarks; lawful ad/discovery upside; revised post-contract 10%/10% waterfall; readiness gaps. Doc `20` equity unattractiveness (~0.3× MOIC no TV) preserved. Doc `22` marked **internal — investability redesign required** (not external). Vehicle-assigned private capital ~$0.9/$2.8/$6.4B. **No** app finance/payout/offer changes.

**Live ships bug fixes immediately (2026-08-11):** Standing rule updated — confirmed bug-fix releases must promote to Live/Production in the same session (not Testing-only). Live promoted to **v0.1.174** (build 176) so default Android clients get the update prompt.

**Capital stack / ROI scenario pack (2026-08-11):** Docs `20`–`22` — provisional capital-stack, revenue, investor-return, and contributor-compensation model. Privately investable 5y range ~$0.9B / ~$2.8B / ~$6.3B (not full ~$37.5B). Payout base = eligible distributable commercial CF; tested 5/5, 10/10, 15/15 pools (unapproved). CSV + meta hold calculations. **No** app finance records, payout systems, or investment offers. README + due-diligence index updated.

**Testing v0.1.174 (2026-08-11):** Build 176 (`20260811-v0.1.174`) published to Testing + live web. Includes project finance workspace, validation budget UI, Program plan, funding docs, Program Readiness UX. Production remains on prior soak build until Testing is clear.

**Draft Budget v0.1 retirement (2026-08-11):** Safety-checked remote demo (`90a496d2-…`, zeros only, no allocations/commitments/receipts/fees/publications). Hard-deleted via `scripts/db/retire-demo-draft-budget-v01.sql` with audit `budget.demonstration_retired`. Validation intact (`0ef850e3-…`, planned_minor 44600000000). Ordinary selector excludes `is_demonstration`; default = validation. Ordinary seed path refuses recreate; local-only under `scripts/db/local-dev-only/`. Client seed gated (`force` / `VITE_ALLOW_DEMO_BUDGET_SEED`). LANGUAGE_PACK_VERSION 135.

**Budget structure toolbar (2026-08-11):** Single folder icon toggles expand/collapse all (hover Expand/Collapse); `+` icon for Add group (hover label). Removed By group / All line items toggle — nested hierarchy only. LANGUAGE_PACK_VERSION 134.

**Budget hierarchy styling (2026-08-11):** Expense-group rows use semibold name/totals and stronger background; line items use normal weight, deeper indent, muted WS-id + period, quieter child background — styling only. LANGUAGE_PACK_VERSION 134.

**Timeframe UI cleanup (2026-08-11):** Compact expense-table toolbar (no standalone Period row). Period selector removed — canonical model has no periodized amounts, so month-window filters were not honest financial controls; duration shown as `18–24 months` metadata badge. Month 25 was a CSV off-by-one on WS-13/WS-23 (`start=2` + `duration=24`); doc 14 table is M2–M24 — corrected `duration_months` to 23 (amounts unchanged). LANGUAGE_PACK_VERSION 134.

**Financial hierarchy framing (2026-08-11):** Validation budget classified as subprogram (18–24 mo, ~$446M) inside five-year first-wave pathway (~$30–50B / ~$37.5B base) — not Civizen’s complete implementation budget. Program plan primary heading is five-year plan; Budget selector = ordinary non-demonstration budgets (default validation). No $37.5B master ledger row. Schema needs for a future multi-entity five-year master budget documented in funding IA. LANGUAGE_PACK_VERSION 133.

**Period presentation (2026-08-11):** Validation budget shows 18–24 month duration + Period filter (timing-overlap only; full-program planned amounts — no fabricated period cash). Timing column renamed Period; group rows show combined month ranges. Program plan five-year card has Planning period selector (Five-year total / Year 1–5) from canonical annual cashflow. Missing data: validation model has no periodized planned amounts by month window or tranche. LANGUAGE_PACK_VERSION 132.

**Funding Budget upper layout (2026-08-11):** Settings → Funding → Budget compact header — dropdown selector (Active / Demonstration optgroups), status badges, totals strip, primary workflow action + overflow (CSV, New budget, secondary), creation forms hidden until requested, hierarchy immediately below. Funding subtitle shortened; legacy tools only via finance.admin overflow (`?legacy=1` preserved). Presentation only — no finance record/schema/permission/calculation changes. LANGUAGE_PACK_VERSION 131.

**Validation Program draft budget (2026-08-10):** Seeded `Civizen Pre-Major-Build Validation Program v0.1` from doc `14` CSV base scenario — exact planned **$446,000,000.00** (44,600,000,000 minor), 12 groups, 25 lines (WS-01…WS-25), committed/actual 0, draft/unapproved/unpublished, `publish_flag=false`. Preferred / default selection in Settings → Funding → Budget. Idempotent SQL `scripts/db/seed-validation-budget-v01.sql` + TS model/seed. Low/high remain Program Plan only. (Obsolete Draft Budget v0.1 later retired — see 2026-08-11 entry.) LANGUAGE_PACK_VERSION 130.

**Program plan + Budget nesting + phase Timing TBD (2026-08-10):** Settings → Funding adds read-only **Program plan** (`?section=program-plan`) from generated `program-plan-summary-v0.1.json` (Months 1–24 validation + Years 1–5 first wave; long-range behind advanced disclosure). Budget default unchanged; nested expandable expense groups use a **wide hierarchical table** (≥720px panel) and stacked cards only when narrow; timing shows concise **TBD**. Docs `13`/`16`–`19`/`06`/IA updated. Demo budget amounts/approval/public page unchanged. LANGUAGE_PACK_VERSION 129.

**Funding inquiry-readiness package (2026-08-10):** Docs `16`–`19` provisionally approved. `17` §5 records owner decisions D1–D11: validation ask (~$446M base, ~$202–898M range); long-horizon figures as ecosystem hypotheses; `16` for controlled sharing after final review; prospect categories for research (not commitments); receiving entity/fiscal path **unresolved (D6)**; independent assurance mandatory; demo budget stays zeros. No financial records, budget publication, or funding commitments recorded.

**Budget visibility + Program Readiness UX (2026-08-10):** Remote DB confirmed `Civizen Draft Budget v0.1` (draft, demonstration, USD, 9 groups, 22 lines, amounts 0, unpublished). Funding Budget empty/access/load states + demo badges. Governance Program Readiness refactored to summary→list→one detail form; APIs/permissions/rules unchanged. Browser screenshots unavailable.

**Funding IA standards + workspace nav (2026-08-10):** Universal IA standards under `docs/03-platform/product-design/`; Funding Overview section + mobile section picker + Sources work-panel progressive disclosure; funding-and-budget README reindexed. Budget remains default. No finance schema/record changes (demo budget still 0).

**Pre-major-build validation program (2026-08-10):** `14-pre-major-build-validation-program-v0.1.md` + workstreams CSV + `15` panel/study briefs + external concept summary. Bottom-up validation budget ~$202M / ~$446M / ~$898M (18–24 mo); supersedes `11` §7.3 $0.25–0.50B as working total. Inventory and long-horizon costs treated as hypotheses. App DB unchanged (amounts 0).

**System inventory + long-horizon costs (2026-08-10):** `12` (467 systems) and `13` (10y/20y ranges) — structured hypotheses pending validation in `14`. Document `11` is five-year **first-wave** only (~$37.5B), not worldwide completion.

**Profile menu scroll lock (2026-08-10):** Opening Profile no longer scroll-chains to the page behind on mobile/narrow viewports. `UserPageMenu` locks `document.body` while open and uses a max-height `overflow-y-auto` + `overscroll-contain` panel as the scroll target.

**Program financial model v0.1 (2026-08-10):** `docs/04-operations/funding-and-budget/11-program-financial-model-and-funding-responsibility-v0.1.md` + `11-program-financial-model-v0.1.csv` — cost centers, funding responsibility, sector domains, release gates. Bottom-up base ~$37.5B/5y **first wave**; core primary ~$4.8B; core must raise ~$8.2B. App DB unchanged (amounts 0).

**Five-year ecosystem cost reconciliation v0.1 (2026-08-10):** `10-five-year-ecosystem-cost-reconciliation-v0.1.md` — ~$35B midpoint framing; detailed model in `11`.

**Civilization-scale program framework v0.1 (2026-08-10):** `09` remains authority for capability map and launch gates; ecosystem dollar totals preliminary and deferred to `10`.

**Budget realism audit v0.1 (2026-08-10):** `08-budget-realism-and-scope-audit-v0.1.md` — historical prototype honesty audit; superseded for civilization-scale capitalization by `09`.

**Budget estimate scenarios v0.1 (2026-08-10):** `docs/04-operations/funding-and-budget/07-budget-estimate-scenarios-v0.1.md` — low/base/high USD proposal (base cash ~$226k incl. 15% contingency). Superseded for decision-making by realism audit Cases A/B/C; kept for history.

**Draft Budget v0.1 planning skeleton (2026-08-10):** `docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md` — nine expense groups, phase definitions. Originally seeded as draft + `is_demonstration=true` + zero minor units; **retired from ordinary remote use** (see 2026-08-11 entry). Explicit local-only seed under `scripts/db/local-dev-only/`.

**Project finance workspace v1 (2026-08-10):** Settings → Funding Budget/Sources; public `/fund/project-finance`. Fine-grained `finance.view|edit|approve|publish|admin` with legacy compat; legacy ledger tabs quarantined behind `?legacy=1`. LANGUAGE_PACK_VERSION 125.

**Documentation IA restructure (2026-08-10):** `docs/` reorganized by purpose (`00-foundation` … `05-research`, plus `proposals/` and `archive/`). Canonical philosophy: `docs/00-foundation/philosophy-of-mature-humanity.md`. Public institutional policies: `docs/02-policies/institutional/`. Pathway: `docs/00-foundation/recognized-planetary-citizenship-pathway.md`. Inventory: `docs/archive/implementation-history/docs-ia-migration-inventory-2026-08-10.md`. Uncommitted Market Jobs form edits left untouched.

**Funding strategy docs (2026-08-10):** Added practical funding guidance under `docs/01-governance/funding-and-monetary/` without selecting a financing model: `funding-and-sustainability-plan.md`, `funding-options.md`, `funding-readiness-roadmap.md`. README separates strategy / current policies / conditional frameworks. Cleanup pass: restored grant-restricted policy as Current Draft; demoted LSP/calculator/distribution docs to Historical / prototype; transparency policy no longer implies fixed pools; crypto remains Conditional/Future · Disabled; open-legal-questions kept short. No application code changes.

**Market Jobs sentence form polish + Production (2026-08-04):** Logged-in users no longer see Worker/Employer tabs (mode from personal vs `biz_*` account). Job-type token cycles seed labels until hover/select; multi-select shows “Baker or Barista” style lists with checks in the dropdown. Location shows city/region plus matching country flag (`RoundCountryFlag`), also beside Full name. Also ships Permissions drag-scroll, ProtectedRoute profile-load gate, and AppPageHeader alignment. **Production v0.1.172** (build 174).

**Market Jobs sentence form (2026-08-04):** Jobs replaces StudySpecialists with a progressive sentence form (job type + location tokens, then contact + More details). Marketplace title hover shows the transactional specialist description. Submissions persist to `market_job_interests`. LANGUAGE_PACK_VERSION 123. **Testing v0.1.171** (build 173).

**Permissions folder vs function labels (2026-08-04):** Section folders use small uppercase primary tracking; nested page folders use muted tracking; permission rows use normal-weight body text with indent. Continues scroll/refresh work from **Testing v0.1.171**. **Testing v0.1.172** (build 174).

**Market header UX (2026-08-04):** All Market header icons show names on hover (Filters · Products · Services · Agreements · Prototype credits · Search · Profile). Prototype credits hover also shows the Luma notice (banner removed). Search icon toggles the listing search bar (Study-style). `/market` restores the last section unless For you has unseen listings. Spec: `nav-secondary-carousel.md`. **Testing v0.1.170** (build 172).

**Market Jobs default + Services icon (2026-08-04):** `/market` defaults to **Jobs** (specialists lane with content) instead of empty For you. Products/Services header toggle uses Package + Handshake with on-hover tooltips. Spec: `nav-secondary-carousel.md`. **Testing v0.1.169** (build 171).

**Profile avatar header sizing (2026-08-04):** `UserPageMenu` supports `size="sm"` (32px) and defaults to `md` (40px, matches AppTopChrome Search). Messaging/Market use `sm`. Messaging inbox filter row uses `items-center` + `overflow-y-hidden` (and hidden horizontal scrollbar chrome) so a tall avatar cannot create a vertical header scrollbar. **Testing v0.1.168** (build 170).

**Permissions header + matrix scroll (2026-08-04):** Permissions uses `AppLayout hideTopChrome` so Back · Permissions › · Search · Profile share one `items-center` header row. Matrix scroll parent uses `min-w-0` + `overflow-x-auto` (flex default `min-width: auto` was blocking horizontal swipe); canvas is `width: max(100%, calc(...))` so roles expand on wide screens and scroll on narrow.

**Messaging header chrome overlap (2026-08-04):** Same as Market — floating AppTopChrome Search + Profile duplicated Messaging’s inbox Search. Messaging uses `AppLayout hideTopChrome`; Profile lives in the ChatBar page header (inbox + thread). **Testing v0.1.167** (build 169).

**Search Contents + no All tab (2026-08-04):** Search filters are People · Companies · Products · Services · Contents. No All chip — with nothing selected, every category is searched. Contents covers app pages, features, Study, Law, institutional docs, and Contribute lanes. Legacy `?tab=all` maps to search-everything. LANGUAGE_PACK_VERSION 122. **Testing v0.1.165** (build 167).

**Market header chrome overlap (2026-08-04):** Floating AppTopChrome Search + Profile sat on top of Market’s Agreements and Prototype credits shortcuts. Market now uses `AppLayout hideTopChrome` and keeps Search + Profile in the page header (with Agreements · Credits). **Testing v0.1.165** (build 167).

**Hide Endorse from Profile menu (2026-08-04):** Endorse remains on Search results and profile pages; Profile menu no longer lists it (`PROFILE_MENU_EXCLUDED_PAGE_IDS`). **Testing v0.1.164** (build 166).

**Public language flag (2026-08-04):** `PublicLanguageSelect` is flag-only — removed the redundant `ChevronDown` beside the flag (hover/click still opens the list). **Testing v0.1.163** (build 165).

**Funding interest autofill (2026-08-04):** Logged-in users get Full name / Email / Country pre-filled on `FundingInterestForm` (Support, Invest, Institutional, Contribute) from auth profile/session; edits are not overwritten. Inquiries land in Settings → Funding → Interest (`funding_interest_inquiries`). Standing rule in AGENTS.md: known-field autofill.

**Same-line page Back (2026-08-04):** `AppPageHeader` is app-wide: Back chevron on the same line as the title. Covers Fund (`FundPageShell` hub + lanes), settings/admin, Edit Profile, Governance/Law/Features/Terms, Endorse, Contribute lanes, Agreements, Documents, Why This Exists, Market taxonomy, and related AppLayout pages. Public shells use `padForChrome={false}`. Hubs (Home/Study/Contribute/Market/Messaging) omit Back. Optional `onBack` for in-flow steps (EndorseFlow). **Testing v0.1.162** (build 164).

**Contribute hub redesign Phase 1 (2026-08-04):** `/contribute` is no longer profile/messaging/score/endorse shortcuts. It is the participation gateway (“How would you like to contribute today?”) with sections Ways · Community · Knowledge · Your Impact. Volunteer → `/fund/contribute`, Financial → `/fund`, Organization → `/partners`; other lanes use `/contribute/:laneId` placeholders. Spec: `docs/04-operations/dev/contribute-page.md`. Endorsement stays on Search + profiles. LANGUAGE_PACK_VERSION 120. **Testing v0.1.156** (build 158).

**Post-push CI watch (2026-08-04):** Agents must run `npm run verify:ci` after every GitHub push (`scripts/verify-ci.mjs` waits for the `CI` workflow on `HEAD`). Encoded in AGENTS.md §10 and `.cursor/rules/civizen-project.mdc`.

**CI Download/Onboarding Auth mocks (2026-08-04):** All main pushes after Profile menu chrome failed Vitest: `PublicPageToolbar` calls `useAuth`, but Download/Onboarding tests had no AuthContext mock. Fixed with logged-out mocks. Yesterday’s green CI was the `npm audit` fix — this was a separate same-day regression.

**Permissions scroll + Home kick (2026-08-04):** Role columns use `minmax(4.75rem, 1fr)` so they expand on wide screens and keep a horizontal min-width for swipe-scroll on narrow screens. Empty/failed `current_app_permissions` no longer clears founder/admin access (ProtectedRoute also keeps founder/system). **Testing v0.1.166** (build 168).

**Permissions dense columns (2026-08-04):** Feature labels sit in a tight sticky first column next to role checkboxes. Role columns swipe/scroll horizontally on small screens; scrollbars stay hidden. **Testing v0.1.161** (build 163).

**Permissions full-bleed matrix (2026-08-04):** Permissions matrix fills the viewport below the title (no `72vh` inset card); vertical/horizontal scrollbars are hidden while scrolling still works. **Testing v0.1.160** (build 162).

**Permissions expand-all title chevron (2026-08-04):** Title reads `Permissions >`. Main folders stay visible (folded). Title `>` expands/collapses all groups; clicking a folder name still toggles that folder only. **Testing v0.1.158** (build 160).

**App-wide chrome back (2026-08-04, superseded):** Briefly lived in `AppTopChrome` with a height spacer; rejected for wasted vertical space. Replaced by same-line `AppPageHeader` Back + title (see Current focus).

**Endorse vs credentials icons (2026-08-04):** Endorse uses Lucide `ThumbsUp`; Professional credentials keeps `Award`, so Profile menu / Contribute / Settings no longer share the same medal icon. **Testing v0.1.152** (build 154).

**Search companies ownership + endorse (2026-08-04):** People no longer lists business profiles. Companies show a tappable “Run by [name]” owner row and Endorse. Directory uses `search_civizen_directory` RPC so owner fields work for all signed-in users despite `linked_accounts` RLS. LANGUAGE_PACK_VERSION 119. **Testing v0.1.151** (build 153).

**UsersAdmin overview polish (2026-08-04):** Level hover label is “User Level”; stats cards fit in one row without a visible scrollbar; header is chevron-only Back beside the Users title. LANGUAGE_PACK_VERSION 118. **Testing v0.1.150** (build 152).

**UsersAdmin level under avatar (2026-08-04):** Experience level (Entry/Junior/…) sits under the photo/logo on the same left column; hover/click opens a level menu like the role pill. **Testing v0.1.149** (build 151).

**UsersAdmin add-user chrome (2026-08-04):** Create user is a `+` icon in AppTopChrome immediately before Search (not a text button beside the title). **Testing v0.1.148** (build 150).

**UsersAdmin username on avatar hover (2026-08-04):** Mobile user cards hide `@username` from the card body; hovering the photo/logo shows it. Status pills stay on one scrollable row so cards remain 3 lines. **Testing v0.1.147** (build 149).

**Score Details formation note (2026-08-04):** Home Score Details icon tooltip now shows “View Score Details” plus a second line: rating system is still in formation and may not reflect the correct or actual rating. LANGUAGE_PACK_VERSION 117. **Testing v0.1.146** (build 148).

**Search typing one-letter bug (2026-08-04):** `/search` could only accept one character because `UnifiedSearchBlock` re-applied stale URL `q` into local state on every `query` change. URL→state sync now runs only when `searchParams` change; local→URL writes skip no-op updates. Regression test: `UnifiedSearchBlock.test.tsx`. **Testing v0.1.145** (build 147).

**UsersAdmin cards denser (2026-08-04):** Mobile user cards capped at 3 lines — (1) photo/logo + name + settings/verify/login, (2) @handle · level · activity, (3) status pills where the role pill is also the hover/click role menu (removed duplicate role Select). Personal accounts and linked business orgs are grouped; org cards show the organization name. Verification shows status (check/X) in the action group; click toggles verification. **Testing v0.1.144** (build 146).

**Profile menu + main nav chrome (2026-08-04):** Bottom nav is Home · Study · Contribute · Market · Messaging (Settings removed from nav; stays in Profile menu). Profile menu hides main-nav duplicates plus Search, Download, Edit Profile, and Contribute. Edit Profile is a pencil on personal/business account rows. Download Civizen is public-only (toolbar when logged out). App-wide Search + Profile chrome on AppLayout (hide on scroll down / show on scroll up). LANGUAGE_PACK_VERSION 116. **Testing v0.1.143** (build 145).

**Profile menu Accounts add control (2026-08-04):** `UserPageMenu` Accounts `+` is always clickable (opens create-business dialog); hover label “Add business account”; bottom add row removed. **Testing v0.1.142** (build 144).

**Profile Earnings page (2026-08-03 / 2026-08-04):** `/earnings` in the Home avatar menu shows seller product/service activity from agreements (signed = sold; pending listed separately). Illustrative Lumen totals only — settlement not active. Notice describes earnings from work, services, and products (no registration/banking roadmap language). Filters use a single-line scrollable underline tab strip (not pills). Home removed from that menu (bottom nav covers it); `pageRegistry.home` icon aligned to Lucide `Home`. LANGUAGE_PACK_VERSION 115. **Testing v0.1.140** (build 142).

**App load performance (2026-08-03):** Home and shared bootstrap were stacking full-screen gates (i18n → auth profile/E2EE → Home sequential fetch including full contribution sync), so sparse pages felt ~5s empty. Fixed: prefetch i18n base with App chunk (no language shell gate); Auth clears loading on session and publishes profile before messaging E2EE; Home/Profile paint from parallel queries + ledger read while contribution sync runs in background with 90s TTL; Stories seed/list deferred until Stories tab. **Testing v0.1.136** (build 138); Live/Production remains on prior soak build. Deploy also caps site backups (≤2) and prunes old testing APKs so the VPS does not fill mid-publish.

**Account switcher UI (2026-08-03):** Removed the non-working header **Switch back** button from `UserPageMenu`. Account switching stays on each non-current account card via **Switch**. **Testing v0.1.135** (build 137).

**UsersAdmin emergency-access reload loop (2026-08-03):** `loadData` depended on `emergencyAccessOpsPolicy` while also `set`ting it, so the page stayed on Loading and re-toasted “Could not load emergency access event summary.” Fixed with a policy ref + stable callback deps; event_summary now returns a zero row on empty lookback. Migration applied. **Testing v0.1.134** (build 136).

**CI + page smoke coverage (2026-08-03):** Continuous GitHub CI fails were from `npm audit` (not Vitest). Added `scripts/audit-ci.mjs` (SPA-irrelevant RSC allowlist), upgraded `react-router-dom` to 7.18.2, and added page import/render smoke + UsersAdmin component tests so missing imports (`Select`, `manageableRoles`) fail in CI. **Testing v0.1.133** (build 135); Live/Production remains on prior soak build. Standing rule in `AGENTS.md`: always add/update Vitest for every module/page created or modified in the same session.

**Home post views (2026-08-03):** Feed post name line shows an Eye icon on the far right; hover reveals unique visitors and total views. Table `post_views` + RPC `record_post_view` (authors do not inflate their own counts; 15-minute revisit cooldown). LANGUAGE_PACK_VERSION 111.

**Admin Users startup crash (2026-08-03):** `/settings/admin/users` hit sequential ReferenceErrors after a partial split: missing `Select` import, then missing `manageableRoles` import for Create User. Both restored. Boot-recovery / cache reset signs out (expected). **Testing v0.1.130** (build 132); Live/Production remains on prior soak build.

**Testing v0.1.128 (2026-08-03):** Build 130 (`20260803-v0.1.128`). Live/Production remains on prior soak build. Composer wraps under avatar with curved shape-outside.

**Home composer wraparound (2026-08-03):** Long drafts use a single bordered field with floated avatar + circular shape-outside so lines wrap under the photo (full width from ~line 3) with a soft curve.

**Testing v0.1.127 (2026-08-03):** Build 129 (`20260803-v0.1.127`). Live/Production remains on prior soak build. Composer remeasures so full draft text stays visible.

**Home composer clip fix (2026-08-03):** Draft field remeasures height after width settles (rAF + width ResizeObserver) so restored/long drafts wrap fully instead of clipping under overflow.

**Testing v0.1.126 (2026-08-03):** Build 128 (`20260803-v0.1.126`). Live/Production remains on prior soak build. Composer field full-width while drafting; actions below.

**Home composer width fix (2026-08-03):** With draft text, the field uses full width and Cancel/Post sit below — buttons no longer squeeze the textarea into a narrow column.

**Testing v0.1.125 (2026-08-03):** Build 127 (`20260803-v0.1.125`). Live/Production remains on prior soak build. Empty composer: Post same row; placeholder vertically centered.

**Home composer empty-state align (2026-08-03):** Empty field keeps single-line height so Post stays on the same row; placeholder marquee is flex-centered in the field.

**Testing v0.1.124 (2026-08-03):** Build 126 (`20260803-v0.1.124`). Live/Production remains on prior soak build. Denser Home: score details icon, compact Governance, composer under Governance.

**Home layout denser (2026-08-03):** Score details is an icon beside `/ 100` (hover label). Governance is one row (icon + title/description). Post composer sits under Governance.

**Testing v0.1.123 (2026-08-03):** Build 125 (`20260803-v0.1.123`). Live/Production remains on prior soak build. Home post composer autosaves drafts; Cancel discards; Post publishes.

**Home post draft autosave (2026-08-03):** Composer text autosaves per user in localStorage (debounced + flush on blur/hide). Restores on return. Cancel clears draft; Post clears after publish.

**Testing v0.1.122 (2026-08-03):** Build 124 (`20260803-v0.1.122`). Live/Production remains on prior soak build. Home score card: no Confidence line; points-to-next on dial/tier hover.

**Home score card declutter (2026-08-03):** Removed always-visible “Confidence: …” from Home. “N points to {tier}” shows only on hover of the dial or tier label (e.g. Builder).

**Testing v0.1.121 (2026-08-03):** Build 123 (`20260803-v0.1.121`). Live/Production remains on prior soak build. Home feed post body aligns with avatar left edge.

**Home post body full-bleed (2026-08-03):** Feed post body/actions start at the avatar’s left edge (not indented under the name). Header stays avatar + name/time on one row.

**Testing v0.1.120 (2026-08-03):** Build 122 (`20260803-v0.1.120`). Live/Production remains on prior soak build. Home Post composer grows with draft length (no 160px clip).

**Home Post composer auto-grow (2026-08-03):** Draft textarea grows with content (removed 160px height cap) so long messages stay fully visible while composing.

**Testing v0.1.119 (2026-08-03):** Build 121 (`20260803-v0.1.119`). Live/Production remains on prior soak build. Includes org Social accounts + Publish to….

**Org social publish (2026-08-03):** Official `@civizen` account can connect LinkedIn / Facebook / X under Settings → Social accounts, then use Home **Publish to…** (Share icon, next to Comment) after a Civizen post exists. Not simultaneous. LinkedIn company page `143053953`. LANGUAGE_PACK_VERSION 110.

**Home Post composer placeholder (2026-08-03):** Composer empty state is now “Share an idea, update, or opportunity...” (was “What’s on your mind?”). LANGUAGE_PACK_VERSION 109.

**Testing v0.1.118 (2026-08-03):** Build 120 (`20260803-v0.1.118`). Live/Production remains on **v0.1.106** until soak. Includes Home post composer placeholder copy.

**Learning trainings panel (2026-08-03):** Selecting Learning opens Education plus a Trainings sentence card (“I have attended training on [cycling multi-select]”). Trainings persist in `profile_training_entries` and add a secondary Learning boost (degree remains primary). `SCORE_CALCULATION_VERSION` → `civizen-score-v1.2`. LANGUAGE_PACK_VERSION 108.

**Learning level-aware scoring (2026-08-03):** Learning is no longer count-only. Highest education level drives the preliminary score (`EDUCATION_LEVEL_BASE_SCORE`); custom labels like **5-Year Diploma Degree** normalize to master’s (68). Verification and extra credentials still boost. Wired through Profile / Home / UserProfile (`education_level` select). `SCORE_CALCULATION_VERSION` → `civizen-score-v1.1`. **Testing v0.1.115** (build 117).

**Experience duration scoring (2026-08-03):** Experience is scored primarily from cumulative months (union of intervals, diminishing returns), not entry count. Extra roles add only a small breadth bonus so 2×3-year jobs outrank 3×6-month hops. Spec-aligned: years alone do not run away. **Testing v0.1.114**.

**Experience field hover + Present default (2026-08-03):** Positions cycle pauses when hovering/opening any sentence token (areas, positions, duration, companies). Duration To is pre-filled as Present (“from – Present”). LANGUAGE_PACK_VERSION 107. **Testing v0.1.113** (build 115).

**Experience edit on hover (2026-08-03):** Committed experience rows show Edit/Delete only on hover (always visible on touch). Edit loads the entry into the sentence builder; saving replaces it in place. LANGUAGE_PACK_VERSION 106. **Testing v0.1.112** (build 114).

**Experience positions preview cycle (2026-08-03):** Empty positions token cycles through catalog titles (Analyst, Director, …) instead of the word “positions”; pauses on hover/focus/open so the user can select. **Testing v0.1.111** (build 113).

**Profile Experience Present duration (2026-08-03):** Duration picker is From / To. Selecting From defaults To to **Present** (shown as “May 2002 – Present”); To can still be any month/year. Legacy single-point entries migrate to start + Present. LANGUAGE_PACK_VERSION 105. **Testing v0.1.110** (build 112).

**Percent ring fix (2026-08-03):** Multi-colored tier-band track + split dashed progress made the ring look distorted and like progress sat in the wrong tiers. Restored one muted track, one continuous progress stroke, and slim tier separators only. **Testing v0.1.109**.

**Dial photo/progress core (2026-08-02):** Modest ~11% larger photo + percent ring (`dialRingSize` 176, photo 8.5rem). `RING_INNER` raised 108→118 to reclaim gutter; factor band height stays mostly intact for Contributions / Performance labels. **Testing v0.1.108**.

**Dial size for mobile labels (2026-08-02):** Score dial uses `max-w-lg` (same content width as Score categories) with a tighter SVG viewBox so the ring fills more of the square. Slightly larger name type + floor so Contributions / Performance stay readable; page `px-4` keeps a side margin. **Testing v0.1.107**.

**Live + Testing v0.1.106 (2026-08-02):** Build 108 (`20260802-v0.1.106`) published to both channels (explicit PROD ship). Includes Performance scoring, Contributions fairness, AI skills catalog, dial tier-ring readability, and sole-author Git attribution guards.

**Git attribution (2026-08-02):** All commit authors remapped to `maturehumanity` only (stripped Cursor co-authors; rewrote Lovable/gpt-engineer bot authors). Forced `origin/main`. Stats contributors = sole owner; `/contributors` list can lag GitHub cache. Guards: cli-config attribution off, `prepare-commit-msg` hook, `.cursor/rules/no-cursor-git-attribution.mdc`.

**Performance scoring v1 (2026-08-03):** Performance is a ratings layer on Contributions activities. System ratings derive from contribution capacity/impact/collaboration (verified + platform-direct weighted higher). Peer ratings in `profile_performance_ratings` (any member except self, one per event). Own Performance panel is read-only; other profiles can rate. Module: `src/lib/civizen-performance.ts`. Panel: `PerformanceDetailsPanel`. LANGUAGE_PACK_VERSION 104.

**Dial tier ring readability (2026-08-02):** Progress fill is split across the five unequal tier bands with hairline gaps + knockout separators so all sections stay visible when the ring is full (Builder teal no longer hides the 30% mark). Percent sits at the true tip (full 360°); upright from 45°–275° clockwise from top, tangent on the top wedge. **Testing v0.1.104**.

**AI skills catalog (2026-08-02):** Added AI / ML hard skills (e.g. Artificial intelligence (AI), Prompt engineering, LLMs, Generative AI) plus soft AI literacy. Short “AI” search uses token matching so Email/Air no longer false-hit.

**Unified Skills picker (2026-08-02):** One Skills sentence token opens a dual-column Hard | Soft list (stacked on narrow widths). Selecting a catalog skill auto-places it in the matching sentence list; custom add offers Hard or Soft. LANGUAGE_PACK_VERSION 103.

**Skill hover descriptions (2026-08-02):** Skills picker rows reveal a short plain-language description when hovered or keyboard-highlighted (`data-selected`). Descriptions live in `profile-skill-descriptions.ts`; search also matches description text.

**Contributions fairness fix (2026-08-02):** Armen’s 42.6 / Activities 4 came only from chat-mirrored `content_items`. Real platform work lives in `development_stories` (513 for @armen) and was not collected. Now: collect/score development stories, skip private_messages/messages content mirrors, impact-weighted quantity + sustained boost, grouped ledger UI. LANGUAGE_PACK_VERSION 102.

**Contributions activity scoring (2026-08-02):** Pipeline D+C — collect in-app civic activity into `profile_contribution_events`, estimate capacity/impact/collaboration/beneficiaries, score Contributions (anti-gaming diminishing quantity + impact), and show an activity ledger on dial/card select (`ContributionsDetailsPanel`). Sources: law, funding records, solutions, governance, posts/comments, content_items. Migration backfills history. Module: `src/lib/civizen-contributions.ts`. LANGUAGE_PACK_VERSION 101.

**Profile Experience sentence (2026-08-02):** Selecting Experience on the Score dial/cards opens a Learning-style sentence panel: “My experience includes the following [areas] at the position of [positions] for the duration of [month–year range] with [companies].” Completing all four tokens commits an entry under the lead-in (bulleted when more than one). Apple-style month/year dual picker; duration displays as a range when multiple points are selected. Autosaves to `profile_experience_entries`. Feeds preliminary Experience score. LANGUAGE_PACK_VERSION 100. **Testing v0.1.97** (build 99).

**Expanded Skills catalog (2026-08-02):** Hard/soft seed lists broadened (driving variants, pilot specialties, trades, healthcare, languages, civic practice, IT, etc.). Typing “Driving” or “Pilot” surfaces specialty rows; custom add remains available. LANGUAGE_PACK_VERSION 99.

**Profile Skills hard/soft + scoring (2026-08-02):** Skills sentence is “I possess the following hard skills: […] and soft skills: […].” Declared skills now feed a preliminary Skills category score (same diminishing curve as Learning). Root cause of missing rating: `buildScoreFromProfileActivity` only wired education → Learning. LANGUAGE_PACK_VERSION 99.

**Profile Skills sentence (2026-08-02):** Selecting Skills on the Score dial/cards opens a Learning-style sentence panel: “I possess the [multi-select Skills] skills.” Selected skills fill the token with English list formatting (commas + “and”). Autosaves to `profile_skills_entries`. LANGUAGE_PACK_VERSION 98.

**Score cards collapse + Progress bottom (2026-08-02):** Score category cards show a single line (name + score) until selected on the dial or tapped; tap again collapses. Progress to Builder moved to the bottom of the Score page. **Testing v0.1.93** (build 95).

**Profile identity + tier colors (2026-08-02):** Score page puts bio (inline editable on click/hover pencil) then name · @username with verified check (replaces world-citizenship info icon; check removed from photo corner). Name sits under the bio so the tier stays the hero. Tier palette: Explorer `#7B8AA1` · Builder `#2BA8A0` · Contributor `#3B82F6` · Catalyst `#8B5CF6` · Steward `#D9A441` (`TIER_COLORS`). LANGUAGE_PACK_VERSION 97. **Testing v0.1.92** (build 94).

**Dial progress % on arc (2026-08-02):** Percent is plain SVG text on the filled progress stroke, rotated to the arc tangent — no pill/badge/background. Prior mistake was treating it like a floating chip. **Testing v0.1.91** (build 93).

**Dial progress ring % (2026-08-02):** Ring was too thin and % sat under the photo (SVG label on the wrong radial band). Ring is now a thick battery-style track; percent pill rides the tip of the filled arc inside the stroke. `common.yes` / `common.no` added so tier requirements don’t show raw keys. LANGUAGE_PACK_VERSION 96. **Testing v0.1.90** (build 92).

**Dial photo camera + ring % (2026-08-02):** Hover/focus on the dial photo shows a centered camera overlay (full icon, not clipped at the corner). Score percent sits inside the bottom of the circular progress ring (battery-style), not under the photo. **Testing v0.1.89** (build 91).

**Score page header + dial hint (2026-08-02):** Score overview shows **tier name** on line 1 and compact **Civizen Score · 8.4** (smaller) with info icon on line 2. Stage, confidence, points to next tier, /100 score, and last updated live in the score info hover. Dial rotate hint sits **inside** the bottom-left ring corner (toward the dial), not outside. LANGUAGE_PACK_VERSION 95. **Testing v0.1.88**.

**Score dial Explorer + education flush (2026-08-02):** Unscored profiles display **Explorer** (not “Not yet scored”) on Score overview / Home; dial shows battery-style **0%** on a slightly thicker ring. Education panel flushes save on close and refreshes score inputs — certificate is not required for a preliminary Learning score. Spec Test 1 updated in `docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md`. **Testing v0.1.88**.

**Civizen Score tiers (2026-08-02):** Public tier system is Explorer · Builder · Contributor · Catalyst · Steward (not Stage: Building). Higher tiers require Performance/Contributions floors, confidence, and verified activity. Low scores use developmental colors (not red). Spec: `docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md`. Module: `src/lib/civizen-score-tiers.ts` (rules v1.0.0). LANGUAGE_PACK_VERSION 94.

**Civizen Score reorganization (2026-08-02):** Home score card and `/profile` Score page use five score categories — Learning, Experience, Skills, Performance, Contributions — instead of an endorsement-only overall score. Missing scores show **Not yet scored** (never silent zeros). Confidence and stage are separate from the number. Domains/pillars live under **Activity by Domain**; endorsements under **Evidence & Validation**. Core model: `src/lib/civizen-score.ts` (`civizen-score-v1`). Spec: `docs/03-platform/scoring-and-reputation/civizen-score-page-reorganization.md`. LANGUAGE_PACK_VERSION 93.

**Live + Testing v0.1.75 (2026-08-02):** Build 77 (`20260802-v0.1.75`) promoted to Live/Production (same APK bytes as Testing). New approved Civizen brand mark / launcher icons, Solutions Discuss/Solve, theme-toggle hover polish, Funding admin tab packing. Default Live channel previously stayed on v0.1.49, so devices on Live saw no update prompt for Testing-only builds.

**Settings Funding tabs (2026-08-02):** Funding admin section tabs pack tightly (`gap-0.5`, content-sized list) and scroll horizontally when they overflow; active tab scrolls into view. Page clips horizontal overflow; tab strip uses `overflow-y-hidden` so a secondary vertical scrollbar gutter does not appear.

**Settings Funding admin (2026-08-02):** Settings lists a single **Funding** admin row (`/settings/admin/funding`). Interest · Ledger · Audit · Compliance · Contributors use compact underline tabs (horizontally scrollable when they overflow; scrollbar hidden). Legacy `/settings/admin/funding-*` paths redirect. LANGUAGE_PACK_VERSION 87.

**Settings App channel (2026-08-02):** Removed the standalone App channel settings row. Authorized testers (`updates.test`) switch Live/Test via a flask icon beside Application version — hover opens the menu on fine pointers; click opens/toggles; selecting Live or Test applies the channel. Hint text lives in the popover footer.

**Profile dial Education card (2026-08-02):** Sentence is “Degree in Field focusing on Specialization from Institution, completed in Year in City[, State], Country.” Province hidden for smaller countries. Dropdowns highlight selected row (no checkmarks). Unverified/certificate icons before autosave. LANGUAGE_PACK_VERSION 92. **Testing v0.1.83**.

**Profile pillar dial (2026-08-02):** Dial layout locked: icon upper-left / name centered / score upper-right (equal corner inset). Credential disclaimer on Profile is a compact **info icon** beside the score (hover = summary, click = `/about/world-citizenship`). Score-page dial segments now use **score categories** (Learning → Skills → Performance → Contributions → Experience clockwise); domain labels moved to Activity by Domain.

**Theme toggle hover (2026-08-02):** Color mode control (public header + Settings) uses Popover like language select: hover opens Light/Dark/System; hover flips sun/moon to the opposite mode; click on the icon applies the opposite mode. `ThemeStorageSync` hydrates once only so it cannot revert theme changes.

**Governance Solutions Discuss/Solve (2026-08-02):** `/governance/solutions` supports **Discuss** (default: public thread + AI participation) and **Solve** (categorize → route to civic authority taxonomy → seek certified professional). Catalog: 37 jurisdiction-agnostic authorities in `solution-authorities.ts`. Copy updated on Governance landing. LANGUAGE_PACK_VERSION 82.

**Home Post composer (2026-08-02 / 2026-08-03):** Placeholder is name-free (“Share an idea, update, or opportunity...”) because Welcome already greets the user; empty state uses `SlowRunningText` with `onlyWhenOverflow` on narrow widths. LANGUAGE_PACK_VERSION 109.

**Civizen logo (2026-08-02):** Replaced hand-drawn mark with assets converted from the approved Primary logo + icon-only PNGs (`docs/04-operations/dev/brand-source/`). `scripts/convert-brand-logos.mjs` knocks out paper white, builds light/dark transparent marks + app tiles + SVG wrappers. Header uses `CivizenBrandIcon` → `civizen-mark-256.png` / `civizen-mark-dark-256.png`. Slogan unchanged: **For a Mature Humanity**.

**Governance Solutions council (2026-08-02):** Member surface `/governance/solutions` — post a Problem; `solutions-agent-council` runs ChatGPT → Gemini → Claude until consensus or split. Migration applied; edge function deployed. Ops: `docs/04-operations/dev/solutions-council.md` (set `ANTHROPIC_API_KEY` for Claude). Links from Governance landing + Settings. LANGUAGE_PACK_VERSION 80.

**Public auth brand lockup (2026-08-02):** `PublicAuthHeader` keeps the mark on the same row as the title (Civizen); slogan sits under the title, indented past the icon.

**Public sticky header auto-hide (2026-08-02):** Public chrome (`PublicPageHeader` via shell + onboarding) is fixed at the top (logo + language + theme; no account icon). Hides on scroll down, reappears on scroll up; elevates with blur/border after leaving the top. Safe-area padding lives on the header; page shells no longer double-apply `safe-top`. Single-segment trails (e.g. Login “Civizen”) sit beside the logo on the same row; multi-segment trails still use row 2 with overflow root-lift.

**Public section trail (2026-08-02):** Path uses ` > ` spacing. Full path stays on the second line when it fits; if it overflows, the root section lifts beside the logo and the remaining crumbs stay on line 2 (scrollable, last crumb fully visible, leading `…` when needed).

**Civic voting chrome (2026-08-02):** Section label beside the logo shows at all widths (truncates). Visitor back control is a `<` chevron inline before the page title (no separate “Back to …” button row).

**Onboarding hero + harm card (2026-08-02):** Hero card no longer duplicates the Civizen mark (public header logo is enough). Harm card uses a fieldset legend for “Harm we work to end”; Integrity is Fraud · Lies · Irresponsibility; items are inline comma-separated text. LANGUAGE_PACK_VERSION 78.

**Governance nav clarity (2026-08-02):** `/governance` = public Governance landing; `/governance/voting` = Elections catalog (chrome label stays “Governance”; in-page title remains Civic voting / Elections). Back control is “Back to Governance”. Landing product/system-map Governance cards link to `/governance`. LANGUAGE_PACK_VERSION 77.

**Public chrome polish (2026-08-02):** Language menu opens on hover (fine pointers) and click; selected row is highlighted without a left checkmark. Public header shows the section name beside the logo from `sm` up. Footer legal disclaimer paragraph moved off every page — full notice stays on `/about/legal-status`; footer keeps the Legal status link. **Testing v0.1.53** (build 55, `20260802-v0.1.53`).

**Public home logo + Node LTS (2026-08-02):** Public pages show the Civizen mark top-left linking to `/` (`PublicHomeLogo` / `PublicPageHeader`). Language/theme stay top-right. Node pinned to **24.18.1** (latest LTS Krypton) via `.nvmrc` + `engines`; local nvm default and production `/usr/local` runtime updated. Ubuntu apt `nodejs` 18 may still exist as `/usr/bin/node` without sudo removal — shells should prefer nvm/`~/bin`. **Testing v0.1.52** (build 54, `20260802-v0.1.52`); Live/Production Android remains on prior release until soak.

**Public language select flags (2026-08-02):** Closed control shows a round country flag (not the language name); dropdown rows keep labels and add the matching round flag on the left. Globe icon beside the control removed (it was a language affordance, not a home logo). Helper: `getLanguageFlagCountryCode` in `i18n.runtime.ts`. **Testing v0.1.51** (build 53, `20260802-v0.1.51`); Live/Production remains on prior release until soak.

**Purpose-alignment correction v0.5 (2026-08-01):** Coordinated docs + public-copy pass distinguishing Civizen’s **current** voluntary, non-governmental stage from its **long-term** aim to unite people as citizens of humanity and build a legitimate pathway toward recognized planetary citizenship. Pathway: `/about/planetary-citizenship-pathway`. Terms `2026-08-01-purpose-alignment-v1` (re-consent). LANGUAGE_PACK_VERSION 70. Standing rule: distinguish “not currently” from “never.” Public language remains interim and subject to professional legal/institutional review.

**Profile location + civic voting Global (2026-08-01):** Profile city/region, device geolocation, searchable geo catalogs, Global contest filter, and sample global steward election. **Testing v0.1.50** (build 52, `20260801-v0.1.50`); **Live/Production remains on v0.1.49** (build 51) until soak. LANGUAGE_PACK_VERSION 76.

**World Citizenship notice (2026-07-31):** `/about/world-citizenship` rewritten so long-term purpose (uniting people; democratic/institutional/technological/legal foundations for a broadly adopted, legitimately recognized planetary citizenship that could one day become official and potentially complement national citizenship) comes before a shorter Present Legal Status disclaimer. Removes “community activation”; clarifies current status is voluntary/non-governmental without implying the recognition goal is abandoned. Short/credential/readiness i18n notices aligned.

**Biometric sign-in (2026-07-31):** Android Capacitor `BiometricAuth` plugin unlocks an EncryptedSharedPreferences-stored Supabase session via BiometricPrompt. Enable under Settings → Privacy; Login shows “Sign in with biometrics” when a vault session exists. Web/stub reports unavailable. Native: `BiometricAuthPlugin.java`; JS: `src/lib/biometric-auth-plugin.ts`, `src/lib/biometric-sign-in.ts`. **Testing v0.1.48** (build 50) published; Live/Production remains on v0.1.47 until soak.

**Public governance browsing (2026-07-31):** `/governance` is a public landing; `/governance/voting` (+ election detail/observe) are public. Member proposal hub moved to `/governance/workspace`. Anon SELECT on `civic_elections` / contests / candidates / voting_events. Home Governance card visible to all signed-in roles including guests; public footer links to Governance.

**Civic voting UI declutter (2026-07-31 / 2026-08-01):** Election detail shows title + candidates first; session tools folded. Hub: scrollbar-free centered soft-colored tier tabs; default tier = nearest deadline; compact 2-row cards; Elections header = count beside title + City/State/country-flag location filters.

**Profile current location (2026-08-01):** `profiles.city` + `profiles.region_code` (migration applied). Edit Profile has City / State + “Use device location” (GPS permission → BigDataCloud reverse geocode → city, region, country). Voting hub defaults filters from profile location; if missing, requests device location once and persists to profile. Android manifest includes fine/coarse location. LANGUAGE_PACK_VERSION 75.

**Civic voting Global filter (2026-08-01):** Country menu “All countries” replaced by **Global** (planet icon) for Civizen-wide contests (`scope_country_code = GLOBAL`). Sample global steward election seeded. Hub/detail pages use minimal `px-1` inset (not flush, not padded).

**Civic voting location catalogs (2026-08-01):** Country / state / city filters use full geo catalogs (`country-state-city`, lazy-loaded) merged with election-specific localities. Searchable menus; LANGUAGE_PACK_VERSION 76. Fixed startup crash: `Intl.DisplayNames` threw `invalid_argument` for `GLOBAL` scope on election cards — `getCountryName` now rejects non–alpha-2 codes safely.

**Remaining remediation v0.4 (2026-07-30 / 2026-07-31):** Application remediation for governance Program Readiness (no activation/demographic admin UI), residual funding/payment/transfer copy purge, clean verify gate (`npm ci` / lint / full Vitest / build / `verify:post-dev`), and release **v0.1.46** (build 48, `20260730-v0.1.46`). Engineering standards baseline reviewed and frozen with remediation doc. Canonical repository history is cleaned. **GitHub cached-object removal is pending Support** — full historical erasure is not verified. Do not claim full purge while SHA `4475df4d515e9ab7ed39f82de8ceb508638f9056` remains retrievable.

**P0-01 program readiness admin:** `/settings/admin/governance` shows Program Readiness only. Demographic ingest/feed adapters removed from the production route graph; dormant activation-demographic feed tooling lives under `research/governance-simulations/activation-demographic-feeds/` (not imported by the app). Decision labels map at the presentation boundary.

**P0-03 dead monetary copy:** Funding calculator/distribution and market buy/peerSend keys removed; agreement/prototype wording; LANGUAGE_PACK_VERSION 61.

**Institutional correction (prior):** Public tree lacks the institutional source package and superseded archives (private copies retained). Funding calculator/distribution UI removed; distribution and Luma-transfer RPCs blocked. Member ID / world-citizenship / Luma Option A / Terms `2026-07-30-institutional-v2` affirmative re-consent remain. Restricted operational materials stay out of the public tree (ops in access-controlled store). Canonical public institutional policy remains under `docs/02-policies/institutional/` with in-app index `/documents`. Do not republish hostnames, keys, ports, usernames, or production server paths in public docs. Re-clone any old local checkouts.

**P1-01 strict Luma prototype (2026-07-30):** Wallet UX renamed to Prototype credits (`/settings/prototype-credits`; `/settings/wallet` and `/settings/luma-wallet` redirect). PeerSendLumaDialog removed from production. Market Buy button removed; Start agreement / Contact only; illustrative credit amount copy. Issuance/policy engine moved to `research/economic-simulations/luma-monetary-model/` (non-operational); production uses `src/lib/prototype-credits.ts` helpers + controlling notice. GovernanceAdmin monetary policy save UI removed.

**P1-02 / P1-03 UI copy (2026-07-30):** Onboarding/public/fund/product i18n and README claims corrected (voluntary profile, non-governmental, Luma non-settling prototype, open-source orientation, staged auditability). Activation review statuses mapped at presentation boundary to readiness / program-availability labels; citizen hub no longer shows coverage % of residents.

**Public institutional UI wiring (2026-07-30):** `WorldCitizenshipStatusNotice` on Edit Profile (credential), social card, Profile, Governance hub header + activation readiness; institutional doc metadata (publication/effective/last updated, professional review, superseded/archived) on document pages and index badges; peer Luma transfer UI removed from production (`PeerSendLumaDialog` deleted); Terms acceptance version centralized in `src/lib/terms-version.ts` as `2026-07-30-institutional-v2`, with `TermsReconsentGate` on `ProtectedRoute` for version-aware affirmative re-consent.

**Public institutional surfaces:** Public Part III docs under `docs/02-policies/institutional/`; community charter under `policies/governance/`. Public app corrections: `/fund` inquiry copy without return percentages; `/fund/invest` non-offering notice; `/fund/transparency` without founder reserve / distribution engine; Terms/signup/footer legal-status + world-citizenship notices; SSN labels → Civizen Member ID; Luma described as prototype credits; LICENSE no longer claims MIT until verified. Public routes: `/documents`, `/about/*`, `/governance/about`, `/governance/charter`, `/transparency`, `/partners`, `/contribute/policy`.

**Stale chunk / startup crash after deploy (2026-07-24):** Fixed root cause of “Failed to fetch dynamically imported module” / “Civizen hit a startup issue” on `civizen.world` — missing hashed assets must return a real 404 (not SPA HTML); client auto-reloads once on chunk-load errors (`chunk-load-recovery`, `lazyWithChunkReload`); toaster/sonner are eager so they cannot fail as orphan lazy chunks. Deploy merge/asset-preservation procedures live in the access-controlled operations store.

**Levela leftovers in live data (2026-07-30):** User still saw Levela in profile menu, Nela chat, and Home — not from i18n source, but from DB: business account `biz_levela` / full_name `Levela`, linked `business_name_normalized=levela`, Home welcome post, and 6 Nela conversation messages. Scrubbed via `20260730220000_scrub_levela_user_visible_content.sql`.

**Why Civizen Exists page (2026-07-23):** `/why-this-exists` rewritten from `docs/00-foundation/why-civizen-exists-page-brief.md` — founder message structure, diversity reassurance section, three CTAs (signup / book / GitHub). Book URL is interim Amazon search via `MATURE_HUMANITY_BOOK_URL` in `src/lib/onboarding-links.ts` until a permanent store URL is configured.

**GitHub:** Canonical repo is [`maturehumanity/civizen`](https://github.com/maturehumanity/civizen). Legacy [`maturehumanity/levela`](https://github.com/maturehumanity/levela) is **archived** (README points here).

**Civizen rebrand (deep rename) — shipped to `https://civizen.world`.** Android identity is `com.civizen.app`. See `docs/04-operations/dev/CIVIZEN_REBRAND.md`.

**Slogan:** ship **For a Mature Humanity** (replaces Live Next Level). Future candidate parked: **Live as Civil Citizen**.

**Temporary host redirect:** `levela.yeremyan.net` → 301 → `civizen.world` (path-preserving). Remove the host later when old traffic dies down.

**Android update flow (2026-07-31):** Default Live; Test channel gated by `updates.test`. In-app APK install via `ApkUpdater`. Fixed “download again” loop: `INSTALL_PERMISSION_REQUIRED` keeps the prompt (no WebView navigate / no early dismiss). **v0.1.47** (build 49, `20260731-v0.1.47`) on Testing and Live.

**Funding readiness (Fund Civizen)** — Public inquiry surfaces updated per institutional policy. Canonical *public* policy: `docs/02-policies/institutional/`. Superseded exploratory funding materials are not current policy. Funding calculator/distribution UI removed.

Secondary UI focus remains **NavSecondaryCarousel / Market arc menu** — geometry must match `docs/04-operations/dev/nav-secondary-carousel.md`.

## Mandatory reads before UI work

1. `docs/04-operations/dev/AGENTS.md` (especially **Simple by default. Advanced by need. Always.**, §3, and post-dev verification)
2. `docs/04-operations/dev/nav-secondary-carousel.md` when touching secondary nav or Market bottom carousel
3. `docs/04-operations/dev/contribute-page.md` when touching `/contribute` or contribution hub lanes
4. `memory-bank/systemPatterns.md` for component map
5. `docs/02-policies/institutional/README.md` (and funding integrity / legal status) when touching funding pages or institutional copy
6. `docs/00-foundation/recognized-planetary-citizenship-pathway.md` when touching onboarding, identity, citizenship, governance, elections, legal status, partnerships, or public mission copy

## Verification

After front-end changes: `npm run verify:post-dev`
