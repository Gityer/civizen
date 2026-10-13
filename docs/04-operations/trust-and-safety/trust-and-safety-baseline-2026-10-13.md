# Trust & Safety baseline (2026-10-13)

Owner: Civizen Trust & Safety Lead. Status: **draft for Armen's decision** (Section 5). Source: code review of
`supabase/migrations/` and `src/` at `76f09be` (read-only, no production access) plus the policy documents listed
below. Nothing here changes the product until Armen decides and the implementation engineer ships it.

Related: [content moderation spec](../dev/content-moderation.md) ·
[Community Guidelines](../../02-policies/institutional/community-guidelines.md) ·
[identity verification manual](../dev/identity-verification-manual.md) ·
[citizenship and verification policy](../../02-policies/citizenship-and-verification/citizenship-and-verification-policy-v0.1.md) ·
[role domains and maturity thresholds](../../01-governance/roles-and-permissions/role-domains-and-maturity-thresholds-v0.1.md) ·
[founder transition framework](../../institutional/founder-transition-succession-framework.md) ·
[QA test matrix](../qa/test-matrix.md) · [v2 plan](../../03-platform/product-design/product-inventory-and-plan-v2-2026-10-12.md)

## 1. What is live and sound

- **Reporting and moderation (A6, v0.1.234):** any member can report posts, comments, Matters, Solutions comments,
  job listings and profiles. Moderators work from one queue, hiding requires a reason, nothing is deleted, and the
  author is told the reason. One appeal is decided by a different moderator, and the item is restored exactly.
  Reporters are not shown to authors.
- **Identity verification:** the case owner lock (Phase 0) stops owners from approving themselves. Server functions
  refuse self-review and catch duplicate ID documents by hash. Evidence sits in a private bucket.
- **Founder powers by domain maturity (v0.1.227):** permissions tied to a mature domain are withdrawn from the
  founder. Only verified, eligible, unsanctioned citizens other than the founder count toward maturity. Only a
  founder can grant the founder role.
- **Emergency access:** requested, reviewed by someone other than the requester, time-limited, single use, and
  logged by trigger.
- **Message blocking** works in both directions.

## 2. Findings

Severity: **S1** = exploitable now by an insider or member, fix before inviting the public; **S2** = abuse or
fairness gap, fix in Phase A/C; **S3** = policy/consistency.

| # | Sev | Finding | Evidence | Fix owner |
|---|---|---|---|---|
| T1 | S1 | **Reviewers can verify themselves.** The case-lock trigger returns early for any reviewer (`role.assign`, `settings.manage` or an identity_verification domain member) with no self-check, and RLS lets them update cases. A direct `UPDATE … SET status='approved'` on their own case marks their profile verified, with no review row and no duplicate check. | `20261008120100_identity_verification_case_owner_lock.sql` L27-29; RLS `20260420130000` L471-493; projection trigger `20260418124500` L97-126 | Implementation engineer |
| T2 | S1 | **Emergency-access audit log is open.** RLS is never enabled on `governance_emergency_access_request_events`, while `authenticated` has `SELECT, INSERT`, and `append_…_event` is executable by every member. Any member can read every request's reason and actors, and can forge audit events. | `20260501043000_add_emergency_access_audit_events.sql` L254-255; no `ENABLE ROW LEVEL SECURITY` for that table in any migration | Implementation engineer (overlaps Security job ja567db46) |
| T3 | S1 | **Emergency approval can skip review.** `settings.manage` holders can update `governance_emergency_access_requests` directly (UPDATE policy + grant) and set `request_status='approved'` without the review function or the second approver. The claimant also does not have to be the requester. | `20260501030000` L94, L116-119; claim `20260501040000` L189-247 | Implementation engineer |
| T4 | S1 | **Phone lookup reveals owners of phone numbers** (already filed by QA as job jf374edf6). Any member can query up to 300 numbers per call and get id, username, name and avatar, with no rate limit or opt-in. Production has 0 phones yet, so no exposure today. | `20260814010000_lookup_civizen_contacts_by_phone.sql` | v2 plan session (job jf374edf6) |
| T5 | S2 | **No rate limits.** There are none on posts, comments, messages, sign-ups or reports; reports are only de-duplicated per item. One account can flood the queue or the feed. | `supabase/config.toml`; `report_content` L206-211 | Implementation engineer, after decision TD4 |
| T6 | S2 | **No way to stop a person.** Sanctions block only governance actions (propose, vote, review, execute). There is no restriction on posting, messaging or signing in, and profiles cannot be hidden. The Guidelines promise that repeated conduct is "handled through governance sanctions", which today cannot stop harassment. | `20260420093000` scopes; `moderation_hide` L301-303 | Implementation engineer, after decision TD2 |
| T7 | S2 | **Illegal content stays readable.** CSAM, doxxing and similar content can only be hidden: it remains visible to its author and to every moderator. There is no restricted removal, evidence preservation or escalation path. | `20261013110000_content_moderation.sql` L147-178 | Decision TD3, then implementation engineer; Legal & Compliance for duties |
| T8 | S2 | **Moderator conflicts of interest.** Claim and dismiss have no self-check (a moderator can dismiss reports about their own content or profile), the queue does not exclude their own reports, and `report.review` holders can update `reports` directly, bypassing the functions. Dismissals and claims leave no `moderation_actions` row. | `20261013110000` L262-345; `20260327213000` L290-296 | Implementation engineer |
| T9 | S2 | **Message reports bypass the pipeline.** Chat reports insert straight into `reports` with an excerpt the client supplies, so there is no reason code, no de-duplication and no self-check, and the excerpt can be fabricated. They are also outside the moderation queue. | `src/components/ui/chat-bar.tsx` L1003-1033 | Implementation engineer |
| T10 | S2 | **Verification evidence can change after submission and is kept indefinitely.** Owners can update or delete bucket files and `artifact_hash` after submitting, which defeats the duplicate check. Files are deleted only when the account is deleted. Domain reviewers can see cases but not the files. | `20260907120000` L55-75; `20260418124500` L316-340; `20261010100000` L86 | Implementation engineer, after decision TD5 |
| T11 | S2 | **Founder can delay their own hand-over.** `role.assign` holders, the founder included, can assign themselves an ordinary role in a domain, which keeps that domain's powers. `role.assign`/`settings.manage` holders can write maturity thresholds and snapshots directly. Treasury/finance, market oversight and security/incident response have **no thresholds**, so they can never mature; in particular the two-approver emergency rule never switches on. Role and permission changes have no audit table. | `20261010190000` L73-96; `20260420160000` L271+, L471-527; `20260420130000` L409-418 | Decision TD6, then implementation engineer |
| T12 | S3 | **Two thresholds for one domain.** E2 and the Guidelines make the founder the moderation fallback "until the domain has two moderators", while the maturity table requires 7 moderators, 3 senior moderators and 3 appeals reviewers. Moderation rights come from the app role (`content.moderate`), not from membership of the Moderation and Conduct domain, so the Guidelines' statement "moderators are members assigned to the domain" does not match the code. | Guidelines; `role-domains-and-maturity-thresholds-v0.1.md` §4; `20260412220000` L249-268 | Decision TD1, then docs + code |
| T13 | S3 | **The reporter never learns the outcome,** and there is no block or mute outside private messages. | `20261013110000` L317, L399; `20260501022000` | Phase D backlog |

## 3. Proposed policies (drafts)

### 3.1 Moderation authority (clarifies E2)

1. **Who moderates:** holding `content.moderate` is tied to an active role assignment in the
   `moderation_conduct` domain, recorded with who assigned it and when. An app role alone no longer grants it,
   except for the founder office as the fallback in rule 2.
2. **Founder fallback and maturity are two stages.** The founder decides cases and appeals only while the domain has
   fewer than two active moderators, the minimum for "appeal to a different moderator". From two moderators until
   the domain matures (7/3/3), the founder stops deciding cases but keeps appeal-of-last-resort and integrity-review
   access. After maturity those powers are withdrawn automatically, as for other domains.
3. **Conflicts:** a moderator never claims, dismisses or decides anything about their own content, their own
   profile, a report they filed, or an account they are linked to. Every claim, dismissal, hide and appeal decision
   is one `moderation_actions` row.

### 3.2 Enforcement ladder for people (closes T6)

The ladder runs: note → warning → **content restriction** (cannot post or comment; 7 days) → **messaging restriction**
(cannot start conversations; 7 days) → **suspension** (sign-in blocked; 30 days) → **removal** (account closed; requires
two moderators, or the founder during the fallback stage). Each step needs a recorded reason that cites the
Guidelines item, notifies the member, and can be appealed once to a different moderator. Steps can be skipped for
threats of violence, CSAM or doxxing. Governance sanctions stay separate and continue to govern eligibility.

### 3.3 Illegal and severe content (closes T7)

1. A moderator may mark content **"restricted: severe"** (CSAM, credible threats, doxxing, non-consensual intimate
   imagery). It then disappears for everyone, including the author and other moderators. Only the deciding
   moderator and the founder (security office) can open it, and every access is logged.
2. The content and its metadata are preserved in a sealed store for 90 days (longer if a legal request arrives),
   then deleted. Deletion is logged.
3. CSAM must be reported to the competent hotline (NCMEC CyberTipline where US law applies, or the INHOPE member
   hotline of the country concerned). **Legal & Compliance to confirm the duties for the entity, host and
   jurisdictions before launch; this is not legal advice.**
4. Accounts behind CSAM or credible threats are suspended immediately (ladder step skipped).

### 3.4 Verification case handling (closes T1, T10)

1. Nobody reviews their own case, a case of an account linked to theirs, or a case they assigned to themselves. All
   status changes go through server functions; direct writes to case status are refused for everyone.
2. After submission, evidence is frozen: the owner can withdraw the case, but cannot change files or hashes.
3. Raw ID and face images are deleted 30 days after a final decision (approved or rejected). The case keeps only the
   decision, the reviewer, the document hash and the date. Appeals must be filed within those 30 days.
4. Domain reviewers get read access to the files of the cases assigned to them, and every file open is logged.

### 3.5 Rate limits (closes T5; starting values, review after 30 days of data)

Per account: 20 reports/day; 10 posts/hour; 60 comments/hour; 20 new conversations/day; 200 messages/hour;
phone lookup 1 call/day, only for numbers the member has in their own contacts (T4). Per IP: 5 sign-ups/hour.
Exceeding a limit returns a clear message, never a silent drop.

### 3.6 Founder hand-over (closes T11)

| Domain | Threshold | Founder today | Needed |
|---|---|---|---|
| Identity verification | 5/2/2 | all powers (not mature) | T1 fix first |
| Moderation and conduct | 7/3/3 | all powers; fallback per 3.1 | 3.1 stages |
| Constitutional review | 9/5/5 | `role.assign` | role-change audit log |
| Technical stewardship | 5/2/2 | settings, builds | — |
| Civic education | 5/2 | `law.review` | — |
| Treasury and finance | **none** | `finance.*` forever | set thresholds (proposal: 5 stewards, 2 auditors, 2 approvers) |
| Market oversight | **none** | `market.manage` forever | set thresholds (proposal: 5/2/2) |
| Security and incident response | **none** | emergency approvals stay single-approver forever | set thresholds (proposal: 3 responders, 2 approvers) |

Rules: thresholds and snapshots change only through a recorded governance decision (not a direct table write).
Every role or permission change is audited. A founder self-assignment does not keep withdrawn powers; it is
treated as founder power and withdrawn with the domain.

## 4. Test asks for Civizen QA

Abuse tests to add to the matrix (local stack only): T1 reviewer self-approval by direct update; T2 member reads
and inserts emergency events; T3 direct approval of an emergency request; T8 moderator dismisses a report about
themselves; T9 forged message-report excerpt; T10 owner replaces evidence after submission; a report flood
(100 reports from one account). Each must fail after its fix.

## 5. Decisions for Armen

| # | Decision | Recommended | Alternative |
|---|---|---|---|
| TD1 | Moderation authority stages (3.1) | **Adopt 3.1:** founder decides only below 2 moderators, then appeal of last resort until 7/3/3; moderation rights come from domain assignment | Keep the founder deciding until full maturity |
| TD2 | Enforcement ladder for people (3.2) | **Adopt 3.2** | Hide content only, with no person-level restriction (harassment cannot be stopped) |
| TD3 | Severe content handling (3.3) | **Adopt 3.3,** with Legal & Compliance confirming hotline duties | Hide only (moderators keep seeing CSAM) |
| TD4 | Rate limits (3.5) | **Adopt the starting values** | Different values |
| TD5 | Evidence retention (3.4) | **30 days after final decision** | Keep until account deletion (today) |
| TD6 | Founder hand-over gaps (3.6) | **Set thresholds for treasury, market and security; audit role changes; self-assignment does not keep powers** | Leave those domains founder-held indefinitely |

S1 fixes T1-T4 are defects against existing decisions (E3, D1 Phase 0, emergency access design) and need no new
decision; they go to the implementation engineer now.
