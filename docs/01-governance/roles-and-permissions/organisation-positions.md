# Organisation positions

Status: built 2026-10-28 (migration `20261028100000_organisation_positions.sql`), in review. Owner request: "there should be specific positions within relevant units responsible for each issue, so that regardless of who takes that position and when, the responsible party is always aware of everything that has happened before and is pending."

## Why

Before this, Civizen had governance domains (12), execution units (7, one per domain) and one constitutional office (founder). Domain roles and unit memberships were rows per person: re-assigning a person reactivated the same row, so there was no term history; there were no duties, no queue owned by a seat, no handover, no acting holder and no escalation path. Pending work therefore had nowhere to live but "ask the owner".

## Model

| Layer | Table | What it holds |
| --- | --- | --- |
| Domain | `governance_domains` | An area of responsibility (existing; `languages` added) |
| Unit | `governance_execution_units` | The team for a domain (existing; units added for moderation, languages, disputes, education, market, activation) |
| Position | `org_positions` | A seat in a unit: title, mandate, duties, number of seats, parent position, the domain role it carries, the contact topic it answers |
| Term | `org_position_terms` | Who holds (or acts in) a position, from when to when, who appointed them, why it ended, and the handover note. Ended terms stay |
| Item | `org_position_items` | The position's queue: decisions (with a recommended option and why), tasks, reviews, contact messages. Items belong to the position, so a new holder inherits them |
| Journal | `org_position_log` | Append-only record of everything that happened in the position: items opened, taken on, released, resolved; holders starting and ending; handover notes; notes |

Rules:

- **Vacancy.** A vacant position is answered by the holders of its parent position, and a top-level position by the founder office (TD1 fallback). `org_position_answerers()` computes this; notifications and queue access follow it.
- **Who may work a queue.** Those who answer for the position, holders of any position above it, founder authority, and settings managers. The queue and journal are never readable directly, only through `org_position_detail()`.
- **Appointing.** Role or settings managers, founder authority, or a holder of a position above the one being filled (`org_appoint_position_holder`). A position has a number of seats; an acting holder takes a seat like a holder.
- **Stepping down.** The holder, or an appointer, ends the term with a reason; while the position has open items a handover note is required (`org_end_position_term`). Items the leaving holder had taken on return to the position.
- **Domain roles follow the seat.** An open term gives the position's domain role (`assignment_source = 'position'`), and ending the last such term removes it. Domain-gated access (identity review, election administration, ...) therefore follows the position.
- **Decisions carry a recommendation.** A decision item must state the recommended option and why; the resolution records what was decided. That is how a question stays open for the responsible specialist while still showing what is advised.
- **Contact.** `/contact` sends messages with `submit_contact_message(topic, ...)` to the position whose `contact_topic` matches: `general` → Member Support, `privacy` → Data Protection Officer, `safety` → Moderation Lead, `security` → Security Officer, `press` → Communications. At most 3 messages an hour per address and 100 an hour in all. An e-mail address shown on the page should be a role mailbox read by the position's holder, never a personal one.
- **Visibility.** The chart (`org_chart()`), mandates, duties, current and past holders are public: members can see who is responsible for what. Handover notes, the queue and the journal are visible only to those who may work the position.

## Positions at launch

All start vacant; their work goes up to the parent position and, at the top, to the founder office until holders are appointed.

| Unit | Positions (parent in brackets) |
| --- | --- |
| Civic Operations | Civic Operations Lead; Member Support Coordinator (Lead); Communications Officer (Lead) |
| Policy and Legal | Policy and Legal Lead; Data Protection Officer (Lead); Policy Counsel (Lead) |
| Technical Stewardship | Technical Steward; Release Manager (Steward); Platform Operations (Steward) |
| Moderation and Conduct | Moderation Lead |
| Languages and Translation | Languages Lead; Armenian Language Reviewer (Lead); Russian Language Reviewer (Lead) |
| Security Response | Security Officer |
| Identity Verification | Identity Verification Lead |
| Treasury and Finance | Treasurer |
| Dispute Resolution | Dispute Resolution Lead |
| Constitutional Council | Constitutional Council Chair |
| Civic Education, Market Oversight, Activation Review | one lead each |

The work pending on 2026-10-28 was placed in the queues: privacy and general contact addresses (Data Protection Officer, Member Support), minimum age at sign-up with 16 recommended (Policy Counsel), Armenian and Russian review (the two language reviewers), releasing the reviewed pull requests (Release Manager), backups and a staging host (Platform Operations), a second moderator (Moderation Lead), and filling the vacant positions (Civic Operations Lead).

## AI agents in positions

Civizen's AI agents (Civi, Matter agents, the Solutions council) should work the same way as people in positions. The principles in McKinsey's "Agentic AI in financial-crime prevention: Lessons from winners" (2026-10-26) apply directly, adapted here:

1. **Build for reuse.** One agent runtime, one policy library, shared report templates across Matters, Solutions and verification.
2. **Use AI where it adds value.** Rules and plain queries for routing, counts and deadlines (as positions do); agents for reading long discussions, conflicting evidence and drafting.
3. **Measure reproducibility.** Run the same input more than once, compare against sources, track differences; keep interpretive judgements behind a human review.
4. **Design human oversight.** Say who reviews which agent output, at which stage, with which evidence: an agent's draft becomes an item in the responsible position's queue, and a person resolves it.
5. **Establish governance.** Every agent has a mandate, permitted actions, data access, a budget and a stopping rule, and its actions are logged, like a position's journal.

Not built yet: agent mandates and budgets as position-like records, and routing agent drafts into position queues.

## Matters and positions

Built 2026-10-29 (migration `20261029100000_matter_routing_positions.sql`, launch gaps 1 and 2):

- **Civizen acts through positions.** Positions marked `acts_for_civizen` (Member Support, Civic Operations Lead), or whoever answers for them while vacant, represent the Civizen organisation on Matters (`current_profile_represents_actor`).
- **Triage.** A Matter addressed to the Civizen organisation, or made its responsibility, opens a triage item in Member Support's queue, linked to the Matter.
- **Escalation.** When an escalation step would notify the responsible lead or the manual queue and that is the party that did not answer, nobody, or Civizen itself, the Matter goes to Civic Operations Lead's queue instead, and the initiator is told. Response escalation now also has the manual-review step at 120 hours.
- **The initiator** can pass a Matter with an overdue answer to Civic Operations from the Matter page (`escalate_matter_to_civic_operations`).

## Next

- Tie `content.moderate` to the Moderation and Conduct unit (trust and safety finding T12).
- Term lengths and review dates per position.
