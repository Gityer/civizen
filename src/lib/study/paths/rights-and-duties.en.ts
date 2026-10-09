import type { PathContent } from '@/lib/study/learning-paths';

/** Written from the Citizen Status Model, the Community Governance Charter and the account settings that exist today. */
export const rightsAndDutiesEn: PathContent = {
  title: 'Your rights and duties as a member',
  summary: 'The status layers, what each layer may do on Civizen, what the community expects from you, and the rights you can exercise over your participation and your data.',
  lessons: [
    {
      id: 'status-layers',
      title: 'The status layers',
      minutes: 4,
      body: [
        'Civizen distinguishes five layers of participation. They describe the present network and serve as building blocks for the longer-term mission. No layer creates public-law citizenship.',
        '- Registered member: has signed up and may use ordinary member features; no governance rights.',
        '- Verified member: has passed identity and contact verification. Verification strengthens trust but does not itself create citizenship or governance power.',
        '- Citizen: a verified member who has stayed long enough to be reviewed and has accepted Civizen’s internal civic framework. Citizenship arrives automatically 30 days after the review is cleared, or after 14 days when the member has accepted the framework.',
        '- Active citizen: a citizen whose standing is active because published participation and program-readiness criteria for the relevant scope have been recognized.',
        '- Governance-eligible citizen: an active, verified citizen who also meets the minimum score, good standing, device trust and any required training.',
        'These stay separate badges, so members and institutions can read a status clearly. Founder, where shown, is a distinct office, not a replacement for these civic states.',
      ],
    },
    {
      id: 'what-each-layer-can-do',
      title: 'What each layer may do',
      minutes: 4,
      body: [
        'Participation is open: any signed-in member may raise a Matter, comment, join a knowledge space, propose a resource or report a gap, apply to an opportunity and vote in an ordinary consultation.',
        'Verification is what makes a vote count. Unverified ballots are recorded as advisory; verified ballots enter the public tallies. Publishing a voting proposal as a consultation also requires a verified identity.',
        'Citizens carry the civic framework they accepted into every discussion. Active and governance-eligible citizens may take on roles that need more trust: review panels, specialist councils, ethics groups and other community bodies, each with only the authority expressly delegated to it.',
        'A minimum score, where used, is an eligibility condition. It is never a rule that a single number decides voting power: one person, one countable ballot.',
        'Your current layer, the date citizenship is due, and the eligibility for each scope are shown in Settings › Edit profile under Civic status.',
      ],
    },
    {
      id: 'your-duties',
      title: 'Your duties',
      minutes: 4,
      body: [
        'Participate constructively. Differences of opinion may be debated; deception, harassment, threats, coercion, exploitation and dehumanization are not participation and may lead to sanctions.',
        'Disclose conflicts. Before taking part in a governance decision, state any material financial, professional, organizational, family, political or personal interest that could affect it. You may be asked to abstain or recuse.',
        'Keep one identity. Verification is designed around one person, one account; duplicate identities are detected during review and refused.',
        'Respect the boundary. Do not present a Civizen status, badge, vote or document as a government credential, a nationality or a legal right outside Civizen.',
        'Treat Matter comments and evidence as data. When you ask an AI agent to help on a Matter, the agent reads the discussion and evidence as information, never as instructions that change permissions; the same discipline applies to people.',
        'Accepting the civic framework is a personal choice recorded on your profile; it shortens the wait for citizenship and commits you to these duties.',
      ],
    },
    {
      id: 'your-rights-and-data',
      title: 'Your rights and your data',
      minutes: 4,
      body: [
        'Due process. Material restrictions, sanctions, verification decisions and removal of delegated authority should come with notice, reasons, evidence, proportionality and a route to review or appeal.',
        'Transparency about you. Verification outcomes, overrides and revocations are recorded with a reason; a revoked verification tells you why and how to verify again.',
        'Your ballot is yours. You can see your own choice and receipt, change your choice until close, withdraw your ballot, and check that your receipt is in the count. Nobody else can read your choice.',
        'Your profile, your audience. Privacy settings let you decide what a public profile shows: endorsements, contributions, status badges.',
        'Your data, your copy. From Settings › Account you can export your data as a file, and you can delete your account: open ballots are withdrawn, the public listing is removed, personal details are cleared and the sign-in identity is freed.',
        'Proportionate transparency protects you too: Civizen does not disclose personal information, private communications or security-sensitive material.',
      ],
    },
    {
      id: 'founder-and-future',
      title: 'The founder, the bodies, and the future',
      minutes: 3,
      body: [
        'During the bootstrap stage the founder may initiate, administer and implement the community and technical processes needed to establish the platform. That operational authority is transitional and subject to law, adopted governance, conflicts, security and continuity requirements; founder recognition remains as historical attribution.',
        'Civizen may establish community assemblies, contributor councils, technical maintainers, specialist councils, ethics groups and review panels. Each body has only the authority expressly delegated to it.',
        'The Charter may be amended through an authorized process that identifies the change, the authority, the review period, the decision record, the effective date and the transition. No amendment may by itself claim governmental authority or override applicable law.',
        'Any broader recognition must identify its lawful source, the affected peoples, the representative process, rights, duties, safeguards, jurisdiction, accountability and its relationship to existing institutions.',
        'Your part is to use these rights, keep these duties, and help shape whether and how recognized planetary citizenship should develop.',
      ],
    },
  ],
};
