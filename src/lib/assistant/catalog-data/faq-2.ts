import type { AssistantFaqItem } from '../types';
import { VOTING_FAQ_HY } from './faq-voting.hy';
import { VOTING_FAQ_RU } from './faq-voting.ru';

export const ASSISTANT_FAQ_PART_2: AssistantFaqItem[] = [
  {
    id: 'how_does_governance_work',
    question: 'How does governance work?',
    answer:
      'Civizen has a public Governance landing, Civic voting with sealed ballots and voter receipts, one member Governance page with Votes, Proposals, and Tools tabs, member-supported proposals that open a consultation once enough members back them, a notification center, and Governance Solutions. Consultations close automatically at their closing time and publish the tally and outcome. Community participation is described by the Community Governance Charter. Civizen is not a government. Working institutional frameworks exist as project design, not as live public-law authority.',
    aliases: ['civizen governance', 'how does voting work in civizen'],
    capabilityIds: ['governance', 'governance_charter'],
    sourceRefs: [
      'docs/02-policies/governance/civizen-community-governance-charter.md',
      'docs/assistant/civizen-assistant-cheatsheet.md',
    ],
  },
  {
    id: 'who_can_create_proposals',
    question: 'Who can create proposals?',
    answer:
      'Any signed-in member can start one: open a Matter under Contribute > Questions, Issues & Ideas and choose Create voting proposal, then open the draft for member support from the Proposals tab of your Governance page. Once the support threshold is reached the author can publish the ballot; founders and admins can publish at any time. Community Challenge proposals are a different flow inside a Challenge, selected by that challenge’s coordinator.',
    aliases: ['who can propose', 'who can start a consultation'],
    capabilityIds: ['governance', 'community_challenges'],
    sourceRefs: [
      'docs/02-policies/governance/civizen-community-governance-charter.md',
      'src/pages/GovernanceNew.tsx',
    ],
  },
  {
    id: 'who_can_vote',
    question: 'Who can vote?',
    answer:
      'Any signed-in member with a free account can vote in an ordinary consultation at Home > Governance > Civic voting, but only ballots from members with a verified identity are counted; unverified ballots are recorded as advisory and counted once the voter is verified. A consultation may additionally require a verified identity, a minimum age, or residence in one country, and an active governance sanction blocks voting. The server checks these rules, and the ballot page shows the reason when you cannot vote. Token ownership, financial support, or wealth alone never creates voting authority.',
    localizedAnswers: { hy: VOTING_FAQ_HY.who_can_vote, ru: VOTING_FAQ_RU.who_can_vote },
    aliases: ['voting rights', 'who votes', 'who is eligible to vote', 'voting eligibility'],
    capabilityIds: ['civic_voting'],
    sourceRefs: ['docs/02-policies/governance/civizen-community-governance-charter.md'],
  },
  {
    id: 'what_is_governance_solutions',
    question: 'What is Governance Solutions?',
    answer:
      'Governance Solutions (Home > Governance > Governance Solutions) lets members post a civic Problem and Discuss or Solve it, including AI-assisted discussion. It is not the Solution Record produced by a Community Challenge.',
    aliases: ['solutions hub'],
    capabilityIds: ['governance_solutions'],
    sourceRefs: ['src/pages/governance/SolutionsHub.tsx'],
  },
  {
    id: 'what_is_the_civizen_constitution',
    question: 'What is the Civizen Constitution?',
    answer:
      'The current public community instrument is the Civizen Community Governance Charter (Home > Governance > Community Governance Charter). It is not the legal constitution of a government. The earlier Civizen Constitution v0.1 is superseded by that Charter.',
    aliases: ['civizen constitution', 'constitution v0.1'],
    capabilityIds: ['governance_charter'],
    sourceRefs: [
      'docs/02-policies/governance/civizen-community-governance-charter.md',
      'docs/01-governance/constitution/civizen-constitution-v0.1.md',
    ],
  },
  {
    id: 'constitutional_tokenomics',
    question: 'What is the Civizen Constitutional Tokenomics + Governance Model?',
    answer:
      'That document is historical and not adopted. It is not current policy and is not implemented as a monetary system. Current public funding policy is Funding and Financial Integrity. Luma is only a prototype credit. Current community governance text is the Community Governance Charter.',
    aliases: [
      'civizen constitutional tokenomics + governance model',
      'tokenomics constitution',
      'funding constitution',
    ],
    capabilityIds: ['tokenomics_governance', 'funding', 'governance_charter'],
    sourceRefs: [
      'docs/01-governance/funding-and-monetary/civizen-constitutional-tokenomics-governance.md',
      'docs/02-policies/institutional/funding-and-financial-integrity.md',
      'docs/02-policies/governance/civizen-community-governance-charter.md',
    ],
  },
  {
    id: 'how_can_an_organization_participate',
    question: 'How can an organization participate?',
    answer:
      'Open Contribute > Organization Partnership, or send an institutional inquiry from Contribute > Financial Support. Organizations also appear as linked business accounts that can publish Opportunities, Challenges, or Knowledge Spaces. There is no full partner CRM in this build.',
    aliases: ['organization partnership', 'how can my company join'],
    capabilityIds: ['partnerships'],
    sourceRefs: [
      'src/lib/contribute-lanes.ts',
      'docs/02-policies/institutional/international-partnerships-and-chapters.md',
    ],
  },
  {
    id: 'what_can_coordinators_do',
    question: 'What can coordinators do?',
    answer:
      'A coordinator is the publisher profile for a Program, Opportunity, Challenge, or Knowledge Space. They create and manage that work, review applicants or proposals, verify evidence, and (for Challenges) select a proposal and record the outcome.',
    aliases: ['publisher', 'organizer'],
    capabilityIds: ['programs', 'community_challenges', 'opportunities'],
    sourceRefs: ['docs/04-operations/dev/phase-1-pilot-operating-model.md', 'docs/04-operations/dev/contribute-page.md'],
  },
  {
    id: 'what_is_a_linked_organization',
    question: 'What is a publisher or linked organization account?',
    answer:
      'Phase 1 has no separate organizations table. A publisher is a profile. Business or organization coordination uses linked accounts on that profile. A member may link more than one business account from the profile menu Accounts +. Those organizations stay listed while you are signed into any of them. Swipe or scroll the account cards and tap one to switch. If the company already exists, Add business offers Connect instead of Register.',
    aliases: ['linked accounts', 'business account', 'publisher'],
    capabilityIds: ['profile', 'programs'],
    sourceRefs: ['docs/04-operations/dev/phase-1-pilot-operating-model.md'],
  },
  {
    id: 'how_can_an_institution_partner',
    question: 'How can an institution partner with Civizen?',
    answer:
      'Open Contribute > Organization Partnership and send an inquiry through Contribute > Financial Support. You can also create agreements from Market > Agreements (for example Partnership / Collaboration). A full Stakeholder Map and partner CRM are proposed institutional design, not a current app workspace.',
    aliases: ['institutional partnership'],
    capabilityIds: ['partnerships', 'agreements', 'institutional_blueprint'],
    sourceRefs: [
      'docs/02-policies/institutional/international-partnerships-and-chapters.md',
      'docs/institutional/stakeholder-partnership-framework.md',
    ],
  },
  {
    id: 'what_are_areas',
    question: 'What are Areas?',
    answer:
      'Areas are where help is needed. The current foundational Areas are Health, Education, Culture, Responsibility, and Environment. Browse them from Contribute, Home > Governance, or the public footer. They are not the same as product pillars.',
    aliases: ['foundational areas'],
    capabilityIds: ['areas'],
    sourceRefs: ['docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md', 'src/lib/areas/public-areas.ts'],
  },
  {
    id: 'what_are_initiatives',
    question: 'What are initiatives?',
    answer:
      'On public Area pages, initiatives are curated organized work toward an outcome, listed beside related systems. There is no full initiative workspace or matching engine in this build.',
    aliases: ['public initiatives'],
    capabilityIds: ['areas'],
    sourceRefs: ['src/lib/areas/public-areas-content.ts', 'docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md'],
  },
  {
    id: 'can_users_make_agreements',
    question: 'Can users make agreements through Civizen?',
    answer:
      'Open Market > Agreements and tap + beside the title. Choose a type such as General, Partnership / Collaboration, Employment, Service / Contribution, Sale / Purchase, Lease, or Funding / Sponsorship. Propose it, then sign in Civizen or record a paper/external signing.\n\nSupported types open a readable agreement document. You can start from a listing, Jobs, or another related activity. Ordinary Marketplace purchases stay as orders and do not automatically create a Sale / Purchase Agreement. Lease heading kinds include Residential, Commercial, Car, Vehicle, Equipment, Office, and Property rental.',
    aliases: [
      'how can I sign an agreement with anyone through civizen',
      'how can I sign an agreement',
      'can I create a contract',
      'agreements workspace',
      'car lease',
      'equipment lease',
      'rental agreement',
    ],
    capabilityIds: ['agreements'],
    sourceRefs: [
      'docs/04-operations/dev/agreements.md',
      'src/pages/Agreements.tsx',
      'src/lib/agreements-api.ts',
      'src/lib/feature-registry.ts',
    ],
  },
  {
    id: 'can_civizen_digitally_sign_contracts',
    question: 'Can Civizen digitally sign contracts?',
    answer:
      'Civizen supports native electronic signing in the Agreements workspace: a typed name plus explicit consent, which is stored on the signed version. Paper or an external e-sign service can be recorded separately. This is not a certified PKI digital signature and is not a claim that the record is legally certified or enforceable.',
    aliases: ['digital signatures', 'e-sign', 'pki signature'],
    capabilityIds: ['agreements'],
    sourceRefs: ['docs/04-operations/dev/agreements.md', 'src/lib/agreements-api.ts', 'src/lib/agreements-model.ts'],
  },
  {
    id: 'what_acceptance_records_exist',
    question: 'What kinds of acceptance or participation records currently exist?',
    answer:
      'Current records include Agreement versions and signatures, Terms acceptance, Opportunity applications and participations, Challenge proposals, and contribution evidence. These are platform records, not a general-purpose public notary.',
    aliases: ['participation records', 'terms acceptance'],
    capabilityIds: ['agreements', 'opportunities', 'community_challenges'],
    sourceRefs: ['docs/04-operations/dev/agreements.md', 'src/lib/terms-version.ts', 'src/lib/opportunities.ts'],
  },
  {
    id: 'does_civizen_have_happiness',
    question: 'Does Civizen have a Happiness Score?',
    answer:
      'No. Civizen does not show a numeric Happiness Score. Open Happiness & Fulfillment from the Profile menu. You see five levels — Struggling, Unsettled, Balanced, Flourishing, and Thriving — as states, not identities. Check-ins and reviews are private and are not used for Civizen Score, reputation, hiring, or voting power.',
    aliases: ['happiness score', 'wellbeing score', 'mental health score', 'how am I doing'],
    capabilityIds: ['happiness', 'score'],
    sourceRefs: [
      'docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md',
      'src/lib/happiness/levels.ts',
      'src/pages/happiness/Happiness.tsx',
    ],
  },
  {
    id: 'where_is_happiness',
    question: 'Where is Happiness & Fulfillment?',
    answer:
      'Open Happiness & Fulfillment from the Profile menu. Check in, review wellbeing, open Improve for Fulfillment Plans, or open Work Fulfillment. Privacy is under Happiness & Fulfillment > Privacy. Authorized viewers use Wellbeing Insights and Human Outcome Review.',
    aliases: ['happiness page', 'wellbeing', 'fulfillment', 'fulfillment plan'],
    capabilityIds: ['happiness', 'work_fulfillment'],
    sourceRefs: ['src/lib/app-pages.ts', 'src/pages/happiness/Happiness.tsx'],
  },
  {
    id: 'where_are_jobs',
    question: 'Where do I look for a job?',
    answer:
      'Open Jobs from the public website, or Market > Jobs. Anyone can look for work or post a job without signing up. Signed-in members can unfold More for work days, hours, languages, and notes. Contact details stay locked until you sign in. Work Fulfillment helps you understand fit and improve current work. Contribute Opportunities are for trying activities, not job matching. Happiness and Work Joy stay private and are not sent to employers.',
    aliases: ['job search', 'employment', 'hiring', 'job fit', 'post a job', 'look for work without account'],
    capabilityIds: ['market', 'work_fulfillment', 'happiness'],
    sourceRefs: ['src/pages/Market.tsx', 'src/components/market/MarketJobsInterestForm.tsx', 'docs/04-operations/dev/market-jobs-public.md', 'src/lib/happiness/fulfillment/jobs-bridge.ts'],
  },
  {
    id: 'can_post_job_without_account',
    question: 'Can I look for a job without signing up?',
    answer:
      'Yes. Open Jobs from the public website, or Market > Jobs. Anyone can browse Available work, look for workers, or post an opening without an account. Contact details stay locked until you sign in. There is no paid unlock.',
    aliases: ['public jobs', 'post job without account', 'guest job board'],
    capabilityIds: ['market'],
    sourceRefs: ['docs/04-operations/dev/market-jobs-public.md', 'src/pages/Market.tsx', 'src/components/market/MarketJobsBoard.tsx'],
  },
  {
    id: 'can_employer_see_happiness',
    question: 'Can my employer see my Happiness?',
    answer:
      'No. Individual Happiness & Fulfillment stays private. If you turn on privacy-protected group insights in Happiness Privacy, qualifying information may contribute to group insights only when enough people are included. Authorized viewers may open Wellbeing Insights. That is not employer access to your Happiness, and it is separate from Job Fit sharing.',
    aliases: ['employer wellbeing', 'organization happiness', 'anonymous happiness', 'group insights'],
    capabilityIds: ['happiness', 'wellbeing_aggregate'],
    sourceRefs: [
      'docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md',
      'src/pages/happiness/HappinessPrivacy.tsx',
      'src/pages/wellbeing/WellbeingInsights.tsx',
    ],
  },
];
