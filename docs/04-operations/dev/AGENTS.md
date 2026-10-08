# AGENTS Notes

This file stores project-specific notes for future AI agent work.

## 0. Mandatory context loading (every session, every UI task)

Before planning or editing, agents **must read**:

1. `memory-bank/activeContext.md`
2. This file (`docs/04-operations/dev/AGENTS.md`)
3. When work touches secondary nav, Market bottom menu, or `NavSecondaryCarousel`:
   **`docs/04-operations/dev/nav-secondary-carousel.md`** (canonical UX + geometry)
   When work touches signed-in or public chrome on large screens (side rail, public header destinations, directory vs reading width):
   **`docs/04-operations/dev/large-screen-layout.md`**
4. When work touches onboarding, identity, citizenship, governance, elections, legal status, partnerships, or public mission copy:
   **`docs/00-foundation/recognized-planetary-citizenship-pathway.md`** (controlling long-term pathway)
5. When work touches institutional architecture, proposed legal entities, funding allocation principles, contributor economic claims, how governance authority is distributed, stakeholder/partnership classification, pilots/validation programs, founder transition/succession, contribution recording, or Area/Domain taxonomy:
   **`docs/institutional/institutional-blueprint.md`** (what institutions are — working blueprint, proposed structures)
   **`docs/institutional/governance-framework.md`** (how authority is exercised — subordinate Working Governance Framework; do not merge with the Blueprint)
   **`docs/institutional/stakeholder-partnership-framework.md`** (who Civizen engages — subordinate Working Stakeholder & Partnership Framework; do not merge)
   **`docs/institutional/pilot-framework.md`** (what Civizen tests with those participants — subordinate Working Pilot Framework; do not merge)
   **`docs/institutional/founder-transition-succession-framework.md`** (how founder authority evolves — specialized implementation of Blueprint/Governance principles; do not merge; do not reduce founder bootstrap access)
   **`docs/institutional/contributor-framework.md`** (Contribution Record design — working institutional design; public `/contribute/policy` remains adopted contributor policy; do not merge)
   **`docs/institutional/areas-domains-participation-framework.md`** (shared Area/Domain/Initiative taxonomy — working design; **current foundational Area model**, evolvable; do not migrate product `PILLARS` without a separate mapping task)
6. When work touches Area/Domain taxonomy, Score methodology, contribution measurement models, or other major conceptual models:
   **`docs/03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md`** (working product architecture; **not** institutional reading-path item 8; do not implement a Model Registry from this document)
   V1 Area/Domain registry (infrastructure only; do not wire existing UI): **`docs/03-platform/model-evolution/shared-classification-registry-v1.md`** · `src/lib/classification/`
7. When work touches public Areas / Initiatives, `/contribute`, `/partners`, or public participation discovery:
   **`docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md`** (working product spec; **not** `/documents`; V1 read-only `/areas` is implemented — do not expand matching, initiative schema, or nav without a separate task)
   and **`docs/04-operations/dev/contribute-page.md`** when touching `/contribute`
   Phase 1 operating model: **`docs/04-operations/dev/phase-1-pilot-operating-model.md`**
   Agreements workspace: **`docs/04-operations/dev/agreements.md`** (`/agreements` is platform-level; Market is an entry point)
   Public Market Jobs: **`docs/04-operations/dev/market-jobs-public.md`** when touching public Jobs posting, the listings board, or `/market` guest access
   Home post formatting and author editing: **`docs/04-operations/dev/home-post-formatting.md`**
   Manual identity verification (ID + selfie, staff review): **`docs/04-operations/dev/identity-verification-manual.md`**
   Business accounts (linking, switching, access requests; clients never write `linked_accounts`): **`docs/04-operations/dev/business-accounts-linking.md`**
8. When work touches Civi / the built-in assistant:
   **`docs/assistant/README.md`**, **`docs/assistant/civizen-identity.md`**, and **`docs/assistant/civizen-assistant-cheatsheet.md`**. Identity, purpose, mission, and one-sentence description come from the identity source, not from feature docs. After changing product facts Civi should know, run **`npm run assistant:knowledge`**. After adding or changing a user-facing surface, flow, public page, or mission copy, update the cheat sheet and/or `src/lib/assistant/catalog.ts` in the **same session**, then regenerate knowledge. Civi is internal-first: Civizen evidence before general AI knowledge. External resources must never override current Civizen project information.
9. Documentation map: `docs/README.md`

Cursor enforces the same list via `.cursor/rules/civizen-project.mdc` (`alwaysApply: true`).

After substantive changes, update the spec and `memory-bank/activeContext.md` in the same session.

Run `npm run verify:agent-context` to confirm these files and cross-links exist.

## Simple by default. Advanced by need. Always.

This is a core Civizen product and development principle and should apply throughout the application, including:

- member-facing interfaces;
- organization/admin interfaces;
- forms;
- dashboards;
- navigation;
- workflows;
- settings;
- documentation and implementation decisions.

### Meaning

Civizen should expose the **smallest clear interface needed for the user's immediate goal**.

Do not display every available capability merely because the underlying system supports it.

Advanced functionality should remain available when needed through progressive disclosure.

In practice:

- show essential information first;
- emphasize the user's most likely next action;
- hide secondary controls until relevant;
- reveal details through expandable sections, menus, contextual actions, filters, or dedicated detail views;
- prefer contextual intelligence and prefilled information over additional form fields;
- avoid exposing database/domain terminology when plain language works;
- avoid large control panels when a few actions are sufficient;
- do not duplicate information or controls unnecessarily;
- keep empty states especially simple;
- allow experienced/interested users to uncover deeper capabilities without limiting what the system can ultimately do.

The goal is **not fewer capabilities**.

The goal is:

**simple surface, advanced depth.**

### Icons and compact actions

Where understandable and appropriate, prefer compact recognizable icons for secondary/common actions rather than large labeled controls.

Examples include:

- `+` for create/add;
- search;
- filter;
- more/options;
- edit;
- delete;
- download;
- history.

However:

- never make hover the only way to discover or use functionality;
- icons should have accessible labels (`aria-label` or visually hidden text);
- desktop hover may show a concise tooltip/name;
- tap/click must work independently on touch/mobile devices;
- unfamiliar actions should retain visible text only when the icon would not be recognized;
- destructive actions may be a standard trash icon in compact menus, with an accessible name and the existing confirm where one already exists.

Civizen is mobile-first, so every interaction must work without hover. Prefer icons over visible wording for these actions; do not add a text label beside an icon merely because desktop has space.

### Progressive disclosure example: Agreements

On `/agreements`, a compact `+` sits immediately beside the Agreements title in every state, including the empty workspace.

Desktop hover and click both open the same creation menu. Tap/click opens it on touch. Hover is never the only way to use it.

The menu is:

- Search types
- General Agreement
- Partnership / Collaboration
- Employment Agreement
- Service / Contribution
- Sale / Purchase
- Lease
- Funding / Sponsorship
- More agreement types…

**More agreement types…** is the last item in that same dropdown — not a separate control outside it. Selecting it reveals specialized options in the same popover:

- Memorandum of Understanding
- Pilot / Collaboration Agreement
- Program Agreement
- Data / Research Agreement
- Confidentiality / NDA

If search matches a supported type (including aliases such as job → Employment, car → Lease), offer that type. If nothing suitable matches, show **+ Create “{name}”**. That stores an explicit custom type on the agreement (`custom` + the entered name). Do not add user-entered names to the governed type registry, and do not keep **Other** as a standing catch-all row.

Selecting a **supported** type opens that type’s purpose-built Agreement document — not a vertical form asking for type, title, other party, and purpose. The page header is **Agreement on**. Hover or click/tap **Agreement on** to open the same type menu as the list-page `+`. The document heading names the kind (**Service Provision** by default for Service / Contribution, with **Contribution** on hover; **Lease** offers Residential, Commercial, Car, Vehicle, Equipment, Office, and Property rental). An optional user/organization reference sits on the right of that heading line (default: service-provider initials or organization abbreviation; editable or blank). A Civizen **AGR-YYYY-NNNN** is assigned on the first signature and shown in small type at the lower right — not on create. Heading words look like sentence text. Party-role labels such as *the Client* are italic so names stay primary. Hover shows only the alternatives; click or tap renames the word in place (no **Rename** row). On touch, press and hold to see alternatives. Service relationships use Client / Service Provider; contribution relationships use Organization / Project / Contributor. Choosing Service Provider for yourself sets the other party to Client. New drafts prefill today’s local start date and the same calendar date one year later, shown as sentence text (**Aug 13, 2026**); hover or tap opens a compact calendar. The ending condition is one choice (specific date, until completed, ongoing, or until terminated) rendered as Agreement language. Click any sentence or paragraph to rewrite it in place. Names and long fields continue in the sentence and wrap at words, so a first name that fits the remaining line stays there. Long fields grow with the content, accept Enter for a new line, and show a compact formatting toolbar while focused. Hover or tap font, color, size, list, or alignment to pick an option (including justify and numbered lists); bold, italic, and underline toggle directly. Visible placeholders name the action needed (**Select or enter party**, **Describe the service or contribution**, **Select start date**) and use the fill-in color until typed. Optional clauses are added from a quiet **Add terms** list (inserts into the document; discreet Remove). **Create agreement** highlights the first missing required fact in the document. A custom/unsupported name opens the flexible custom Agreement skeleton.

The primary create action is **Create agreement** (internally the record is still a Draft). Template language is a working draft, not legal advice, and not jurisdiction-specific unless it actually is.

Employment Agreement is distinct from Service / Contribution. Jobs / hiring context prefills Employment. Ordinary Marketplace purchases stay as Order + Marketplace terms. A **Sale / Purchase Agreement** is only for transactions that need negotiated terms. Do not auto-require one for a normal product order. If creation starts from a listing or order that does need an agreement, prefill known buyer, seller, product, quantity, price, and currency.

If creation originates from a Pilot, Partnership, Opportunity, Project, Funding activity, Job, etc., infer the likely agreement type and prefill known context into the document.

Inline party tokens bind a unique Civizen directory match automatically. If two similarly named directory records match, show the suggestion list so the user picks the right one. Ask Person vs Organization only when the typed name is not in the directory and the kind cannot be inferred.

Empty-state copy stays minimal (no second Create button). The `+` beside the title is the creation control.

### Enforcement

Apply this principle when implementing new functionality and when modifying existing screens.

Before adding a visible field, button, tab, filter, card, section, or explanatory block, ask:

1. Does the user need this information or action right now?
2. Can Civizen infer it?
3. Can it appear contextually when relevant?
4. Can secondary detail be progressively disclosed?
5. Is the simpler interface still understandable to a first-time user?
6. Is the deeper capability still discoverable for someone who needs it?

If the answer favors progressive disclosure, use it.

Do not interpret this policy as permission to remove important capabilities, accessibility, transparency, safety information, or necessary user control. Do **not** strip necessary detail from internal/reference documentation.

**Simple by default. Advanced by need. Always.**

## Production operations

Civizen uses managed application infrastructure and controlled deployment procedures. Production access, provider configuration, database migration access, recovery procedures, secrets management, host topology, and deployment runbooks are maintained in an access-controlled operations store.

Public repository documentation covers local development, testing, and general release requirements only. It does not authorize or describe production access.

When restricted ops configuration is available to the agent, perform production steps (migrations, deploys, live verification) privately without publishing details. Do not hand those steps back to the user as a default closing instruction unless access is definitively unavailable after a direct attempt.

## 1. Front Card Layout Preservation

- Treat the user-approved `/settings/profile` World Citizen front card layout as a fixed baseline unless the user explicitly asks to restructure it.
- Do not move existing front-card elements between layers, parent groups, or rows while implementing a small feature.
- For category-related work, only change the category-related element itself and the minimum supporting storage/admin wiring required.
- Before changing anything on the front card, inspect the current JSX and preserve:
  - parent-child relationships used by Build mode
  - existing `data-build-key` targets
  - existing spacing/alignment of non-category elements
- If a requested feature could affect layout structure, stop and isolate the change behind the smallest possible insertion point instead of refactoring the card.
- After any front-card change, verify that:
  - `ID Number`, `Given Name`, `Surname`, `Place of Birth`, `Date of Birth`, `Sex`, `Card Expires`, `Member Since`, and footer arrows remain in their existing visual structure
  - no duplicate or hidden replacement build targets were introduced
  - Build mode still maps the same visible element to the same intended layer

## 2. Repository File Hygiene

- Do not create new top-level or unrelated files in the repository unless they are clearly necessary for the requested task.
- Do not create stray tool/agent folders or files such as `.codex` inside the project unless there is a clear, user-requested purpose for them.
- Before creating any new file, prefer:
  - reusing an existing project file
  - placing notes/docs in `docs/04-operations/dev/` instead of the repo root
  - keeping temporary or tool-specific artifacts out of the project tree whenever possible
- If a new file is genuinely needed, choose the narrowest, most appropriate location and keep its purpose directly tied to the user’s request.

## 3. Persistent User Directives

- **Project-purpose preservation rule:** Legal and institutional disclaimers must accurately describe Civizen's current status, but must never erase, renounce, or permanently confine its long-term mission to unite people as citizens of humanity and develop a legitimate pathway toward recognized planetary citizenship. Always distinguish “not currently” from “never.”
- **Simple by default. Advanced by need. Always.** Core product/design principle for every surface (member, organization/admin, forms, dashboards, navigation, workflows, settings, and documentation/implementation decisions). Full policy is in this file under **Simple by default. Advanced by need. Always.** Public and onboarding experiences still must not require understanding full institutional architecture before participating. Do **not** strip necessary detail from internal/reference documentation. Also: `docs/03-platform/product-design/information-architecture-and-content-standards.md` §2.
- Do not ask the user to do work the agent can do itself (run commands, read or edit repo files, search the tree, run tests, inspect local config under the workspace). Only ask when something is genuinely impossible from here (for example passphrase entry on their TTY, secrets only they hold, or actions inside an account or UI only they control)—and then say briefly why.
- **Install and configuration default:** When a feature needs an install or environment setup (database extensions, migration apply, `.env` keys the agent can write, or production work the agent can reach via restricted ops configuration), **perform it in-session**. Do **not** hand those steps back to the user unless blocked after a direct attempt—then state the blocker and what was already tried. When restricted ops configuration is available, perform production steps privately without publishing details.
- Founder authority bootstrap rule: until the user explicitly says otherwise, keep `founder` as full-access across app and admin settings (including users/roles/permissions/governance/modules). Do not reduce founder access as part of decentralization refactors unless the user explicitly requests that transition in the same session. Institutional parent: `docs/institutional/founder-transition-succession-framework.md` (current conceptual stage **F0**; public availability ≠ official deployment; **functional self-sufficiency**, not official-use designation alone, governs later step-back).
- **Delegation stop rule:** Never end a turn with “you should apply the migration” (or similar) when the agent can run the project’s non-interactive migration path with restricted ops configuration available. Capture the outcome in-session, and only involve the developer if that path fails after a direct attempt. Do not publish hostnames, keys, or paths in the public repo.
- When the user gives recursive or standing instructions using phrases such as `Always`, `Never`, `make sure`, `don't`, `keep`, `preserve`, or similar strong directive language, treat them as persistent project rules, not one-off comments.
- Capture those instructions in context and continue following them across later requests unless the user explicitly changes or cancels them.
- Before making a change, check whether it conflicts with any previously stated standing instruction from the user.
- If a new request appears to conflict with an older standing instruction, pause and resolve that conflict narrowly instead of silently overriding the older rule.
- Especially preserve standing instructions about:
  - layout stability
  - keeping specific screens or components as the baseline
  - avoiding unrelated files or side effects
  - limiting scope to the exact requested area
- Never make unrequested changes. If a requested feature needs adjacent adjustments, keep them minimal and directly necessary, and say so clearly.
- **Clarifying questions only when ambiguous:** Do not use optional phrasing such as “If you want” or “Let me know if you’d like” when the user’s message already implies or requires a specific follow-up. In that case, either do the aligned work in the same turn or state plainly what you did and why. Ask a direct question only when intent is genuinely unclear or when you must choose among mutually exclusive options that were not specified.
- **Input-control replacement gate:** Never replace a working native `textarea` / `input` / focusable control with `contentEditable`, a floated/absolute chrome composite, or another custom editor for layout/aesthetics unless the **same session** adds (1) an automated interaction proof that **click/tap on the visible empty field → focus → type at least one character** still works, and (2) a runtime verify script (or extension of an existing one) wired into `npm run verify:post-dev` when the control is on a primary surface (Home/Study/Market/Messaging). Layout-only Vitest/smoke is not enough. Prefer keeping the native control when wrap/visual goals can be met without swapping primitives. Agreements names and long fields use `contentEditable` so they wrap at words in the sentence (a first name that fits stays on that line); they keep `pointer-events-none` placeholders and Vitest click→focus→type proofs in `AgreementCreate.test.tsx`. They are not a primary surface, so they do not add a Playwright `verify:post-dev` script.
- **Concurrent page ownership:** When the user is actively developing **Market** (market routes under `src/pages/` and closely related market components) or **Messaging** (`/messaging` and messaging pages/components), **avoid** unsolicited edits in those areas unless the task explicitly requires them. Prefer governance work in `src/lib/governance-*`, governance and admin settings pages, `Home.tsx` only when the change is clearly outside market/messaging, migrations, and `docs/04-operations/dev/`. If a change must touch shared layout or the router, keep the diff minimal and expect possible merge coordination with the user’s branch.
- Never use code-like or translation-key-like text on user-facing screens. Replace it with short, human-friendly labels that clearly describe the element.
- **Known-field use (do not re-ask):** When a form needs details the signed-in user already has (name, email, phone, age, country, and similar profile fields), take them from `useAuth()` profile/session and **do not display those fields** while they are complete. Show a field only when the value is missing. Prefill only empty fields so manual edits are preserved; keep shown fields editable. Do not force the user to re-read identity they already provided.
- **Standard form fields:** Text inputs and textareas use the outlined field: a visible rounded border with the **label on the upper-left border** (`OutlinedField` in `src/components/ui/outlined-field.tsx`), not a stacked label above a dashed underline. Do not invent different field chrome unless the user gives explicit layout instructions for that surface. Sentence tokens, search bars, compact popover scraps, and non-field controls are exempt.
- When the user asks for **continuous decentralization work** (for example “keep moving on” or equivalent), **chain the next bounded slice after each progress report** without waiting for another prompt—**prefer the same assistant reply** when the next slice is still small and unblocked—until you need product or technical clarification, hit a hard environment limit, or the user changes direction.
- When the session topic is **Civizen decentralization** (verifier mirror / federation rollout, roadmap §14–§17, or related governance ops), end each assistant report with **two** progress figures: **(1) Overall decentralization** — use `docs/04-operations/dev/verifier-federation/rollout-plan-v0.1.md` §9 row **Roadmap §17** (full product decentralization success condition; currently **~30–38%**). **(2) Active component** — the §9 table row that matches the work in that turn (for example **Roadmap §14 slice ~66–73%** for minimized-trusted-backend / federation exchange items, or **~100%** for the verifier-federation rollout plan §4 **implementation** row when that artifact is the scope; **§10 field rehearsal** remains a separate non-percentage gate). If both apply, state both component figures briefly. §9 percentages are **not calculated**; update the doc when a substantive milestone warrants it; **do not** bump figures for copy-only or cosmetic-only changes.
- Never place one visible element on top of another unless overlap is part of the element's intended design or the user explicitly asks for it.
- Make sure all user-visible assets and editable elements on every page are explicitly registered in Build mode and Layers, labeled in user-friendly language, and nested in the correct parent order so they can be selected and edited reliably.
- In Build mode, clicking a visible asset should select it without triggering its normal app interaction first, and the current selection should be shown in both the Build panel and the Layers panel.
- When an element is selected in Build mode, make sure the Layers tree auto-expands the relevant parent chain and visibly highlights and scrolls to that selected item.
- When tightening Build mode / Layers coverage on a page, audit earlier existing elements on that same page too, not just newly added elements, so older text/value nodes do not get left behind as group-only targets.
- Do not wait for the user to name missed sub-elements one by one. When a composite field is touched, audit and register its obvious inner parts in the same pass.
- Proactively enforce all standing instructions and notes in this file on future work. Do not wait for the user to repeat them when they clearly apply.
- **Bug fixes ship to Live immediately (standing rule, 2026-08-11):** When the change is a bug fix / confirmed fix / “ship the update,” publish so **Live/Production** clients get the update prompt in the **same session**. Do not leave a fix on Testing-only while Live stays on an older build unless the user explicitly asks for Testing-only soak.
  - Default path for a fix: bump → build/publish Testing → **immediately promote that exact build to Live** (`npm run promote:android-testing-to-release`) → deploy web/APK manifests → verify both live endpoints.
  - Larger exploratory features may still soak on Testing first when the user frames them as Testing-only; when unclear and the work includes a user-facing bug fix, prefer Live.
- When the user asks to **`update the application`**, publish a real new build and deploy it. For bug fixes, Live must move in that same session (see rule above). Testing remains available as a pre-release channel for gated testers (`updates.test`).
- `npm run update:application` still defaults to building the Testing channel artifacts; for bug fixes, follow with promote-to-release (or an explicitly approved `CIVIZEN_UPDATE_CHANNEL=both` / release publish) so Live matches. Do not use release/both casually for unrelated experiments without intent to update Live.
- Treat `docs/04-operations/dev/ENVIRONMENT_LIFECYCLE.md` as the canonical release/data-isolation policy.
- Standard release sequence for a **bug fix / confirmed fix ship**:
  1. Bump release metadata (`npm run release:bump -- patch` unless instructed otherwise).
  2. Build and publish (`CIVIZEN_UPDATE_CHANNEL=testing npm run update:application`).
  3. Promote that exact build to Live (`npm run promote:android-testing-to-release`).
  4. Rebuild `dist/` if needed so the release payload contains the latest manifests/download links.
  5. **Same-session production publish:** when restricted ops configuration is available, publish via the project’s controlled deployment procedures privately (do not publish how).
  6. Verify live `/updates/android-testing.json` and `/updates/android-release.json` (or `.js`) both match the shipped version (Live must not lag behind the fix).
- **Stop condition:** do not report a bug-fix ship complete while Live still advertises an older build, unless production access is definitively unavailable (state that explicitly).
- Do not commit or push APK binaries to GitHub for this project. APKs should exist only as local build artifacts on this machine and as deployed download files on production.
- For Study/Constitution UI changes, preserve all existing user-visible labels/structure unless the user explicitly asks to modify that exact element. Do not remove, rename, or restyle article/sub-article labels when the request is about behavior only (for example open/close interactions).
- When the user asks to update/publish the application for testing, always perform a real release bump first (new `APP_VERSION`, `ANDROID_VERSION_CODE`, and `APP_RELEASE_ID`) before running the update/deploy flow, so installed clients can detect and prompt for the new update.
- **Tests with every module/page change:** Whenever you **create or modify** a `src/pages/**` route/page, a user-facing component (especially under `src/components/`), or a non-trivial `src/lib/**` module, **in the same session** add or update Vitest coverage before calling the work done:
  - **Pages / admin UI:** at minimum a mount/smoke render (or an entry in `src/pages/page-smoke.test.tsx` critical-render set) that would catch missing imports and `ReferenceError`s; prefer co-located `*.test.tsx` for behavior that matters.
  - **Lib modules:** unit tests for exported helpers/rules used by UI or RPC boundaries; do not treat helper-only tests as enough when the real risk is page JSX.
  - **Modify path:** update existing tests when behavior changes; do not leave stale assertions.
  - **Stop condition:** do not report a feature/fix complete if new or changed modules/pages lack corresponding test updates, unless the change is docs-only or an explicit user waiver in that session.
  - Run the new/updated tests (`npm test` or a focused `vitest run …`) in addition to `npm run verify:post-dev` when UI changed.
- **Civi must be informed in the same session (standing rule, 2026-08-16):** When you add or change a user-facing surface, flow, public page, or mission copy Civi might be asked about, update `docs/assistant/civizen-assistant-cheatsheet.md` and `src/lib/assistant/catalog.ts` (FAQ and/or capability) in that session, then run `npm run assistant:knowledge`. Canned skip-LLM replies must still match those sources. Knowledge regen already indexes live nav, Contribute lanes, and Civi page links (`NELA_PAGE_LINKS`). Stop condition: do not ship a new Live surface that Civi cannot name or route.
- **Development outcome capture:** After a coherent shipped development outcome (not each prompt or commit), record it with `recordDevelopmentOutcome` / `planDevelopmentOutcomeStories` (`src/lib/civizen-development-capture.ts`) using a stable `outcomeRootId`, originating instruction, real features, commit SHA, `testsPassed`, roles, and `implementationAssisted`. Historical journal rows are reconstructed separately (`src/lib/civizen-historical-reconstruction.ts`, `docs/04-operations/dev/historical-development-reconstruction.md`); do not restore chat/git rows as independent contributions. Do not set Contributions/Performance/overall scores directly.
- **Contributions ledger:** Canonical contribution roots that affect Score V2 must stay inspectable on `/profile/contributions` (search, filter, sort, pagination). The compact Profile preview may show recent titles only. Do not collapse roots into one type-aggregate card. Contribution evaluation is on-read (`contribution-evaluation-v3` lifecycle, `human-contribution-substance-v1`, `contribution-provenance-v1`). Score the human work, not the prompt: a message is normally provenance. Attach human chat to an existing root when it materially influenced that outcome; do not mint a root per message. Persist stable `provenanceStoryIds`, not raw prompt dumps. AI assistance is execution method, not a reputation recipient, and does not erase evidenced human design, specification, review, or validation. Trivial cosmetic prompts are not standalone contributions. Prompt count, prompt length, and hours are not score multipliers. Stored 78/78/35 placeholders are not evaluations. Unknown realized impact stays unknown. Contributor function comes from evidenced human roles, not from artifact file type. Later impact evidence, beneficiary feedback, and independent validation attach to the same canonical root (`contribution_evidence_records`) and recompute Score V2 on read. Evaluator reputation and declared Civizen context are not score bonuses. Do not retune Score V2 priors/shrinkage to restore a previous number. Overall evidence confidence stays Low until independent validators and realized-outcome evidence exist; verified volume alone does not raise it. When reconstruction proves a non-persisted cluster is a duplicate or same-outcome overlap of a persisted root, inherit qualifying human provenance onto that canonical root — do not mint another contribution, do not count the same interaction twice, and do not piggyback implementation-insufficient or merely related work. Live capture should set a stable `outcomeRootId` from the start (human provenance → outcome root → implementation/tests → Score V2); historical reconstruction is fallback only.

## 4. Application Versioning

- The app release source of truth lives in `src/lib/app-release.ts`.
- Keep these three values aligned for every release:
  - `APP_VERSION`
  - `ANDROID_VERSION_CODE`
  - `APP_RELEASE_ID`
- `android/app/build.gradle` reads its Android `versionName` and `versionCode` directly from `src/lib/app-release.ts`.
- The mobile app update prompt reads the live script manifest at `/updates/android.js` on `https://civizen.world`.
- Keep `/updates/android.json` as the human-readable mirror for verification and debugging.
- `scripts/update-application.sh` is responsible for:
  - building the web app
  - removing `dist/downloads` before Android asset sync (website APK files must not be embedded inside the mobile APK)
  - syncing Capacitor Android assets
  - building the APK with `./gradlew clean assembleDebug` to avoid stale packaged assets
  - publishing both the legacy and versioned APK filenames
  - regenerating `public/updates/android.json`
  - regenerating `public/updates/android.js`
- APK size sanity check for releases:
  - verify the built APK does not contain `assets/public/downloads/*` entries
  - if APK size jumps unexpectedly (for example >2x from previous release), treat it as a packaging regression and inspect APK contents before publishing
- `scripts/release-bump.sh` updates the version source of truth in `src/lib/app-release.ts`, bumps the Android build number, and syncs `package.json` plus `package-lock.json`.
- The step-by-step human release guide lives in `docs/04-operations/dev/RELEASING.md`.
- After versioning changes, verify all three of these outputs together:
  - the APK filename linked on the live website
  - the live `/updates/android.json` manifest
  - the installed Android app's bundled version/build values
- Before saying the application is updated, verify the live site and live APK on `https://civizen.world`, not just local build output or GitHub.
- When publishing, update both the live web assets and the live Android APK served from the currently linked download path on the website.

## 5. Local Release Payload Guardrails

- Never publish a bloated `dist` archive when payload size is unexpectedly large.
- Before packaging a release payload, run a payload preflight and verify:
  - `du -sh dist` is in the expected range for the current release
  - `dist/downloads` contains only:
    - `civizen-debug.apk`
    - `civizen-debug-${APP_RELEASE_ID}.apk`
- If old versioned APK files are present in `public/downloads` or `dist/downloads`, prune them **before** `npm run build` / `update:application` copies `public/` into `dist/`. Keep only the current `civizen-debug.apk`, `civizen-debug-${APP_RELEASE_ID}.apk`, and the current testing/release channel APKs for this `APP_RELEASE_ID`.
- If the release archive is unexpectedly large (for example >50 MB for this project), stop and investigate instead of uploading.
- Do not repeatedly bundle historical APK archives inside new release payloads.

## 6. Agent Correction Notes

- When an agent discovers a repeated mistake or process gap, add a concrete prevention rule to this `AGENTS.md` file in the same session.
- Notes must include:
  - the failure pattern
  - the mandatory preflight/validation check
  - the stop condition that blocks repeating the same error
- Do not rely on memory alone for repeated-release safeguards; encode them as explicit written rules.
- **2026-04 correction — migration handoffs:** Failure pattern: closing with “apply this migration on production” without applying it when restricted ops configuration is available. Mandatory check: after adding or changing `supabase/migrations/*.sql`, apply via the project’s agent-accessible path when configured; confirm success or report the failure output. Stop condition: do not ask the developer to run production migration steps unless the agent environment truly cannot reach production after a direct attempt.
- **2026-04 correction — avoid unnecessary user command delegation:** Failure pattern: asking the user to run operational commands (migrations, backfills, verification queries) even though this environment can run them. Root cause: the agent assumed missing credentials/permissions too early and delegated before performing environment preflight checks. Mandatory preflight: before asking the user to run any command, the agent must check available local scripts, local env values, and restricted ops reachability when configured. Stop condition: do not delegate command execution to the user until at least one direct execution attempt has failed with explicit blocker output that cannot be resolved by the agent in-session.
- **2026-05 correction — arc UX vs scripts:** Failure pattern: declaring arc work done when `verify:arc-carousel-visible` passed with only 3 pills and steep ~70° rotation, while the approved mock shows a wide shallow arc with **Sell · For you · Local · Jobs**. Mandatory check: read `docs/04-operations/dev/nav-secondary-carousel.md` before edits; run `npm run verify:post-dev` (includes `verify:agent-context`); compare screenshot to spec. Stop condition: do not report arc complete unless layout script passes **390px ≥4-offset geometry** and visible script shows **Jobs** without >12% bbox overlap with **Local**.
- **2026-07 correction — Android update “download again” loop:** Failure pattern: missing `REQUEST_INSTALL_PACKAGES` / unknown-sources permission caused `ApkUpdater` to reject with “try again”, then JS fell back with `window.location.assign(apkUrl)` (navigating the WebView away) and permanently dismissed the prompt before install succeeded. Mandatory: treat `INSTALL_PERMISSION_REQUIRED` as a retryable in-app state (open settings, keep prompt, do not browser-fallback); only dismiss after installer launch or explicit Later; never replace the Capacitor document with the APK URL—use an external intent. Stop condition: do not ship update-flow changes that dismiss on permission failure or navigate the WebView to the APK.
- **2026-07 correction — update channel UX:** Failure pattern: shipping fixes only to Testing while default users (including operators on Live) see no prompt; public Test/Live switcher confuses everyone. Mandatory: default Live; gate Test with `updates.test`; promote soaked Testing builds to Live for general distribution; prefer in-app APK install over browser redirect on sideload builds.
- **2026-07 correction — messaging composer gated on list loading:** Failure pattern: Civi/thread textarea stays `disabled` because `composerDisabled` included `conversationsLoading`, and Civi ensure/`private_list_my_conversations` could hang without `finally`. Mandatory check: composer enablement depends only on selection / block / selection-mode — not inbox loading. Stop condition: do not ship messaging changes that disable typing while a conversation id is already selected.
- **2026-07 correction — institutional policy supersession:** Failure pattern: treating superseded Funding Constitution, tokenomics, Luma-as-currency, founder-reserve, or contributor-proceeds language as current policy for public copy or agent answers. Mandatory check: read `docs/02-policies/institutional/` and public routes under `/documents` (and related `/about/*`); do not treat exploratory or superseded materials as current policy unless the user asks for historical material. Stop condition: do not publish fixed investor/contributor/founder percentages, tax-deductibility claims, Luma-as-money, or SSN labels.
- **2026-07 correction — public ops hygiene:** Failure pattern: documenting production access, host topology, secrets, provider reconfiguration, recovery, or deploy internals in public docs. Mandatory check: keep those procedures in the access-controlled operations store only. Stop condition: do not add production HOW-to detail to public `AGENTS.md`, release notes, or SSH stubs.
- **2026-08 correction — missing page/UI tests:** Failure pattern: shipping page/component refactors (e.g. UsersAdmin split) with only `src/lib` helper tests; missing imports (`Select`, `manageableRoles`) passed CI until runtime boot crash. Mandatory check: for every new or modified page/module, add or update Vitest in the same session (page smoke/mount and/or co-located `*.test.tsx` / `*.test.ts`); keep high-risk admin routes in `src/pages/page-smoke.test.tsx` render-critical set when applicable. Stop condition: do not close a page/module change without running the new or updated tests successfully.
- **2026-08 correction — public chrome AuthContext in tests:** Failure pattern: adding `useAuth` to `PublicPageToolbar` (or other public chrome) without updating Download/Onboarding (and similar) page tests that render public headers; CI fails with `useAuth must be used within an AuthProvider`. Mandatory check: when shared chrome gains a context hook, run/update every page test that mounts that chrome; mock AuthContext (logged-out for public pages) in the same session. Stop condition: do not ship chrome/auth wiring changes until those page tests pass.
- **2026-08 correction — historical APKs hang the ship rebuild:** Failure pattern: `CIVIZEN_UPDATE_CHANNEL=testing npm run update:application` finishes Gradle, writes `android-testing.json`, then hangs for hours on the follow-up `npm run build` because Vite copies every leftover `public/downloads/*.apk` into `dist/` (WSL I/O can then freeze so even `kill` looks stuck). Mandatory check: before that website rebuild, prune historical APKs; `public/downloads` must not keep prior `APP_RELEASE_ID` archives. If the rebuild hangs after the testing APK and testing manifest already exist, kill the hung Vite/`update:application` process, prune, run `npm run promote:android-testing-to-release`, then `npm run build` and deploy — do not wait hours and do not rebuild Gradle unless the current testing APK is missing. Stop condition: do not start `update:application` or `npm run build` while `public/downloads` still contains older versioned APKs; do not report a Live ship complete while live `/updates/android-release.json` still shows the previous version.
- **2026-08 correction — push without watching CI:** Failure pattern: agent pushes to `main`, reports done, and leaves a red CI stream (user only notices via Gmail). Mandatory check: after every `git push` to a tracked branch with CI, run `npm run verify:ci` in the same session and keep working until it exits 0 (or fix the failure and push again). Stop condition: do not claim a push is complete while `verify:ci` is pending or failed.
- **2026-09 correction — push without local CI parity:** Failure pattern: agent pushes feature work that fails GitHub CI on `assistant:knowledge:check` (stale `knowledge-pack.ts` or `nela-bundle.js`) or `audit-ci` (new npm advisories), then fixes in follow-up commits while the user gets failure emails. `verify:ci` is reactive (post-push only). Mandatory check: run `npm run verify:pre-push` **before** every `git push`; when product facts / assistant sources / catalog / cheat sheet change, run `npm run assistant:knowledge` and commit both generated files in the same commit. Stop condition: do not push until `verify:pre-push` exits 0.
- **2026-08 correction — page load waterfalls:** Failure pattern: stacking full-screen gates (i18n base → auth profile/E2EE → page sequential Supabase + contribution sync) so sparse screens feel multi-second empty. Mandatory check: paint shell without awaiting unrelated bootstrap (messaging E2EE, contribution recollect); parallelize independent queries; load contribution ledger first and sync in background with TTL. Stop condition: do not ship a page that keeps a full-screen spinner until every secondary sync finishes.
- **2026-08 correction — deploy disk fill:** Failure pattern: every deploy wrote a full-site backup tarball and retained every historical testing APK until the VPS filled (~97%) and extract failed mid-deploy (truncated APKs). Mandatory: keep ≤2 backups; prune non-release versioned APKs from `downloads/` during deploy; verify APK byte size after publish. Stop condition: do not report deploy complete if remote disk is critically full or versioned APKs are tiny/truncated.
- **2026-08 correction — bug fixes stuck on Testing:** Failure pattern: shipping a confirmed bug fix only to Testing while default Live clients (including the owner) stay on an older build and never see an update prompt. Mandatory: for bug fixes, promote the exact shipped build to Live in the same session and verify `/updates/android-release.json` (and `android.js`) match. Stop condition: do not report a bug-fix update complete while Live lags Testing.
- **2026-08 correction — post likes RLS `user_id` binding:** Failure pattern: Home showed optimistic “Liked” then toast **Could not save like**. Live `post_likes` INSERT/DELETE policies used `EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND …)`. Inside `FROM profiles`, unqualified `user_id` bound to **`profiles.user_id`**, becoming `profiles.id = profiles.user_id` (false). `has_permission('like.create')` was still true. Mandatory: qualify as `profiles.id = post_likes.user_id` (never bare `user_id` next to `FROM profiles`); after any `post_likes` / similar ownership RLS change run `npm run verify:post-likes-rls` (wired into `verify:post-dev`). Stop condition: do not ship feed like/comment ownership policies that contain `profiles.id = profiles.user_id` or unqualified `id = user_id` inside a `profiles` subquery.
- **2026-08 correction — Home post composer dead click (process + interaction):** Failure pattern: on **2026-08-03**, agent work for **Testing v0.1.128** (`737086f`, “wraparound Home post composer”) replaced a **working** Home `<textarea>` with floated `contentEditable` + `shape-outside` for wraparound aesthetics. Empty-field taps on placeholder/padding/avatar stopped focusing the editor. Layout/autosize releases (`v0.1.125`–`v0.1.128`) and `verify:post-dev` (arc/dev-load only) all passed; **no click→focus→type gate existed**, so a functional regression shipped until the user reported it on 2026-08-11. Technical proximate cause: empty editor `min-h-[1.5rem]` vs 40–48px avatar and no chrome→focus path. **Process root cause:** aesthetic input-primitive swap without an interaction regression proof. Mandatory: keep `focusHomePostComposerFromChrome` + avatar-row min-height + `pointer-events-none` avatar; Vitest `home-post-composer-focus.test.ts` / `Home.composer.test.tsx`; **`npm run verify:home-post-composer`** (Playwright chrome-click → focus → type) inside `verify:post-dev`; follow **Input-control replacement gate** in §3 for any future composer/editor swap. Stop condition: do not ship Home composer or any primary-surface input-primitive change while `verify:home-post-composer` / `verify:post-dev` fails, or without an equivalent interaction gate for a new control.
- **2026-08 correction — web login/signup lockout after profile miss:** Failure pattern: auth session succeeds, then `profiles` fetch fails/hangs; `TermsReconsentGate` stays on `wait-for-profile` **Loading…** forever; `AuthRedirect` sends `/login` and `/signup` back to `/`, so Login/Sign up appear broken. Introduced with Terms re-consent (**2026-07-30**); made common after auth stopped gating on profile (**2026-08-03**, `3c3fe10`). Mandatory: `profileLoadFailed` + timed-out recovery UI (Retry / Sign out) in `TermsReconsentGate`; never infinite wait-for-profile without an escape; cover with `terms-version` + `TermsReconsentGate` tests. Stop condition: do not ship auth/bootstrap changes that leave a signed-in user with no profile on a spinner that has no Sign out.
- **2026-08 correction — Civi off-topic follow-ups and ungrounded Civizen facts:** Failure pattern: Civi scoped only the literal latest sentence, so “Are you sure?” / “Positive?” after a Civizen question was rejected as off-topic; an intervening off-topic refusal then hid the original question; product answers used a short system prompt plus pretrained knowledge, mixing plans with live features. Mandatory: resolve the conversational query first (walk back past verification follow-ups and scope refusals to the last substantive Civizen question); search FAQ → capability registry → project knowledge index before any general model knowledge; “Are you sure?” / “Positive?” re-verifies the previous Civizen claim internally and corrects a prior wrong denial. After changing product facts Civi should know, run `npm run assistant:knowledge` and deploy `messaging-agent-reply` (including `nela-bundle.js`). Stop condition: do not ship assistant changes that classify a Civizen follow-up as off-topic, or that let general model knowledge override the capability registry.
- **2026-08 correction — Profile Score dial loading-shell smoke:** Failure pattern: Score-ring geometry extract left `CONTENT_RADIUS` referenced in `Profile.tsx` after the import was removed. `page-smoke` rendered Profile and unmounted while `loading === true`, so the dial JSX never ran and `verify:post-dev` stayed green. Live `/profile` crashed with `CONTENT_RADIUS is not defined`. Mandatory: Vitest `Profile.score-dial.test.tsx` must wait for the `Score categories` group (not the Loading shell); **`npm run verify:profile-score-dial`** (Playwright login → `/profile` @390px) inside `verify:post-dev`; Profile dial geometry stays inlined and must not reintroduce an unbound `CONTENT_RADIUS`. Stop condition: do not ship Profile/Score-dial geometry changes while that Vitest or `verify:profile-score-dial` fails.
- **2026-08 correction — Jobs identity re-ask + dashed fields:** Failure pattern: Market Jobs showed Full name / Phone / Age to signed-in members who already had those values, using stacked labels over dashed underlines. Mandatory: hide complete known identity fields and submit them from profile; show a field only when missing; visible text fields use `OutlinedField` (label on the upper-left border). Standing rule: AGENTS §3 **Known-field use** + **Standard form fields**, `.cursor/rules/form-fields.mdc`. Stop condition: do not ship a form that re-displays complete profile identity or uses dashed-underline stacked labels for text fields.
- **2026-08 correction — one business account per owner:** Failure pattern: a second organization could be created as a user but never appeared in Accounts, because `idx_linked_accounts_owner_business_unique` allowed only one `linked_accounts` row per owner and the create function rejected when any business was already linked. Mandatory: members may link more than one business account; keep pair uniqueness `(owner_profile_id, linked_profile_id)` and global `business_name_normalized` uniqueness; do not treat “already has Civizen linked” as “this organization is already linked.” Stop condition: do not reintroduce a unique index on `owner_profile_id` alone for `relationship_type = 'business'`.
- **2026-09 correction — sibling business accounts vanish:** Failure pattern: after switching into a second org, Accounts only showed that org plus the personal owner. `linked_accounts` SELECT RLS and `linked-account-switch` only allowed the current profile’s own row, so sibling orgs of the same owner were invisible and unswitchable; prune then dropped their stored sessions. Mandatory: sibling business rows of the same owner stay visible; `linked-account-switch` allows switching between those orgs (deploy the function, not only the UI); a stale stored session falls back to that function; Add business looks up an existing company as the name/email is typed and offers **Connect** instead of **Register**. Accounts cards sit side-by-side with the current account centered; tap a neighbor card to switch (no Switch button). Stop condition: do not ship account switching that hides a member’s other organizations while signed into one of them, or that still requires a Switch button after the card itself is the control.
- **2026-09 correction — account cards do not swipe:** Failure pattern: Accounts strip used nested `overflow-x-auto` inside a menu with `overflow-y-auto` + `touch-pan-y`. Ancestor `pan-y` intersected child `pan-x` into no panning; a vertical mouse wheel also never moved a horizontal-only strip. Pointer capture on every press plus a leftover “ignore next click” flag then ate the tap after a swipe, so the desired card never became current. Mandatory: keep horizontal scroll on the account track (`overflow-x-hidden` on the menu); map wheel and pointer drag to `scrollLeft`; do not put `touch-pan-y` on an ancestor of the strip; do not `setPointerCapture` until the drag threshold; clear the leftover-click flag on the next pointerdown. Stop condition: do not ship Accounts cards that cannot be swiped, mouse-scrolled, or tapped to switch after a swipe.

## 7. Post-development verification (mandatory after every fix or UI change)

Run this **full sequence** before telling the user a front-end task is done. Do not skip steps because a build passed.

When the change touched pages, components, or lib modules, also run the **new or updated Vitest files** for those modules (or `npm test`) before `verify:post-dev`. Helper-only lib tests are not a substitute for page mount/smoke coverage on UI entry points.

```bash
npm run verify:post-dev
```

That runs:

0. **`verify:agent-context`** — memory-bank, arc spec, and `.cursor/rules` exist; AGENTS cross-links present.
1. **`verify:dev-load`** — dev server up, `/market` reachable, critical Vite modules non-empty and exporting symbols.
2. **`verify:arc-carousel-layout`** — arc geometry at 360–480px: no stacked slots; ≥4 visible offsets on 390px Market layout; flank rotation in approved band; horizontal clearance.
3. **`verify:arc-carousel-visible`** — Playwright on `/market?section=for-you`: **Sell**, **For you**, **Local**, and **Jobs** visible (opacity &gt; 0.4); no bounding-box overlap; flank rotation checks.
4. **`verify:home-post-composer`** — Playwright on Home @390px: empty post-field **chrome click → focus → type** (guards the 2026-08-03 wraparound `contentEditable` regression).
5. **`verify:home-post-format`** — Playwright on Home @390px and @1280px: focused composer shows Bold · Italic · Underline · lists · Line spacing, not Agreement font/color/size/align controls.
6. **`verify:post-likes-rls`** — member session can **insert + delete** `post_likes` (guards the ambiguous `user_id` RLS binding that caused “Could not save like”).
7. **`verify:post-reposts`** — member session can **plain-repost + delete** without deleting the original (guards Home Repost relationship storage). Editorial pattern (Civizen source vs personal Repost with thoughts): **`docs/04-operations/dev/home-repost-editorial.md`**.
8. **`verify:post-edit`** — member can edit a new post and an old post; another user cannot; previous wording is retained in `post_revisions`; `created_at`/identity stay frozen; comments/likes/reposts survive. Spec: **`docs/04-operations/dev/home-post-formatting.md`**.
9. **`verify:home-happiness-shortcut`** — Playwright on Home @390px after login: Score-card Happiness icon visible and tappable to `/happiness` without extra wording; desktop hover tooltip.
10. **`verify:profile-score-dial`** — Playwright on `/profile` @390px after login: Score dial group visible, five categories present, no startup/`CONTENT_RADIUS` crash (guards the 2026-08-13 geometry-extract miss).
11. **`verify:happiness-foundation`** — Playwright on `/happiness` @390px after login: five-level language (no numeric Happiness Score), check-in click→type→save, Work Fulfillment entry, Work domain delegates to Work Fulfillment + Marketplace Jobs, Time plan start→complete→follow-up, privacy page.
12. **`verify:work-fulfillment`** — Playwright on `/happiness/work` @390px after login: two work contexts and primary switch, assessment, Work Joy (insufficient history then cautious pattern), Fit axes, planned→complete action + follow-up, Contribute/Study/Jobs handoff, human-readable alignment labels, no Work Fulfillment score.
13. **`verify:fulfillment-plans`** — Playwright on Happiness Improve @390px after login: start a Fulfillment Plan, explainable recommendations, persist Not relevant, action lifecycle, Did this help?, support + Civi brief, Work domain does not duplicate Work Fulfillment, private plan data stays off Profile.
14. **`verify:wellbeing-aggregate-privacy`** — Playwright on Happiness Privacy @390px after login: privacy-protected group insights setting is separate from optional sharing; enable/disable; individual remains private; Profile/Home do not publish Happiness level or aggregate participation.
15. **`verify:wellbeing-insights`** — Playwright on `/wellbeing-insights` @390px after login, using uniquely scoped synthetic aggregate snapshots: authorized organization Overview/Patterns/Action walk, community pattern, suppression/empty state, deliberate Challenge draft handoff (no auto-publish, no member identities), Profile/Home/Jobs isolation.
16. **`verify:human-outcome-loop`** — Playwright on Human Outcome Review @390px after login: Challenge → Project operational outcome → Human Outcome Review (baseline/follow-up, non-causal copy, confounding factor, public-safe lesson), Governance implementation review, null result, insufficient/suppressed follow-up, Profile/Home/Jobs/Search isolation.
17. **`verify:matters-foundation`** — Playwright after login: Contribute hub shows **Questions, Issues & Ideas** and **Suggest Improvements** as a Matter shortcut; `/contribute/matters` queues and create `+`; `/contribute/matters/new` title, description, and intended-party fields; `/contribute/improvements` lands on Suggestion create; 390px and 1280px.
18. **`verify:matters-auth`** — Member/citizen/stranger RPCs: no initiator impersonation, no unauthorized get/comment/action, comments do not complete actions, authenticated callers cannot run `process_matter_action_timeouts`. Stranger cannot start work, assign, complete, review, invite, or confirm collaborative work.
19. **`verify:matters-detail`** — Seeded Matter detail walks at 390px and 1280px for waiting Question, interim discussion, clarification, Issue waiting, initiator confirmation, overdue, auto-close, and reopen.
20. **`verify:matters-work-detail`** — Seeded collaborative-work walks at 390px and 1280px: simple Matter with no work, work just started (Invite to collaborate vs Request shared responsibility), outstanding Tasks (ordinary completion unavailable; Complete with outstanding work), shared-responsibility request, concurrent Tasks, Task acceptance, execution, blocked dependency, submitted for review, changes requested, Decision recorded, work complete / final response pending; Contribute queue shows Task context.
21. **`verify:matters-resolution-detail`** — Phase 3 Resolution / evaluation / outcome walks at 390px and 1280px.
22. **`verify:matter-agent-auth`** — Phase 4A agent-run authorization negatives (RPC + Edge).
23. **`verify:matters-ai-detail`** — Phase 4A AI assistance walks (18 states) at 390px and 1280px.
24. **`verify:matters-coding-detail`** — Phase 4B1 Coding Agent walks (14 states) at 390px and 1280px: Code assignment, isolated worktree / dirty-tree provenance, plan approval, diff/tests, denied command, scope expansion, failed tests, human review. Does not commit, push, or deploy.

Happiness connected walks (`verify:happiness-foundation`, `verify:work-fulfillment`, `verify:fulfillment-plans`, `verify:wellbeing-aggregate-privacy`) call `resetOwnHappinessRecords` first. That uses the signed-in member’s own Privacy **Delete my Happiness data** control so leftover plans, recommendation feedback, and Work Fulfillment rows from a previous walk cannot contaminate the next one. It does not delete other members’ data. `verify:wellbeing-insights` and `verify:human-outcome-loop` seed and remove synthetic aggregate scopes instead of resetting private Happiness rows.

If `verify:dev-load` fails with “empty or stale”:

- `rm -rf node_modules/.vite`
- restart dev on port **8080** (reuse existing task when possible)
- run `npm run verify:post-dev` again

Optional after scripts pass: open `http://localhost:8080/market` and compare to **`docs/04-operations/dev/nav-secondary-carousel.md`** and the approved reference screenshot (wide shallow arc, ≥4 pills).

### Arc carousel regression guards

- **Spec:** behavior and layout must match `docs/04-operations/dev/nav-secondary-carousel.md`, not only script thresholds.

- **Missing items:** do not cap `maxVisibleOffset` to ~`FOCUS_SLOT_SNAP` only. Visibility must allow at least center + one flank per side when the arc has capacity (`arcFlankCapacity`).
- **Overlapping items:** do not shrink `angleStep` with `Math.min(pitchRad, distributed)` to cram extra slots onto a phone arc — that produces ~40px gaps while pills are ~92px wide. Use **`arcPitchAngleStep`** (full pitch spacing) and hide offsets that do not fit.
- **Hidden flank items:** on a bottom-pivot arc, pitch spacing drops flank pills **below** the wheel track and behind the bottom nav (`z-40` &lt; nav `z-50`). Cap vertical drop with **`maxFlankDropPx`**, compute **`wheelHeight`** from placements, and keep carousel chrome at **`z-[56]`** (below FAB `z-[70]`).
- **Stacking:** do not clamp multiple offsets to the same `arcEndpointAngle`.

### When to run verification (event-driven — no background loop)

Run `npm run verify:post-dev` **once** at these times only:

1. **After starting or restarting the dev server** on port 8080 (confirm the app loads before continuing UI work).
2. **After completing a front-end fix or UI change** — mandatory before telling the user the task is done (see §7 above).

Do **not** start a Cursor `/loop` or `while true; sleep …; echo AGENT_LOOP_TICK_*` background monitor unless the user explicitly asks for recurring checks. Periodic 10-minute loops spam the chat and are not the default workflow.

## 8. Local Dev Port Policy

- Default local development URL for this project is `http://localhost:8080`.
- **Node runtime:** use the version in `.nvmrc` (currently **24.18.1**, latest Node.js LTS “Krypton”). `package.json` `engines.node` must stay aligned (`>=24.18.1`). Prefer `nvm use` / `scripts/start-dev-server.sh` over Ubuntu’s apt `nodejs` package (often older). Do not run Capacitor or release builds on Node 18.
- Reuse port `8080` by default; do not open new Vite dev ports (such as `8081`, `8082`, etc.) for routine work.
- Before starting a new dev server, check whether an existing server is already running on `8080` and reuse it when available.
- Only use a different port when:
  - the user explicitly asks for another port, or
  - port `8080` is genuinely unavailable and cannot be freed quickly.
- If a fallback port is temporarily required, clearly state that reason and switch back to `8080` for normal workflows.
- After every implemented fix, verify the app is actually running before reporting completion:
  - ensure the dev server is up on `localhost:8080`
  - verify the relevant page URL responds (for example with `curl -I`)
  - do not declare the fix complete until runtime is confirmed

## 9. Profile Mismatch Triage

- Failure pattern: web and phone show different Edit Profile identity data (role/photo/place) even after app update.
- Mandatory check:
  - compare profile rows for all likely identities (for example current and legacy usernames) on `user_id`, `role`, `avatar_url`, `place_of_birth`, `country`, and `updated_at` when data access is available to the agent
  - confirm whether the user is actually on a different account rather than a stale bundle
- Root-cause guard:
  - if duplicate accounts exist for the same person, do not assume frontend rendering drift first; verify account-level data mismatch before changing UI layout code
- Stop condition:
  - do not ship another UI-only fix for profile-card mismatch until the relevant profile rows are verified against the reported username/account

## 10. Mandatory Post-Fix Release + Git Sync

- Failure pattern: a fix is confirmed locally, but release/update propagation and/or Git sync is left incomplete.
- Mandatory sequence after every confirmed fix (no user reminder required):
  - run app/runtime verification on `http://localhost:8080` for the changed flow
  - if the change affects distributed app behavior (web/mobile), run the full update pipeline and, when restricted ops configuration is available, publish privately without documenting production internals
  - when publishing mobile updates intended to be detected by installed clients, ensure release metadata is bumped first (`APP_VERSION`, `ANDROID_VERSION_CODE`, `APP_RELEASE_ID`)
  - **for bug fixes:** after the Testing build is published, promote that exact build to Live (`npm run promote:android-testing-to-release`) and deploy so `/updates/android-release.json` matches; default Live clients must get the update prompt
  - commit all pending related changes in this repo (not just the last edited file)
  - **before** `git push`, run `npm run verify:pre-push` (local mirror of CI: `audit:ci`, `assistant:knowledge:check`, `npm test`, `npm run build`)
  - push `main` to GitHub
  - **immediately after push**, run `npm run verify:ci` (waits for the GitHub Actions `CI` workflow on `HEAD`; exits non-zero on failure; prints failed-log snippet + run URL)
  - verify live endpoints after publish (including both update channels when enabled — **Live must not lag** a bug-fix ship)
- Stop condition:
  - do not report completion until publish + commit + push + **`verify:ci` green** + live verification (when publishing) are all done
  - do not leave the session after a push while CI is still running or red — watch it finish or fix the failure in the same session
  - do not report a bug-fix ship complete while Live still advertises an older version than Testing
- Communication rule:
  - do not ask whether to perform commit/push/update once a fix is confirmed; execute this flow automatically
  - when reporting a push, include the CI result (success URL or the failure cause from `verify:ci`)

## 11. Testing Build Boot Safety

- Failure pattern: a newly installed Testing APK fails to start, leaving users stuck.
- Mandatory runtime safety requirements:
  - show an explicit startup failure notice when boot times out or the app crashes before boot is ready
  - provide a one-tap fallback path to install the stable Production APK from the live release manifest
  - preserve an immediate retry action (reload) in the same failure screen
- Release validation check:
  - confirm boot-failure fallback UI appears in failure scenarios and the stable-download action points to the Production manifest/APK
- Stop condition:
  - do not ship startup/bootstrap changes that remove or regress the fallback-to-stable path for Testing users

## Error reporting

`src/lib/error-reporting.ts` records render errors (crash boundary), uncaught window errors and unhandled rejections. It always logs to the console; when `VITE_ERROR_REPORT_ENDPOINT` is set it also POSTs a small JSON report (message, first stack lines, pathname without query, app version, release id, time) with `keepalive`, deduplicated per message for one minute. No user data is included. Point the variable at a collector when one exists; leave it unset otherwise.
