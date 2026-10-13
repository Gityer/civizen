---
document_id: governance-and-legal-baseline-2026-10-13
title: Governance and Legal Baseline
status: working-draft
owner_role: Governance & Legal (drafts for the founder's decision)
visibility: internal
professional_review_required: true
last_updated: 2026-10-13
---

# Governance and Legal Baseline (2026-10-13)

What Civizen's legal and governance texts already say, where they fall short of the live product, and the decisions
the founder needs to make. Nothing in this file is legal advice; every item marked *counsel* needs a qualified
lawyer in the relevant jurisdiction before it is relied on.

Basis: read-only review of `docs/02-policies/`, `docs/01-governance/`, `docs/institutional/`, the v2 plan
(`docs/03-platform/product-design/product-inventory-and-plan-v2-2026-10-12.md`) and the edge functions that send
member content to outside services. No code, data or production system was touched.

## 1. What exists

| Area | Documents | State |
|---|---|---|
| Legal status | `02-policies/institutional/current-legal-status-notice.md` | Public, honest: founder-led, no entity, no tax-deductibility, no securities, no state authority. Good. |
| Terms of Use | `02-policies/legal/civizen-terms-of-use.md` (version `2026-08-01-purpose-alignment-v1`, recorded at sign-up and re-consent) | Front matter still says `draft`, but members accept it. Missing core clauses (Section 3.1). |
| Privacy notice | `02-policies/institutional/privacy-notice.md` v0.1, live at `/privacy` | Plain and mostly accurate; missing what data-protection law requires (Section 3.2). |
| Community governance | `02-policies/governance/civizen-community-governance-charter.md`, mission charter (EN/HY/RU), community guidelines (EN/HY/RU) | Sound authority hierarchy (law > entity > contracts > policy > charter > votes > AI). |
| Citizenship and voting | `02-policies/citizenship-and-verification/…v0.1.md`, `01-governance/participation/civic-voting-system-design-v0.1.md`, permission model, domain maturity thresholds | Drafts that disagree with each other and with the live ballots (Section 3.4). |
| Funding | `02-policies/institutional/funding-and-financial-integrity.md`, `investor-interest-non-offering-notice.md`, `01-governance/funding-and-monetary/*` | Inquiry-only, correctly. No entity, sponsor or jurisdiction is proposed anywhere; `open-legal-questions.md` only lists the questions. |
| Contributors | `02-policies/institutional/contributor-participation-and-recognition.md`, `institutional/contributor-framework.md` | No automatic pay, good. Framework §31–32 still leans on superseded revenue-share instruments (Section 3.5). |
| Founder hand-over | `institutional/founder-transition-succession-framework.md` (stage F0) | Conflicts with decision E5; no succession or credential escrow (Section 3.6). |

## 2. Priorities

| # | Gap | Why it matters now | Priority |
|---|---|---|---|
| G-L1 | No legal entity; the privacy notice names "the Mature Humanity initiative", which is not a legal person | Data-protection law needs an identifiable controller; no one can receive grants or sign contracts; the UN path (ECOSOC consultative status) starts a clock only once an organisation is registered | **P0** |
| G-L2 | Privacy notice does not disclose special-category data, named AI providers, transfers, legal bases or rights | Ballots on civic matters can reveal political opinions and face photos are biometric data; both need explicit consent in the EU, and the app is offered in German | **P0** before public invitation |
| G-L3 | No age check at sign-up, although the notice says Civizen is not for under-16s | The promise cannot be kept as built | P1 |
| G-L4 | Terms lack operator, governing law, minimum age, liability, content licence, termination | Civizen keeps contributions after account deletion; without a licence grant that has no stated basis | P1 |
| G-L5 | Ballot rules disagree across documents; no certification; secrecy limit undisclosed | The Single World Citizenship consultation is the flagship act; its countable result must survive scrutiny | P1 |
| G-L6 | Contributor framework vs. founder's rule and superseded funding instruments | Avoids promising pay or revenue share that no entity can honour | P2 |
| G-L7 | Founder framework vs. E5; maturity domains vs. E2 | Governance texts should describe what the product does | P2 |

## 3. Findings

### 3.1 Terms of Use

Missing: who operates the service (name, contact address); governing law and dispute forum; minimum age; a licence
from members to Civizen to host, display, translate and keep their contributions (including after deletion as
"Deleted member"); the open-source licence relationship for code contributions; liability disclaimer and limitation;
how a member ends the agreement; how notices reach members. The front matter should say `current` once a version is
in force, since members already accept it.

### 3.2 Privacy notice

Checked against the code on 2026-10-13:

- **Controller.** Must name a legal or natural person and a real contact address. Until an entity exists, that is the
  founder personally (decision L2).
- **Special categories.** Votes and comments on civic and political questions can reveal political opinions; the
  verification face photo compared with an ID photo is biometric data. EU law (GDPR Art. 9) needs explicit consent
  for these; the notice should say so and sign-up / verification should ask for it. *counsel*
- **Named recipients.** The notice says "the AI provider". The code sends member content to Google Gemini (Civi,
  Matter agent, Solutions council), OpenAI and Anthropic (Solutions council) and Google Translate. All should be
  named, with what each receives.
- **"We do not use your data to train AI models."** True of Civizen itself. The Gemini API's unpaid-service terms
  allow Google to use submitted content to improve its products (verify the current terms). If member content goes to
  a free-tier key, either move member content to a paid or no-retention tier, or say so in the notice. Recommended:
  keep free tiers for public texts (language packs, documents) and do not send member content to them.
- **Hosting and transfers.** State where the servers are (country/region of the VPS) and the transfer basis for
  US-based AI providers. *counsel*
- **Legal bases and rights.** List the basis for each purpose (contract, consent, legitimate interest) and the rights
  (access, correction, deletion, objection, portability, withdraw consent, complain to a supervisory authority). The
  export and deletion controls already exist; the notice should tie them to the rights.
- **Retention of verification images.** No rule exists. Recommended: delete ID and face images 30 days after the
  verification decision (or the appeal), keep only the result, reviewer, date and a hash.
- **Score-based gating.** If the Civizen score alone decides governance eligibility, describe the logic and offer
  human review. *counsel* (automated decisions)
- **EU representative.** A controller outside the EU that targets EU residents may need a representative there.
  *counsel*

### 3.3 Age

The notice excludes under-16s, but sign-up asks no age and nothing checks it; `min_age` exists only per election.
Recommended: a date-of-birth or "I am 16 or older" step at sign-up, stored as a yes/no, plus the existing per-ballot
age rule.

### 3.4 Elections and ballots

The voting design requires governance eligibility (score tiers G1 70 / G2 75 / G3 80–85), the live consultations
require verification only (decision D2), one-person-one-account is not enforced, elections close hourly with no one
certifying, and the database owner can decrypt ballot choices. Proposed rule set (decision L5):

1. **Countable** = verified identity, not sanctioned, in scope, of age, one person one account (duplicate check
   passed). Score is not a voting gate during bootstrap; it gates proposing and office holding.
2. Every ballot page states before voting: eligibility, quorum, threshold (strictly more than 50% of non-abstain
   votes unless stated), close time, who certifies, and the secrecy limit in plain words until it is removed.
3. **Certification** by two people who did not author the proposal (founder may be one during bootstrap), recorded
   as an audit event; results show "provisional" until certified.
4. Quorum is set and published before opening, never changed while open.
5. Advisory results never carry binding language.

### 3.5 Contributor compensation

Recommended wording to adopt in both contributor documents: *"Contribution is valued by meaningful human input and
real-world impact, recalibrated from feedback. Raw activity counts are never a basis for recognition, pay or
governance power."* Replace "quantity alone should not" (`contributor-framework.md` ~603). Remove or rewrite §31–32
(revenue participation, proceeds allocation, Funding Constitution), which rely on instruments the funding plan marks
superseded. Pay exists only through written programmes of the future entity (grant, contract, bounty, fellowship).

### 3.6 Founder powers and domains

The founder framework says founder access must not be reduced, while E5 (adopted 2026-10-12) gives the founder
baseline permissions with office powers and no route bypass. E2 relies on a "Content and Community" domain that the
domain list lacks (moderation threshold 7/3/3 vs. E2's "two moderators"). Both documents should be updated to the
adopted decisions; six domains (treasury, legal, disputes, security, market oversight, identity) have no maturity
thresholds. No succession or credential escrow exists: if the founder is unavailable, nobody can operate the
servers, keys or domains.

## 4. Decisions for the founder

| # | Decision | Recommended | Alternatives |
|---|---|---|---|
| L1 | Legal home | **A Swiss association (Verein) as the mission-holding body**: neutral, non-national, inexpensive, founded by written statutes, the usual form for international NGOs in Geneva; start the ECOSOC eligibility clock (registered organisation, at least two years before applying, verify). Add a US fiscal sponsor only if US tax-deductible gifts are needed earlier. *counsel* on board residence, tax exemption, and on any effect on the founder's own immigration case before he takes a paid or officer role | US 501(c)(3) (slower, US-national framing); Armenian foundation (national framing, less discreet); fiscal sponsor only (fast, but no own governance) |
| L2 | Controller until the entity exists | **Name the founder as the person responsible in the privacy notice and Terms, with a dedicated Civizen contact address** (forwarding to the personal mailbox is fine) | Keep "Mature Humanity initiative" (not a legal person; does not satisfy disclosure duties) |
| L3 | Member content to AI providers | **No member content to free tiers; free Gemini only for public texts; name every provider in the notice** | Keep as is and disclose that providers may use content |
| L4 | Special-category consent | **Explicit consent checkbox at first ballot (political opinion) and at verification (biometric), recorded with version and time** | Rely on Terms acceptance (weak under EU law) |
| L5 | Ballot rule set | **Adopt Section 3.4** | Keep governance-eligibility score as a voting gate (today 0 people would qualify) |
| L6 | Verification image retention | **Delete images 30 days after the final decision; keep result + hash** | Keep while the account exists |
| L7 | Contributor wording | **Adopt Section 3.5 and remove framework §31–32** | Keep and mark historical |
| L8 | Founder continuity | **Write a succession note and put credentials in a sealed, two-person escrow (e.g. a trusted person plus a lawyer)** | Defer to stage F2 |

## 5. Next drafts (after decisions)

1. Privacy notice v0.2 (EN, then HY/RU with the Localization roles) per L2–L4, L6.
2. Terms of Use version `2026-11-…` with the clauses in 3.1; material change → re-consent flow already exists.
3. Ballot rules page per L5, linked from every ballot.
4. Contributor documents per L7; founder framework and domain thresholds aligned with E2/E5.
5. Entity package per L1: statutes draft, founding members, budget, counsel brief.

Implementation items (age step, consent records, image retention job, certification) go to the implementation
engineer as AyMe jobs once decided; professional review of texts is coordinated with the cross-project Legal &
Compliance Advisor.
