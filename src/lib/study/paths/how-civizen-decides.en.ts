import type { PathContent } from '@/lib/study/learning-paths';

/** Written from the Community Governance Charter and the Civic Voting System Design (sections 12–15). */
export const howCivizenDecidesEn: PathContent = {
  title: 'How Civizen decides',
  summary: 'The order of authority, the road from a Matter to a public consultation, who may vote and what counts, how ballots stay secret yet checkable, and the rules for conflicts and emergencies.',
  lessons: [
    {
      id: 'authority-order',
      title: 'The order of authority',
      minutes: 4,
      body: [
        'The Community Governance Charter governs participation, proposals, advisory voting, delegated platform decisions, protocol development, review and internal civic status within Civizen. It is not the legal constitution of an organization or a government.',
        'Where documents conflict, this order applies, and no lower level may override a higher one:',
        '- 1. Applicable law and binding legal obligations.',
        '- 2. Governing documents and lawful decisions of the relevant legal entity.',
        '- 3. Binding contracts and funding restrictions.',
        '- 4. Adopted institutional policies.',
        '- 5. The Community Governance Charter.',
        '- 6. Protocol and technical governance procedures.',
        '- 7. Community proposals, votes, customs and advisory opinions.',
        '- 8. AI-generated analysis and recommendations.',
        'Two consequences matter in daily use. A community vote is advisory, or binding only within a scope that authorized human governance has expressly delegated. And AI output sits at the bottom: an AI agent on a Matter or in the Solutions council can inform a decision, never make one.',
      ],
    },
    {
      id: 'matter-to-consultation',
      title: 'From a Matter to a public consultation',
      minutes: 5,
      body: [
        'A problem enters Civizen as a Matter: a question, issue or suggestion addressed to a person, an organization or the whole community. Participants discuss it, attach evidence, agree on actions and record decisions.',
        'When a Matter needs a community decision, its initiator or responsible person drafts a voting proposal. A proposal must state its purpose, scope, the requested decision, the affected parties, who implements it, financial or data implications, conflicts, and the authority required for implementation.',
        'The author opens the draft for support. Other members add their support; the author’s own support never counts toward the threshold. Once the threshold is reached, the author publishes the proposal as a consultation (founders and administrators may publish any draft). Publication makes the originating Matter public so every voter can read the background.',
        'A consultation can use the standard Support / Oppose / Abstain ballot or its own options (2 to 12). It may ask for one choice, for approval of several options, or for a ranked order. It opens and closes at the times set on the draft; a closing-soon reminder reaches members who have not voted.',
        'When the consultation closes, the outcome is written back to the Matter as a comment and a Matter event, so the people who raised the problem see what the community decided.',
      ],
    },
    {
      id: 'who-votes-what-counts',
      title: 'Who may vote, and what counts',
      minutes: 4,
      body: [
        'Every signed-in member may vote in an ordinary consultation. Only ballots from verified identities are countable.',
        'A ballot from an unverified account is stored as advisory: the voter sees their own choice and receipt, but it stays outside the public tallies. It becomes countable automatically if the voter’s identity is approved while the consultation is still open. Public counts show countable and advisory ballots separately.',
        'A consultation may add conditions: a minimum age, a country scope, or a requirement to be verified before casting. The ballot page tells you the reason when you cannot vote yet.',
        'Members under an active governance sanction that blocks voting cannot cast a ballot. Token ownership, financial support or wealth alone never creates voting authority.',
        'Voting procedures must disclose eligibility, quorum, timing, options, any weighting, conflicts, finalization rules and implementation authority. If you cannot find one of these on a ballot page, that is a legitimate question to raise.',
      ],
    },
    {
      id: 'ballots-receipts-outcomes',
      title: 'Secret ballots, receipts and outcomes',
      minutes: 5,
      body: [
        'Your choice is stored only in encrypted form under a per-consultation secret. Tallies are computed inside the database without exposing individual choices. One known limit is stated openly: the database operator could still decrypt ballots, and removing that ability is a planned phase of the design.',
        'When you cast a ballot you receive a receipt, a random code. You can later check that a ballot with your receipt is included in the count; the receipt never reveals your choice. You may change your choice until the consultation closes, or withdraw your ballot.',
        'Every cast, change, withdrawal, opening and close is appended to a public audit chain: each event carries a hash that includes the previous event, so the history cannot be rewritten silently.',
        'The outcome follows published rules. A standard ballot passes when the quorum of countable ballots is met and Support is strictly above the pass threshold among Support and Oppose (Abstain does not count against either). Approval ballots report the most approved option. Ranked ballots are counted by instant run-off: a majority wins, otherwise the weakest option is eliminated and its ballots move to the next preference.',
        'The result is one plain sentence on the ballot page and in the Governance results list, and it is written back to the Matter.',
      ],
    },
    {
      id: 'conflicts-due-process',
      title: 'Conflicts, due process, emergencies and code',
      minutes: 4,
      body: [
        'Participants must disclose material financial, professional, organizational, family, political or personal interests that could affect a governance decision. A conflicted participant may be asked to abstain, to recuse, or to have their vote or decision reviewed.',
        'Material restrictions, sanctions, verification decisions or removal of delegated authority should come with notice, reasons, evidence, proportionality and a route to review or appeal.',
        'Emergency action must be necessary, limited in scope, time-bounded, logged, attributable to an authorized human, reviewable, and followed by a report appropriate to the incident. AI cannot authorize emergency action.',
        'Protocol and software changes must use documented review, testing, security, release, rollback and audit procedures. Technical decentralization does not remove legal responsibility for services operated by an identifiable entity.',
        'During the bootstrap stage the founder may initiate and administer the processes needed to establish the platform. Founder recognition is permanent as historical attribution; founder operational authority is transitional and subject to law, adopted governance, conflicts, security and continuity requirements. No present vote, amendment or founder action may declare public authority.',
      ],
    },
  ],
};
