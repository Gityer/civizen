---
title: Product inventory and implementation plan v2 (2026-10-12)
status: current
version: 0.2
date: 2026-10-12
owners: Armen Yeremyan (owner); maintained by the agents working on Civizen
canonical: true
supersedes_plan_of: product-inventory-and-implementation-plan-2026-10-07.md
related:
  - product-inventory-and-implementation-plan-2026-10-07.md
  - information-architecture-and-content-standards.md
  - ../../01-governance/participation/civic-voting-system-design-v0.1.md
  - ../../04-operations/dev/RELEASING.md
---

# Civizen product inventory and implementation plan, v2 (2026-10-12)

**Audience:** the owner and every agent working on Civizen.
**Basis:** read-only review of `main` at `7e3f678` (after v0.1.232), a guest walk of the live site on phone and desktop width, and read-only production counts and scheduler state on 2026-10-12 06:16 UTC. Nothing in code or data was changed to produce it.
**Relation to v1:** the [2026-10-07 plan](product-inventory-and-implementation-plan-2026-10-07.md) is executed (Phases 0–11, Section 10 there is the history). Its purpose (Section 1), binding build rules (Section 2) and working method (Section 8) stay in force and are not repeated here. This document re-inventories what exists **now**, corrects tracker claims that did not hold, and sets the next plan. Section 8 here is the live tracker.

---

## 1. Purpose in one paragraph

Civizen is the software expression of *Mature Humanity*: a voluntary, non-governmental civic network where people act as citizens of one planet — learn the shared rules, raise matters, discuss, develop solutions, decide together within Civizen's delegated scope, contribute work, cooperate economically and improve the governance itself, in the open and audited in public. It claims no state authority. Owner outcome through 2026-12-22: **a platform ready for meaningful public participation across countries**, with the loop *raise → discuss → solve → vote → contribute → improve governance* working end to end, decentralised, open-source and continuously audited.

## 2. The headline: the product is built; participation is not

| Signal (production, 2026-10-12) | 2026-10-07 | Now |
| --- | --- | --- |
| Profiles / sign-ups in last 30 days | 31 / 1 | 31 / 1 |
| Signed in during last 7 days | — | 5 |
| Citizens / governance-eligible | 0 / 0 | 2 / 0 |
| Ballots in the open consultation (A Single World Citizenship) / countable | 0 / 0 | 3 / **0** |
| Matters: public / participants-only (development stories) / distinct creators | 1 / 1,192 / 3 | 1 / 1,192 / 3 |
| Home posts / authors | 8 / 2 | 9 / 2 |
| Agreements, job interests, endorsements, Solutions problems, fund inquiries, push subscriptions | 0 | 0 |
| Opportunities / participations; knowledge resources; challenges | — | 7 / 2; 4; 5 |
| Civi conversations in 30 days | 9 | 11 |
| Public tables | 302 | 314 |

Between 10-07 and 10-12 about thirty releases shipped trust fixes, the participation loop, identity layers, Study paths, languages, decentralisation and a signed Android build. **Not one usage number moved.** The constraint is no longer missing features; it is (a) the remaining gaps that make it unsafe to invite the public (moderation, member-to-member identity exposure), (b) the first-visit and first-ten-minutes experience, (c) the absence of any measurement of the funnel, and (d) distribution (store listing, public source, outreach). This plan is ordered accordingly. New surfaces are deliberately last.

## 3. Corrections to the v1 tracker (verified 2026-10-12)

These rows in the v1 Section 10 claimed more than holds. Each becomes a step below.

| v1 claim | Reality | Evidence | Step |
| --- | --- | --- | --- |
| Operator: e-mail digest "daily 06:00 UTC cron … live on production" | **No schedule exists.** pg_cron has 12 jobs, none for the digest; the host crontab was found empty on 10-12; no systemd timer | `cron.job`; host check 2026-10-12 | A3 |
| 2.6 Return path everywhere | Landing hero, sticky phone bar, Get Started hub and Why page call `/signup`/`/login` without the return path; only the header toolbar keeps it, and it is hidden while the hero is visible | `OnboardingHero.tsx:55,60`, `OnboardingStickyCta.tsx:30,38`, `WhyThisExists.tsx:63` | B1 |
| 3.7 Privacy settings control visibility | Server card honours them, but any signed-in member reads every `profiles` column (birth date, phone, place of birth, official IDs) and `endorsements` directly; the page shows everything if the RPC fails (`?? true`) | `20261009090000_profiles_require_sign_in.sql` (`TO authenticated USING (true)`), `UserProfile.tsx:84,96` | A2 |
| 2.7 Authors withdraw drafts | `withdraw_voting_proposal` exists server-side; nothing in the UI calls it | `20261009150000_participation_loop_notifications.sql` | C3 |
| Biometric sign-in (Settings › Privacy) | Plugin class exists but `MainActivity` registers only `ApkUpdaterPlugin`, so the toggle can never work | `android/app/src/main/java/com/civizen/app/MainActivity.java` | A5 |
| 9.2 Play prep incl. privacy notice | `/privacy` exists but nothing links to it (footer, sign-up, Settings › Legal, Help); Play requires an in-app privacy link | `PublicPageFooter.tsx:8-18` | A4 |
| "Open-source, continuously audited", reproducible build (10.3) | The canonical repository `maturehumanity/civizen` is frozen at `fc4ac92` (2026-09-30), **145 commits behind**; work is pushed only to the mirror `Gityer/civizen` (also public, checked 2026-10-13), so the code is visible but the canonical source that documents point to does not match the served build | `git ls-remote origin main` vs `gityer-mirror` | A1 (decision E1) |
| 2.3 Tools tab | Shown to office holders, but the steward route requires `role.assign`/`settings.manage`, so they are bounced | `governance-member-model.ts:74-86`, `app-routes-1.tsx:235` | C5 |
| Steward console shows founder access per domain (10.4) | The card is mounted in Settings › Governance admin, not the steward console | `GovernanceAdmin.tsx:554` | C5 |
| 5.2 Completion shown on profile | Shown on other people's profiles only, not on your own `/profile` | `UserProfile.tsx:381` | D6 |
| Sign-up is email only (D8) | True, but the feature catalog still advertises "phone-first identity" | `messages-features-catalog-02.ts:166` | B6 |

Also confirmed fixed since v1 (v1 Section 5 is outdated on these): Matter detail tabs change content; Matter attachments open; public profile has no dead Report link.

## 4. Inventory by user type (current state)

Legend: ✅ working · 🟡 partial · ⚪ stub · 📐 missing · ⛔ defect.

| User type | Can do now | Gaps that matter |
| --- | --- | --- |
| **Visitor** | Landing with open-consultation card, Why, Areas (with live activity), Documents (EN; HY/RU charter and pathway), Governance landing, voting catalog, ballot pages and closed outcomes, Fund (inquiry only), public Jobs (post, browse), Download (signed APK + checksum), Terms, `/privacy` (unlinked), Civi widget | ⛔ ~5 s blank "Loading…" on first visit (client-only render; 110 JS requests; `dist` holds an 8.5 MB vendor chunk); 🟡 return path lost from hero buttons; 📐 cannot browse public Matters (route needs sign-in); 📐 no search; voting catalog location pill still "— , —"; landing URL is `/onboarding` |
| **Registered member** | Home feed and composer; Matters (raise for the community, region/city scope, three handling modes, discussion, work, decisions, resolution, outcome from votes); Opportunities; Challenges; Knowledge proposals; Impact ⇄ ledger; three learning paths with progress; Governance member page; advisory ballots; Messaging 1:1 with E2EE, sealed attachments, key backup, calls with TURN; Civi with own-records context; notification center; web push; Account (email, password, export); privacy toggles; Happiness | 📐 cannot report or flag any post, comment or Matter; ⛔ any member reads other members' birth date / phone / ID fields; 🟡 feed stops at 50 posts, Matters list at 60, no paging or sorting anywhere; 📐 no "me too / support / follow" on a Matter; 📐 notification preferences page; 📐 native push (Android app gets no notifications, calls cannot ring); ⛔ e-mail digest never sent; 🟡 export does nothing in the Android WebView; ⚪ Pillars rename saved on the device only |
| **Verified member / citizen** | Countable ballots; publish proposals; citizenship after 30/14 days with status card; completion badges | 🟡 no visible "what I can now do" moment after verification; badges not on own profile; clock copy says "after verification" while it starts at review clearance |
| **Proposer** | Draft from a Matter, gather support (author excluded), settings freeze, publish when verified | ⛔ no withdraw button; 📐 no edit-and-preview of the ballot as voters will see it; 📐 no certified/cancelled states |
| **Coordinator (Opportunities, Challenges, Knowledge)** | Organise, accept, verify evidence, evaluate; pick challenge proposals; review knowledge proposals | 📐 no community vote on challenge proposals (coordinator picks alone); "paid / stipend / credit" labels still offered though nothing pays |
| **Moderator** | Review user and message reports (inside Settings › Messaging) | 📐 **no moderation of posts, comments, Matters, Solutions comments**; `content.moderate` defined but unused; no moderation queue route, no hide/remove, no appeal |
| **Steward / domain reviewer** | Approve or reject verification with ID + selfie preview, duplicate refusal; founder office appoint/transfer/end | 🟡 no claim/assign (RPC exists, no UI), fixed notes, no reason codes, no "request more information", no history or filters; ⛔ identity-domain reviewers (`profession.verify`) have no access — only `role.assign`/`settings.manage` |
| **Election administrator** | — | 📐 no screen to create, schedule, preview, extend, certify or cancel an election; only Matter → proposal → publish (ordinary consultations); elevated/constitutional ballots exist only via SQL |
| **Market manager** | Review job postings (new → spam) | 📐 members cannot report a listing |
| **Admin / founder** | Users admin (roles, logged verification override, permissions, sanctions/appeals, emergency access), permission matrix, governance operator console, funding admin | 🟡 `UsersAdmin.tsx` 1,912 lines on one screen; no per-user audit view; "Modules" is a read-only list; 3.4 founder-as-office still pending owner decision (founder still holds every permission and skips route checks; 10.4 withdraws nothing until a domain matures) |
| **Business account** | Linked with proof of control; post jobs; agreement party; cannot vote | — |
| **Civi** | Grounded answers EN/HY/RU, own-records context, rate limits | 📐 no actions (navigate, draft a Matter, prefill a job); no market/earnings/messages context |
| **Public verifier / journalist** | Inclusion proof on a receipt (members only, in-browser) | 📐 no public "verify this election" page (Merkle root, exportable proof, anchor link, audit-batch chain); audit machinery visible to admins only; public source frozen (E1) |

### 4.1 Cross-cutting

| Area | State |
| --- | --- |
| **Languages** | Hand-written HY/RU: sign-up/in, chrome, notifications, Home, landing, profile, settings, Matters, governance and voting, learning paths, charter and pathway. **Not curated:** Contribute hub, Opportunities, Challenges, Knowledge, Impact, Solutions, Areas, Study hub, Law, Market/Jobs, Agreements, Earnings, Messaging chrome, Happiness, Fund; SQL notification text for verification events. `i18n:coverage` reports HY only. Agreement PDF uses an unembedded Times-Roman font: Armenian and Cyrillic will not render (`agreements-pdf.ts:145`). |
| **Mobile / native** | Signed Android APK + Play bundle, native web OTA, checksum. 📐 FCM push, 📐 iOS (D7), 📐 offline/PWA, ⛔ biometric registration, 🟡 export. |
| **Performance** | Client-only render with blank first paint; 8.5 MB vendor chunk in `dist`; i18n base/runtime 350 KB each. |
| **Quality** | 310 Vitest files, 11 Playwright specs, 27 SQL contract tests (in CI via migrations replay). CI does **not** run lint or Playwright. 73 files on the 400-line legacy allowlist; largest `chat-bar.tsx` 4,843, `BuildOverlay.tsx` 3,960, `UsersAdmin.tsx` 1,912, `Governance.tsx` (legacy) 1,900. `feature-registry.ts` lacks Matters, Solutions, Challenges, Knowledge, Areas, learning paths and still lists removed Courses. |
| **Measurement** | None. No funnel metric exists (visit → sign-up → confirm → first action → verification → countable ballot). |

## 5. Gaps ranked

| Id | Gap | Why it ranks here | Severity |
| --- | --- | --- | --- |
| G1 | No content moderation (report, queue, hide/remove, appeal) for posts, comments, Matters | Cannot invite the public into open discussion without it; also an app-store requirement for user-generated content | **P0** |
| G2 | Member-to-member identity exposure (all `profiles` columns readable by any signed-in member) | Personal data of every member exposed to any account; privacy toggles misleading | **P0** |
| G3 | Public source 145 commits behind; reproducible-build claim unverifiable | Contradicts the open-source, publicly audited promise | **P0** (owner E1) |
| G4 | E-mail digest unscheduled; tracker said live | Members opted in receive nothing; honesty of status records | P1 |
| G5 | Privacy notice unlinked; biometric toggle dead; Android export no-op | Store review blockers and dead controls | P1 |
| G6 | First visit: blank screen ~5 s, return path lost, guests cannot browse public Matters | The first ten seconds and first ten minutes decide whether any visitor converts | P1 |
| G7 | No funnel measurement | Cannot tell which fix moves participation | P1 |
| G8 | No native push; no notification preferences | Members of the Android app never learn that something needs them | P1 |
| G9 | Governance operations: no election admin, thin verification case tool, no withdraw/certify, no public verify page, Tools gating defect | The flagship act (countable ballots) needs verification throughput and credible administration | P1 |
| G10 | Participation depth: no paging/sorting, no Matter support signal, challenge selection without a vote, hidden related links, badges, registry drift | Quality of the loop once people arrive | P2 |
| G11 | HY/RU gaps outside the loop; PDF fonts | Cross-country readiness | P2 |
| G12 | Bundle size, CI without lint/e2e, monolith files | Velocity and reliability | P2 |
| G13 | iOS, offline, Civi actions, group chats (D9) | Reach and convenience; deliberately after the above | P3 |

## 6. The plan

Order: **make it safe to invite people → make the first visit convert and measurable → make governance operable → deepen the loop → languages and platform → reach.** Sizes: S ≤ 1 day, M 2–4 days, L 1–2 weeks of agent work including tests, docs, Civi knowledge and release. Every step follows v1 Section 8 (working method) and v1 Section 2 (rules). Production database migrations still need a backup and the owner's go per `RELEASING.md`.

### Phase A — Safe to invite (start now)
| Step | What | Acceptance | Size |
| --- | --- | --- | --- |
| A1 | **Public source in sync** (after E1): push `main` to `maturehumanity/civizen`, make the release script push both remotes, add a CI check that fails when the public remote lags the released commit; link the exact commit from the Download page next to the checksum | `git ls-remote origin main` = released SHA; reproducible-build script runs from a fresh public clone | S |
| A2 | **Member-to-member privacy**: split `profiles` into the public card (name, username, avatar, country/city per toggle, badges, score snapshot) readable by members, and a private identity part (birth date, place of birth, phone, official IDs, identity number) readable by owner and staff only; revisit every `select('*')` on profiles; `UserProfile` reads only `public_profile`; fail closed when the RPC fails; add a `show_full_name` toggle | SQL test: member B cannot read A's birth date/phone/IDs; owner and staff can; e2e privacy spec extended | M |
| A3 | **Digest really runs**: schedule `notification-digest` daily (pg_cron + pg_net with the URL and secret in a server-only config row, so it lives in migrations, not a host crontab), log each run, and show "last digest sent" to admins; correct the v1 tracker row | Next 06:00 UTC run logged; a test member receives the mail | S |
| A4 | **Privacy and legal links**: `/privacy` in the public footer, sign-up consent line, Settings › Legal (which becomes Terms + Privacy instead of duplicating Terms), Help | Links present on all four; Play listing URL resolves | S |
| A5 | **Dead native controls**: register `BiometricAuthPlugin` in `MainActivity` (verify on a device) or remove the toggle; Android export through the native share sheet | Toggle turns on and unlocks on device; export produces a file on Android | S |
| A6 | **Moderation, minimum complete set**: "Report" on every post, comment, Matter, Matter comment, Solutions comment, job listing and profile (one `ReportDialog`, one `reports` model with target kind/id and reason codes); a Moderation queue route for `content.moderate` holders (claim, hide pending review, remove, dismiss, note, warn/sanction link); hidden content shows "removed by moderation" to others and the reason to the author; one appeal per decision reviewed by a different moderator; report-review moves out of Settings › Messaging; community guidelines page linked from report dialogs | SQL tests on RLS for hide/remove; e2e: member reports, moderator hides, author appeals, second moderator restores; Play UGC policy checklist satisfied | L |

### Phase B — First visit converts, and we can see it
| Step | What | Acceptance | Size |
| --- | --- | --- | --- |
| B1 | **Return path everywhere**: hero, sticky bar, Get Started, Why and every guest CTA use the shared helper | Unit test enumerates guest CTAs; e2e: guest opens a Matter link → signs up → confirms → lands on the Matter | S |
| B2 | **Fast first paint**: pre-render the public pages (landing, Why, Areas, Documents, Governance landing, ballot pages) to static HTML at build; split the 8.5 MB vendor chunk by route; lazy-load i18n packs per locale; target LCP < 2.5 s on a mid-range phone over 4G | Lighthouse mobile on `/`, `/governance/voting`, a ballot page: LCP < 2.5 s, no blank screen; bundle report in CI | M |
| B3 | **Public Matters for guests**: `/matters` readable signed out (public Matters only, no participant identities), with "Join to take part" carrying the return path; link from landing and Areas | Guest sees the list and a Matter; participants-only stay hidden (SQL test) | M |
| B4 | **First ten minutes**: after sign-up, a short checklist on Home (confirm e-mail · choose language · read one lesson · cast your advisory vote · raise or support a Matter · verify identity to make your vote count), each item one tap; after verification a "your vote now counts" moment that re-opens the open consultation | e2e: new member completes the checklist; checklist disappears when done | M |
| B5 | **Funnel measurement without surveillance**: server-side aggregate counters only (no third-party scripts, no per-person tracking across sessions): visits per public page/day, sign-ups, confirmations, first action by type, verification requests and approvals, ballots advisory/countable, retention week 1/4; an admin "Participation" dashboard; the same numbers feed a monthly public transparency note | Dashboard shows the 10-07 baseline and daily values; privacy notice updated to describe it | M |
| B6 | **Honest labels pass 2**: feature catalog (phone-first), location pill "— , —" hidden until a location is known, opportunity "paid/stipend/credit" labels removed until something pays, voting-catalog subtitle not truncated on phones | Strings grep test; visual check at 375 px | S |

### Phase C — Governance that can be operated and checked
| Step | What | Acceptance | Size |
| --- | --- | --- | --- |
| C1 | **Verification case management**: claim/assign (existing RPC), reason codes, "request more information" with a member-facing message and resubmit, notes, history per case, filters and SLA age, keyboard actions; access by an `identity.review` permission assigned to identity-domain reviewers (map to the maturity domain), not by `role.assign` | A domain reviewer without admin rights clears a queue end to end; SQL tests; median time-to-decision shown | M |
| C2 | **Election administration**: create from template (ordinary consultation first), schedule, preview as a voter, extend with reason, cancel with reason, certify after close (second person), every action an audit event; HY/RU fields side by side | e2e: create → schedule → open → close tick → certify; audit chain contains each step | L |
| C3 | **Proposal lifecycle in UI**: withdraw button for authors (server function exists), certified and cancelled states shown in catalog and history | e2e withdraw; supporters notified (existing) | S |
| C4 | **Public "verify this election"** page per consultation: Merkle root, counts, download of all receipts' hashes and a proof for your own receipt, link to the public-audit batch and anchor, link to the public source commit (A1); signature check for signed intents available to signed-out readers | A signed-out reader recomputes the root from the download with a documented script | M |
| C5 | **Retire the legacy governance tools**: remove `Governance.tsx` and the legacy proposals tab, move sanctions to Users admin only, fix the Tools tab gating, move the per-domain founder-access card to the steward console as v1 intended | No route renders the legacy proposal system; Tools tab opens for every member it is shown to | M |
| C6 | **3.4 Founder as office** (after decision E5): baseline permissions for the founder role, office powers through the constitutional office, no route-check bypass | SQL and route tests; the owner keeps every power the decision grants | M |

### Phase D — The loop, deeper
| Step | What | Size |
| --- | --- | --- |
| D1 | Paging and sorting everywhere (Home feed cursor + "load more"/infinite scroll, Matters, Opportunities, Challenges, Knowledge, notifications), search on Challenges and Knowledge | M |
| D2 | Matter **"This affects me too"** support count and **Follow** (notifications for followed Matters); sort public Matters by support and recency | M |
| D3 | Community vote on challenge proposals (approval ballot reused from consultations; coordinator selection becomes "confirm the community's choice" or a stated override) | M |
| D4 | Contribute hub: show the related links, a "waiting for you" strip (actions due, proposals to support, ballots open), counts per lane; lane cards as real links | S |
| D5 | Notification preferences page (per type: in-app, push, digest) replacing the misleading Settings row; realtime bell instead of 60 s poll | M |
| D6 | Profile: completion badges on own profile; actions on public profiles (Message, Endorse, Report); score snapshot refreshed server-side so visitors never see a stale score; Pillars renames stored on the server | M |
| D7 | Feature registry and Civi knowledge brought level with the shipped surfaces (Matters, Solutions, Challenges, Knowledge, Areas, learning paths; remove Courses) | S |
| D8 | Civi actions: open a page, start a Matter prefilled from the conversation, start a job post, explain my eligibility — each confirmed by the member | M |

### Phase E — Languages and documents
| Step | What | Size |
| --- | --- | --- |
| E-1 | Hand-written HY/RU for Contribute hub, Opportunities, Challenges, Knowledge, Impact, Solutions, Areas, Study hub, Market/Jobs, Agreements, Earnings, Messaging chrome, Happiness, Fund, moderation dialogs; SQL notification text through i18n keys; `i18n:coverage` reports RU as well | L |
| E-2 | Agreement PDF through a library with embedded Unicode fonts (Noto Sans Armenian, Noto Sans) and real layout; test with HY and RU text | M |
| E-3 | Law and constitution: translation plan with sources; first instrument pair (UDHR official HY/RU texts linked) | S |

### Phase F — Platform and velocity (continuous, with a milestone)
| Step | What | Size |
| --- | --- | --- |
| F1 | CI runs `lint` and the Playwright suite against the local stack on every push to `main` | M |
| F2 | Split `chat-bar.tsx`, `BuildOverlay.tsx`, `UsersAdmin.tsx` under the 400-line rule (behaviour-preserving, covered by the existing specs) | L |
| F3 | Native push through FCM (after E6: Firebase project), incoming-call notification on Android | M |
| F4 | Installable PWA with offline shell for read-only pages | M |

### Phase G — Reach (owner-gated)
| Step | What | Size |
| --- | --- | --- |
| G-1 | Play internal track → production (owner: Play Console account and first upload, per `PLAY_STORE_LISTING.md`), with A4–A6 done first | S (agent) |
| G-2 | Invitation and sharing: share card for a ballot / Matter with Open Graph image per item; "invite someone" link that keeps the inviter as referrer (aggregate counts only, B5) | M |
| G-3 | iOS (D7: after the participation loop shows life — revisit when B5 shows weekly active members > 25) | L |
| G-4 | Group chats only when members ask (D9 stands) | L |

### Milestones
| Milestone | Contains | Target |
| --- | --- | --- |
| M1 Safe to invite | A1–A6 | 2026-10-26 |
| M2 First visit converts | B1–B6 | 2026-11-09 |
| M3 Governance operable | C1–C5 (C6 after E5) | 2026-11-23 |
| M4 Loop depth + languages | D1–D7, E-1, E-2 | 2026-12-14 |
| Owner outcome review | B5 dashboard against the 2026-12-22 outcome | 2026-12-22 |

**Success measures for 2026-12-22** (set from B5 once it runs; proposed): 200 confirmed members in at least 10 countries; 50 countable ballots in the open consultation; 20 public Matters raised by people other than the team; median verification decision < 48 h; zero open P0 moderation reports older than 24 h.

## 7. Decisions needed from the owner (recommended option first)

| Id | Decision | Recommended | Alternative |
| --- | --- | --- | --- |
| E1 | Public source repository | **Run a secrets scan over the 145 commits, then push `main` to `maturehumanity/civizen` and do so on every release; keep `Gityer/civizen` as mirror** | Keep public repo frozen until a review (contradicts the open-source promise) |
| E2 | Moderation authority | **Moderators assigned per the governance domain "Content and Community", decisions appealable once to a different moderator, guidelines published; founder only as fallback until the domain has two moderators** | Founder moderates alone during bootstrap |
| E3 | What other members may see of a profile | **Name, username, avatar, badges, score snapshot; country/city per toggle; birth date, phone, IDs never** | Also show age range |
| E4 | Funnel measurement | **Server-side aggregate counters only, no third-party analytics, described in the privacy notice** | Self-hosted Plausible-style analytics |
| E5 | Founder as office (v1 3.4) | **Founder role gets baseline permissions; office powers through the constitutional office; no route bypass; bootstrap powers remain explicitly listed** | Keep blanket founder permissions until a domain matures |
| E6 | Native push | **Create a Firebase project for Civizen (free tier) so the Android app can receive notifications** | Rely on web push and e-mail only |
| E7 | Outcome targets for 2026-12-22 | **Adopt the proposed measures in Section 6 and review monthly** | Set different numbers |

Standing decisions D2–D10 from v1 remain in force.

## 8. Status tracker

| Step | Status | Evidence | Updated |
| --- | --- | --- | --- |
| v2 inventory and plan (this document) | done (owner review pending) | production read-only checks and code review 2026-10-12 | 2026-10-12 |
| E1–E7 owner decisions | adopted 2026-10-12 with the recommended options (E2 confirmed separately) | AyMe decision log | 2026-10-12 |
| A3 Digest really runs | live (v0.1.233): pg_cron `notification_digest_tick` 06:00 UTC → pg_net → `notification-digest`; config row filled on production; a manual tick answered HTTP 200 (`candidates: 0`, nobody has opted in yet) | migration `20261013090000_notification_digest_schedule.sql`; SQL test `notification_digest_schedule_test.sql`; `RELEASING.md` | 2026-10-13 |
| A2 Member-to-member privacy | live (v0.1.233): column privileges give other members only the public profile columns; owner reads `my_profile()`, staff `admin_list_profiles()`; endorsements follow the endorsed member's switch; profile page fails closed; Full name switch added. Production check: member reads public columns, birth date refused, own row via `my_profile`, staff list refused | migration `20261013100000_profiles_member_privacy.sql`; SQL test `profiles_member_privacy_test.sql`; spec `docs/04-operations/dev/profile-privacy.md`; e2e 15/15 | 2026-10-13 |
| A4 Privacy and legal links | live (v0.1.233): `/privacy` in the public footer, the sign-up consent line, the Terms page, Settings › Terms and privacy, Help | `PublicPageFooter.tsx`, `SignUp.tsx`, `TermsOfUse.tsx`, `help-support-links.ts` | 2026-10-13 |
| A5 Dead native controls | shipped in the v0.1.233 APK (device check pending): biometric plugin tracked as an overlay and registered (test fails on an unregistered plugin); data export opens the share sheet on Android | `native/android/**`, `native-android-overlays.test.ts`, `account-export.ts` | 2026-10-13 |
| (found while verifying) Emergency access summary | fixed (v0.1.233): Users admin no longer shows "Could not load emergency access event summary" (ambiguous column in the RPC) | migration `20261013100100_fix_emergency_access_event_summary_ambiguity.sql` | 2026-10-13 |
| (found while verifying) Score evidence query too long + silent ledger cap | fixed: subject_profile_id load (or chunked `in()` batches of 50), in-flight dedupe, Home first paint no longer waits on evidence; ledger reads page past PostgREST 1000-row cap so older verified roots still score; unit + e2e guards. Step D1 | `src/lib/civizen-contribution-evidence-store.ts`, `src/lib/civizen-contributions.ts`, `useHomeFeed.ts`, `e2e/signin-home-ready.spec.ts`, `src/lib/home-score-ledger-inputs.test.ts` | 2026-10-23 |
| A6 Moderation (E2) | shipped in v0.1.234: report any post, comment, Matter, Solutions comment, job listing or profile with a reason; one queue for `content.moderate` (claim, hide with reason, dismiss); hidden posts/comments invisible except to author and moderators (restrictive policies + `get_matter` filter), hidden Matter → participants-only, hidden listing → closed, previous state kept; author notified, sees reason, appeals once; a different moderator decides; Community Guidelines `/guidelines` EN/HY/RU; message reports stay in Settings › Messaging | migrations `20261013110000_content_moderation.sql`, `20261013110100_get_matter_hides_moderated_comments.sql`; SQL test `content_moderation_test.sql`; e2e `content-moderation.spec.ts` (16/16 suite); spec `docs/04-operations/dev/content-moderation.md` | 2026-10-13 |
| A1 Public source in sync (E1) | done 2026-10-13: secrets scan of the 155 unpublished commits found no credential values (only variable names; the one IP is the public TURN address clients receive anyway); host paths removed from current docs; `main` pushed to `maturehumanity/civizen`; `npm run release:push` pushes both remotes and fails unless both equal HEAD; Android manifests carry `sourceCommit` and the Download page links the public commit (from the next release) | `scripts/push-release.sh`, `RELEASING.md`, `AndroidChecksum.tsx`, `update-application.sh` | 2026-10-13 |
| B1 Return path everywhere | shipped in v0.1.235: landing hero, sticky bar, Get Started, Why page and the public governance pages carry the pending return path (or return to the ballot page); a test fails when a guest CTA drops it; Download's back link no longer sends members to sign-in | `src/lib/auth-link-state.ts` (+ test) | 2026-10-13 |
| B2 Fast first paint | shipped in v0.1.235: the 8.7 MB `country-state-city` chunk (2.4 MB gzip, loaded by every page with a city picker incl. the public voting catalog) replaced by per-country files `/geo/v1/<CC>.json` generated at build; the landing hero is painted as static text in the visitor's language before the app code; first-screen chunks start in parallel (live waterfall was index → App → Auth → i18n runtime → i18n base → client → page, ~0.6 s per hop, ~5 s blank); route loading text only after 400 ms. Static pre-rendering of every public page stays a follow-up if live LCP is still above 2.5 s | `scripts/geo-data.mjs`, `vite.config.ts`, `index.html`, `src/main.tsx` | 2026-10-13 |
| B3 Public Matters for guests | shipped in v0.1.235: `/matters` (search, type filter, more) and `/matters/:id` (public comments only) for signed-out visitors; join or sign in returns to the Matter; footer and Area pages link them; signed-in members are redirected to the workspace | migration `20261013120000_public_matters_for_guests.sql`; SQL test `public_matters_guests_test.sql`; e2e `public-matters-guest.spec.ts` | 2026-10-13 |
| B4 First ten minutes | shipped in v0.1.235: Getting started card on Home (first lesson, vote in the open consultation with advisory/countable note, raise or join a Matter, verify identity, photo or bio), one tap each, gone when done or closed; EN/HY/RU | migration `20261013130000_getting_started.sql`; `HomeFirstSteps.tsx`; `first-steps.test.ts` | 2026-10-13 |
| B5 Funnel measurement (E4, E7) | shipped in v0.1.235: page views as daily totals per page pattern (no IP, account, cookie or device); staff Participation page with the E7 targets, 30-day funnel, daily table and top pages; privacy notice updated | migration `20261013140000_participation_funnel.sql`; SQL test `participation_funnel_test.sql`; `ParticipationAdmin.tsx` | 2026-10-13 |
| B6 Honest labels pass 2 | shipped in v0.1.235: feature catalog describes e-mail sign-up; opportunity compensation says the organizer pays outside Civizen, retired credits not offered; empty city/state pickers hidden; voting catalog subtitle wraps | | 2026-10-13 |
| (found) Public header at 1024 px | fixed in v0.1.235: centre links from 1280 px, no wrapping | `PublicPrimaryNav.tsx`, `large-screen-layout.md` | 2026-10-13 |
| (found) CI SQL tests never passed | fixed 2026-10-13: the migrations-replay workflow failed on every run (tests need fixture accounts and the consultation); a deterministic seed now creates them; 31/31 pass from an empty database on an isolated stack | `scripts/local-supabase/seed-test-fixtures.sql`, `.github/workflows/migrations-replay.yml` | 2026-10-13 |
| A7 Insider and privacy bypasses (Security, T&S, QA findings) | live (v0.1.236, 93cadda): reviewer self-verification closed (status only via review functions, own/linked accounts refused); the 13 public tables without RLS closed to clients; emergency access changes only through its functions, only the requester claims; option counts hidden until voting closes (participation total meanwhile), ballot intents voter-only, outcome server-only; verified birth date/country locked; legacy votes private and cast only while open; proposer cannot rewrite thresholds/status; guests see @username; device RLS fixed; phone lookup opt-in, 50/call, 200/day. Production: no_rls_left 0, open counts hidden | migration `20261013150000_insider_and_privacy_bypasses.sql`; SQL test `insider_and_privacy_bypasses_test.sql`; jobs j3f0b1b55, ja567db46, jfb057339, jf374edf6; QA re-test j90712081 | 2026-10-13 |
| C3 Withdraw a draft proposal | shipped in v0.1.237: the author or a proposal manager withdraws a draft from the proposal page; supporters are notified | `CivicVotingProposal.tsx`, `voting-proposals-withdraw.test.ts` | 2026-10-13 |
| C5 Legacy governance workspace retired | shipped in v0.1.237: `/governance/tools` redirects to the steward console, which opens for everyone the Tools tab is shown to; members see and appeal their own sanctions on `/governance` (the appeal form was reachable only on the staff-gated legacy page); 25 orphaned components removed; policy changes go through a Matter and a voting proposal. Open: moving the per-domain founder-access (maturity) card from Settings › Governance admin into the steward console | `GovernanceDashboard.tsx`, `MySanctionsCard.tsx` (+ test), `governance-integration-guide.md` | 2026-10-13 |
| C1 Verification case management | shipped in v0.1.237: Identity Verification domain reviewers review (not only staff); queue oldest first with waiting time against 48 h, assignment, resubmissions; take/release; reject only with a reason code and message; ask for more information (case returns to the member); internal notes and history; the member sees the reason. Also fixed: members could not resubmit after a rejection or revocation (A7 guard) | migration `20261013160000_verification_case_management.sql`; SQL test `verification_case_management_test.sql`; `identity-verification-manual.md` | 2026-10-13 |
| C2 Election administration | shipped in v0.1.237: steward console › Elections for founder/admin roles and Civic Operations members: reschedule before opening, extend (later only, ≤ 14 days at once), cancel with a public reason (counts sealed, no outcome to the Matter), certify with two different people; every action in the public event log. Creation and scheduling stay in the proposal flow. Open: a ballot preview before publishing | migration `20261013170000_election_administration.sql`; SQL test `election_administration_test.sql`; design doc §17 | 2026-10-13 |
| C4 Verify this election | shipped in v0.1.237: `/governance/voting/<id>/verify` without an account: sealed root vs live root, recomputation in the browser from downloadable receipts, own-receipt proof, audit batch and anchor; `scripts/verify-election.mjs` offline or online, same test vector as the database | migration `20261013180000_election_public_verification.sql`; SQL test `election_public_verification_test.sql`; design doc §18 | 2026-10-13 |
| C6 Founder as office (E5), part 1 | shipped in v0.1.237: one helper decides founder authority (office, or role while the switch is on); the office grants the founder permission set; maturity withdrawal follows authority; routes no longer bypass permission checks for the founder role. Part 2 (founder role → member baseline) waits for the owner to confirm the office holder | migration `20261013190000_founder_office_authority.sql`; SQL test `founder_office_authority_test.sql`; `governance-integration-guide.md` | 2026-10-13 |
| PM decisions TD1–TD6, L3–L7 | adopted 2026-10-13 under rule 12 as recommended; L1, L2, L8 with the owner. Implementation follows in Phase D: consent records (L4), 30-day image deletion (L6/TD5), enforcement ladder and rate limits (TD2/TD4), severe-content flow (TD3, after legal confirmation), domain thresholds and role-change audit (TD6), member signing-key ring and restricted business e-mail lookup (QA decisions) | AyMe decision log; jobs j7f652e1f, j15585072, jd5abb81e | 2026-10-13 |
| F1 CI runs lint and the Playwright suite | in review (pull request, AyMe job jafe649b7): CI `e2e` job on every pull request and push to `main` against a fresh local stack (replay + seed, no dump, no edge functions); failures are posted as pull request annotations; seed adds a second moderator, a demo shared knowledge space and a public Matter; 18/18 specs pass from an empty database, three CI runs in a row | `.github/workflows/ci.yml`, `seed-test-fixtures.sql` | 2026-10-27 |
| (found) Ballot signature showed unsigned after a cast | fixed in review (jafe649b7): the stored-signature load raced the signing; an older ballot's envelope also counted for a new receipt; a result for a withdrawn ballot was applied | `useBallotSignature.ts`, `useBallotSignature.test.ts` | 2026-10-27 |
| (found) `/profile` empty-bio prompt below AA contrast | fixed in review (jafe649b7): 2.96:1 at 70% muted; now the full muted color | `Profile.tsx` | 2026-10-27 |
| (found) `main` CI red at Lint since v0.1.242 | fixed in review (jafe649b7): `docs:check` treated build-output folders (`public/downloads/`, `public/updates/bundles/`) as missing in a clean checkout | `check-doc-paths.mjs` | 2026-10-27 |
| (found) E2E specs depended on each other | fixed in review (jafe649b7): the guest Matters spec needed a Matter another spec created; the ballot spec voted in whichever consultation was listed first (with another open, it silently tested that one) | `seed-test-fixtures.sql`, `consultation-ballot.spec.ts` | 2026-10-27 |
| (found) Workflows on deprecated runtimes | CI and migrations replay fixed in review (jafe649b7): actions on Node 24 majors, replay on `.nvmrc` Node instead of 22. Android Channel Build bumped in its own pull request, not exercised (manual workflow that publishes); **pending:** the next maintainer-run testing build is its first check | `.github/workflows/*.yml` | 2026-10-27 |
| (found) Language picker closed when clicked | fixed in review (jafe649b7): on desktop the flag opens the menu on hover and toggled it on click, so pointing then clicking closed it; this also made `e2e/language-switch.spec.ts` flaky (1 in 10 locally, once in CI). A click now keeps a hover-opened menu open; the spec checks hover then click explicitly | `PublicLanguageSelect.tsx` | 2026-10-27 |
| (found) Edge functions import supabase-js from esm.sh | fixed in review (jafe649b7): a runtime that cannot reach esm.sh could not boot any function; all 12 now use `npm:@supabase/supabase-js@2.57.4` (as `notification-digest` already did for nodemailer); all 12 boot and answer locally. Takes effect on production at the next functions deploy | `supabase/functions/*/index.ts` | 2026-10-27 |
| TD4 Rate limits per account | in review (stacked on the F1 pull request): posts 10/hour, comments 60/hour, new conversations 20/day, messages 200/hour, reports 20/day, values in `rate_limits`; a refused action says when the member can continue (Home, comments, chat, reports, Matters). **Pending:** sign-ups per address (5/hour) are auth server configuration on production | migration `20261027100000_account_action_rate_limits.sql`; `account_action_rate_limits_test.sql`; `e2e/rate-limits.spec.ts`; `content-moderation.md` | 2026-10-27 |
| (found) Failed writes that showed nothing | fixed in review (with TD4): a Home comment that failed for any reason other than a missing table vanished silently; Matter work panel actions (task comments, evidence, decisions) had no error handling at all | `useHomeEngagement.ts`, `useMatterWorkPanel.ts` | 2026-10-27 |
| (found) Backups | pending: database dumps are taken by hand before a migration and kept on the same host (`RELEASING.md`); needs a schedule, an off-site copy and a tested restore. A restore drill script can be built and checked on the local stack; the schedule and storage need ops access | drill in review: `scripts/db/backup-restore-drill.sh` dumps, restores into a scratch database and compares every `public`/`auth` table's rows, exits non-zero on any difference (checked locally, including a negative run). **Pending (ops):** daily schedule on the host, off-site copy (`CIVIZEN_BACKUP_OFFSITE_CMD`), a separate copy of uploaded files (storage is not in the dump) | 2026-10-27 |
| (found) Error reports go nowhere | pending: `src/lib/error-reporting.ts` only posts when `VITE_ERROR_REPORT_ENDPOINT` is set and no collector exists, so crashes in members' browsers are invisible | fixed in review: reports go to `record_client_error` (daily counts per kind, message, page pattern and release; no account, IP or device; 1,000 rows a day, 30 days); staff see them on the Participation page; privacy notice says so. Takes effect with the next migration apply and web deploy | 2026-10-27 |
| (found) One host for everything | pending (ops/owner): web app, database and functions depend on one server and one Supabase project; no failover, CDN or separate staging | readiness review 2026-10-26 (cloud session, job jafe649b7) | 2026-10-27 |
| (found) Accessibility settings | in review: Settings › Reading sets text size (Default, Large 112.5 %, Larger 125 %), contrast (Standard, High) and motion (follow the device, Reduce), per device, applied before the first render; axe now also checks `/contact` and Settings in Larger + High contrast. **Blocked upstream:** `eslint-plugin-jsx-a11y` 6.10.2 supports ESLint up to 9 and the repo is on ESLint 10; add it when a release supports 10 (do not force-install) | `src/lib/reading-preferences.ts`, `ReadingPreferencesCard.tsx`, `e2e/reading-preferences.spec.ts`; readiness review 2026-10-26 | 2026-10-27 |
| (found) Edge functions have no tests | in review: CI serves the 12 functions on the local stack and `e2e/edge-functions.spec.ts` calls them over HTTP (every function boots; member-only ones refuse anonymous callers; sign-in success, wrong password, missing fields and suspended account; user creation refused to a member and allowed to a founder with a role; no switching into an unlinked account; call-relay list; language-pack refusals). Provider paths (AI, SMTP, push, TURN, OAuth) stay untested without secrets | `e2e/edge-functions.spec.ts`, `.github/workflows/ci.yml`, `local-supabase.md`; readiness review 2026-10-26 | 2026-10-27 |
| D4 Contribute hub | in review: "Waiting for you" strip (Matter actions due to the member or an organisation they manage, proposals open for support they have not supported, open votes they may cast and have not), each linking to its place, from one counting function `contribute_waiting_for_me()`; open counts on the Challenges and Knowledge lanes; lane cards are real links and show their related links. HY/RU follow E-1 (the Contribute module is not hand-translated yet) | migration `20261027130000_contribute_waiting_for_me.sql`; `contribute_waiting_for_me_test.sql`; `e2e/contribute-hub.spec.ts` | 2026-10-27 |
| Organisation positions (owner request 2026-10-28) | in review: units → positions (mandate, duties, seats, parent) → terms (holder or acting, end reason, handover note) → position-owned queue (decisions with a recommended option, tasks, reviews, contact messages) and append-only journal; vacancy escalates to the parent position and at the top to the founder office; domain roles follow the seat; `/organisation` chart and position pages; `/contact` form routes by topic to positions. 21 positions in 13 units, all vacant at launch; the pending items below now live in position queues | migration `20261028100000_organisation_positions.sql`; `organisation_positions_test.sql`; `e2e/organisation.spec.ts`; `docs/01-governance/roles-and-permissions/organisation-positions.md` | 2026-10-28 |
| Launch gaps 1–2: Matters reach positions | in review: Member Support and Civic Operations Lead act for the Civizen organisation on Matters; a Matter for the Civizen community opens a triage item in Member Support's queue; escalation that would land on the silent party, nobody, or Civizen itself goes to Civic Operations Lead's queue and the initiator is told; response escalation gains the 120-hour manual review; the initiator can pass an overdue Matter to Civic Operations from the Matter page | migration `20261029100000_matter_routing_positions.sql`; `matter_routing_positions_test.sql`; `e2e/matter-routing.spec.ts` | 2026-10-29 |
| Public functions, planet-wide (owner direction 2026-10-29; launch gap 3, part 1) | in review: one model of 87 public functions on the UN COFOG backbone (10 divisions; 50 COFOG groups, 26 marked Civizen additions such as digital government/IT, data protection, elections, civil registration; a catch-all per division), one Civizen liaison position per division (Public Liaison unit); the 37 Solutions categories map onto it; real bodies anywhere are proposed with an official source, verified by the function's liaison, and mapped to functions; routing picks the most local verified body or the liaison; "A public authority" on the Matter form; `/organisation/public`. No bodies seeded: they come from official sources. **Pending:** mapping real bodies from official sources (needs network access) | migration `20261029120000_public_functions.sql`; `public_functions_test.sql`; `e2e/public-functions.spec.ts`; `docs/01-governance/roles-and-permissions/public-functions.md` | 2026-10-29 |
| Public functions: delivery, deadlines, offices, coverage, Open311 (launch gap 3, part 2) | in review: delivery recorded on the Matter with the body's reference; answer due within the body's legal deadline (30 days default); daily job marks overdue answers, tells the initiator and gives the Public Liaison Lead the oversight body for the place; answers recorded with an outcome; officials request their office's seat with evidence and the liaison approves (Matters then reach the office on Civizen); coverage report per place (gaps, overlaps); `public-delivery-open311` edge function for city service-request systems (Open311 GeoReport v2), tested against a mock city | migration `20261030100000_public_delivery_offices_coverage.sql`; `public_delivery_offices_test.sql`; `e2e/public-delivery.spec.ts`; `e2e/public-open311.spec.ts` | 2026-10-30 |
| (found) Age at sign-up | with Policy Counsel (position queue; 16 recommended): full sign-up asks for a date of birth but enforces no minimum age and asks no parental consent; quick sign-up (from a ballot) skips the date. Age is enforced only per ballot (`min_age`) and as an `underage` reason in identity review | readiness review 2026-10-26 (cloud session, job jafe649b7) | 2026-10-27 |
| (found) Areas of life not yet served | needs owner decision (product): dispute resolution for agreements, safety and emergency help, health and care access, housing, education beyond civics, family and care, real payments (Luma stays a prototype per D3). The Market taxonomy and Happiness causes name these areas, but no feature serves them | readiness review 2026-10-26 (cloud session, job jafe649b7) | 2026-10-27 |
| TD2 Enforcement steps for members | in review: note, warning, 7-day content and messaging restrictions, 30-day suspension (read and appeal only, every other write refused), one rung at a time except threats of violence, sexualisation of minors (new reason `child_safety`, Guidelines item 9) and private information; one appeal to a different moderator; restriction banner; Guidelines 0.2 in EN/HY/RU. Owner decisions 2026-10-27: read-only suspension instead of a sign-in ban; skip rules exactly as TD2. Removal (in review): proposed by one moderator, confirmed by a different one (founder alone while fewer than two moderators), staff and office holders excluded, 30 days read and appeal only, then a daily job closes the account through the member's own deletion path; upheld appeal closes at once. **Pending:** native review of HY/RU wording; Release Manager deploys `messaging-agent-reply` (Civi bundle regenerated) | migration `20261027120000_member_enforcement_ladder.sql`; `member_enforcement_ladder_test.sql`; `e2e/member-enforcement.spec.ts`; `content-moderation.md` | 2026-10-27 |
| (found) Privacy notice points to a missing Contact page | in review: owner decision 2026-10-27 "add a /contact page". `/contact` (public and signed-in) shows the address from `VITE_CONTACT_EMAIL`, where each kind of question goes (Moderation, Report, Help, Privacy Notice) and an emergency note; the footer, Help and support, Civi links and the Terms re-consent allow-list point to it. **Pending (owner):** the contact address; Release Manager sets `VITE_CONTACT_EMAIL` at the web build. Until then the page says the address is being set up | `src/pages/contact/Contact.tsx`, `src/lib/contact.ts`, `e2e/contact.spec.ts`, `privacy-notice.md` | 2026-10-27 |
| (found) Suspended username sign-in said "wrong password" | fixed in review (with TD2): `sign-in-with-identifier` turned every failure into invalid credentials; it now answers 403 `user_banned` (only after the password matched), and Login says the account is suspended. Takes effect at the next functions deploy | `supabase/functions/sign-in-with-identifier/index.ts`, `sign-in-with-identifier.ts` | 2026-10-27 |

## 9. Launch blockers for raise → discuss → solve (ranked 2026-10-28)

What stops a public launch of the end-to-end flow (a member raises an issue, it is discussed, and a solution is developed), from a code review of the flow on 2026-10-28. Each gap is an item in the queue of the position that owns it (see `/organisation`), so it survives a change of holder. Effort is rough engineering time.

| # | Gap | Why it blocks | Owner position | Effort |
| --- | --- | --- | --- | --- |
| 1 | Matters for "the Civizen community" go to one founder-owned account; no unit or position receives or triages them | Nobody accountable receives most citizen issues; the founder is a single point of failure | Civic Operations Lead | ~1 week |
| 2 | Escalation goes back to the same unresponsive addressee; the initiator cannot redirect; no staff queue; the timeout job has no tests | An ignored issue never moves, so "raise" leads nowhere | Civic Operations Lead | ~1 week |
| 3 | Matters can only be addressed to Civizen members | Public bodies and companies are not members, so most real-world issues have no addressee | Civic Operations Lead | 2–3 weeks |
| 4 | Community Matters default to participants-only; guests cannot see the solution chain | The community cannot find or discuss what was raised for it | Policy and Legal Lead | days |
| 5 | No "affects me too", follow or duplicate check (D2) | No signal of how many people are affected; discussion fragments across duplicates | Civic Operations Lead | 1–2 weeks |
| 6 | No single path from a Matter to an implemented solution (Solutions "solve" dead end, endorsements lead nowhere, challenges unlinked, initiator-only proposals, coordinator picks alone, D3) | Discussion cannot turn into a solution members can follow to the outcome | Civic Operations Lead | 3–4 weeks |
| 7 | No rate limits on creating Matters, challenges, problems or proposals; several items not reportable; attachments unlimited; no edit or withdraw | Spam and abuse on the flow's own surfaces at public scale | Moderation Lead | ~1 week |
| 8 | Minimum age (16 recommended), consent records (L4) and identity-image deletion (L6) not in place | Legal exposure from the first public sign-up | Policy Counsel | ~1 week after the decision |
| 9 | E-mail only as an opt-in digest; Matter notifications untranslated; HY/RU missing for Solutions, Challenges, Contribute (E-1); comment notices may miss organisation owners | Addressees are not told in time or in their language | Languages Lead | 2 weeks plus review |
| 10 | E2E covers one path only; Matter agents and the Solutions council depend on provider keys with no budgets or stop rules | Regressions in the flow go unnoticed; AI steps silently fall back | Technical Steward | ~1 week |

Already in queues and also needed for launch: release of the reviewed changes (Release Manager), backups and staging (Platform Operations), at least two moderators (Moderation Lead), Armenian and Russian review (language reviewers).
