import { PERSONAL_HARDSHIP_FAQ_ID, PERSONAL_HARDSHIP_REPLY } from '../hardship';
import { CANONICAL_CIVIZEN_IDENTITY, CANONICAL_CIVIZEN_IDENTITY_LOCALIZED } from '../identity';
import { PEACE_COOPERATION_FAQ_ID, PEACE_COOPERATION_REPLY } from '../peace';
import type { AssistantFaqItem } from '../types';

export const ASSISTANT_FAQ_PART_1: AssistantFaqItem[] = [
  {
    id: 'what_is_civizen',
    question: 'What is Civizen?',
    answer: CANONICAL_CIVIZEN_IDENTITY,
    localizedAnswers: CANONICAL_CIVIZEN_IDENTITY_LOCALIZED,
    aliases: [
      'what is civizen',
      "what's civizen",
      "what's civizen in one sentence",
      'civizen in one sentence',
      'define civizen',
      'how would you describe civizen',
      'what kind of system is civizen',
      'what is the purpose of civizen',
      'civizen mission',
      'civizen identity',
    ],
    capabilityIds: [],
    sourceRefs: ['docs/assistant/civizen-identity.md'],
  },
  {
    id: 'what_civizen_trying_to_accomplish',
    question: 'What is Civizen trying to accomplish?',
    answer:
      `${CANONICAL_CIVIZEN_IDENTITY} Its long-term aim includes a legitimate pathway toward recognized planetary citizenship. That recognition is not current legal status.`,
    aliases: ['why civizen exists', 'what is civizen trying to do'],
    capabilityIds: [],
    sourceRefs: [
      'docs/assistant/civizen-identity.md',
      'docs/00-foundation/why-civizen-exists-page-brief.md',
      'docs/00-foundation/recognized-planetary-citizenship-pathway.md',
    ],
  },
  {
    id: 'is_civizen_a_social_network',
    question: 'Is Civizen a social network?',
    answer:
      'No. Civizen has profiles, posts, and messaging, but those are components of a broader participatory system. Civizen is not merely a social network.',
    aliases: ['is civizen social media'],
    capabilityIds: [],
    sourceRefs: ['docs/assistant/civizen-identity.md'],
  },
  {
    id: 'can_i_edit_a_post',
    question: 'Can I edit a post after I publish it?',
    answer:
      'Yes. Open Home, then the post ⋯ menu, and choose Edit post. You can change the text and formatting whenever you like. After you save a change, the post shows Edited next to the time. Comments, likes, and reposts stay in place.',
    aliases: [
      'edit post',
      'how do I edit a post',
      'can I change a post',
      'edit old post',
    ],
    capabilityIds: ['home'],
    sourceRefs: ['src/pages/Home.tsx', 'docs/04-operations/dev/home-post-formatting.md'],
  },
  {
    id: 'is_civizen_a_government',
    question: 'Is Civizen a government?',
    answer:
      'No. Civizen is not currently a government, nationality, or public-law citizenship. World citizenship in Civizen is a voluntary civic identity. The long-term pathway toward recognized planetary citizenship is described publicly and is not present legal status.',
    aliases: ['is civizen a country', 'is civizen citizenship legal'],
    capabilityIds: ['governance_charter'],
    sourceRefs: [
      'docs/00-foundation/recognized-planetary-citizenship-pathway.md',
      'docs/02-policies/institutional/current-legal-status-notice.md',
    ],
  },
  {
    id: 'is_civizen_a_project_collaboration_platform',
    question: 'Is Civizen basically a project collaboration platform?',
    answer:
      'No. Project collaboration is one component. Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within. Challenges, Projects, Market, Study, and similar surfaces are parts of that broader system, not the definition of it.',
    aliases: [
      'is civizen a project platform',
      'is civizen mainly a challenge platform',
      'is civizen just a collaboration app',
    ],
    capabilityIds: [],
    sourceRefs: ['docs/assistant/civizen-identity.md'],
  },
  {
    id: 'who_is_civi',
    question: 'Who is Civi?',
    answer:
      'Civi is Civizen’s AI assistant. Visitors can ask Civi about the project without creating an account — open the Civi button at the lower right. Members can also chat with Civi in Messaging.',
    aliases: [
      'what is civi',
      'civi assistant',
      'talk to civi',
      'ask civi without registering',
      'civi without an account',
    ],
    capabilityIds: ['nela'],
    sourceRefs: [
      'docs/assistant/civizen-assistant-cheatsheet.md',
      'src/components/public/PublicCiviWidget.tsx',
    ],
  },
  {
    id: 'what_can_i_do_in_civizen_now',
    question: 'What can I do in Civizen right now?',
    answer:
      'In this build you can use Home, Study, Contribute (Opportunities, Community Challenges, Questions, Issues & Ideas, Suggest Improvements, Learning Commons, My Contributions), Market, Agreements, Messaging, Profile and Score, Happiness & Fulfillment, Areas, and Governance tools such as Civic voting and Governance Solutions. This is what is implemented today, not a full description of what Civizen is.',
    aliases: [
      'what can I currently do in civizen',
      'what can I do in civizen',
      'what works in civizen today',
      'current civizen features',
    ],
    capabilityIds: ['home', 'study', 'contribute_hub', 'market', 'messaging'],
    sourceRefs: ['docs/assistant/civizen-assistant-cheatsheet.md', 'src/lib/main-nav.ts'],
  },
  {
    id: 'how_can_i_contribute',
    question: 'How can I contribute?',
    answer:
      'Open Contribute and choose how you want to help: Volunteer, Opportunities, Financial Support, Organization Partnership, Community Challenges, Questions, Issues & Ideas, Suggest Improvements, Learning Commons, or My Contributions.',
    aliases: ['how do I contribute', 'ways to contribute', 'how can I volunteer'],
    capabilityIds: ['contribute_hub'],
    sourceRefs: ['src/lib/contribute-lanes.ts', 'docs/04-operations/dev/contribute-page.md'],
  },
  {
    id: 'how_do_i_raise_a_question_or_issue',
    question: 'How do I ask a question or raise an issue?',
    answer:
      'Open Contribute > Questions, Issues & Ideas. Create a Matter, choose the person or organization it is for, and submit. The Current Action panel shows who must respond and when. Comments are discussion only; only Provide final answer starts the review timer. If the Matter needs actual work, the responsible party can start collaborative work and assign Tasks. Completing a Task does not close the Matter. Ordinary work completion waits until required Tasks are Completed or Cancelled. Suggest Improvements opens a Suggestion to Civizen.',
    aliases: [
      'how do I raise an issue',
      'how do I ask a question in civizen',
      'questions issues and ideas',
      'where do I send a suggestion',
    ],
    capabilityIds: ['matters', 'contribute_hub'],
    sourceRefs: ['docs/04-operations/dev/matter-collaboration.md', 'src/lib/contribute-lanes.ts'],
  },
  {
    id: PERSONAL_HARDSHIP_FAQ_ID,
    question: 'I am homeless. Can Civizen help me?',
    answer: PERSONAL_HARDSHIP_REPLY,
    aliases: [
      "I'm homeless, can you help me?",
      'I need shelter',
      'I have nowhere to stay',
      'can Civizen house me',
    ],
    capabilityIds: ['market', 'community_challenges'],
    sourceRefs: ['src/lib/assistant/hardship.ts', 'docs/assistant/civizen-assistant-cheatsheet.md'],
  },
  {
    id: PEACE_COOPERATION_FAQ_ID,
    question: 'How can we stop wars?',
    answer: PEACE_COOPERATION_REPLY,
    aliases: [
      'how do we achieve peace',
      'how can humanity live in peace',
      'how can we unite humanity',
      'how do we end war',
    ],
    capabilityIds: ['study', 'contribute_hub', 'community_challenges', 'opportunities', 'governance'],
    sourceRefs: [
      'src/lib/assistant/peace.ts',
      'docs/assistant/civizen-assistant-cheatsheet.md',
      'docs/00-foundation/why-civizen-exists-page-brief.md',
      'docs/00-foundation/recognized-planetary-citizenship-pathway.md',
    ],
  },
  {
    id: 'what_are_opportunities',
    question: 'What are Opportunities?',
    answer:
      'Opportunities are short, verifiable pieces of work. Find them under Contribute > Opportunities. You apply, complete the work, submit evidence, and an evaluator verifies it. Older names like professional listings or open tasks mean Opportunities.',
    aliases: ['what are professional listings', 'what are open tasks', 'what are tasks'],
    capabilityIds: ['opportunities'],
    sourceRefs: ['src/lib/contribute-lanes.ts', 'docs/04-operations/dev/contribute-page.md'],
  },
  {
    id: 'what_are_community_challenges',
    question: 'What are Community Challenges?',
    answer:
      'Community Challenges are a live Contribute lane for real local problems. The flow is Challenge → Proposal → coordinator selection → Implementation Project → work Opportunities → outcome → Solution Record. Open Contribute > Community Challenges. This is not Governance Solutions.',
    aliases: ['what is a community challenge', 'what are challenges'],
    capabilityIds: ['community_challenges'],
    sourceRefs: [
      'src/pages/contribute/CommunityChallenges.tsx',
      'docs/04-operations/dev/contribute-page.md',
      'docs/04-operations/dev/phase-1-pilot-operating-model.md',
    ],
  },
  {
    id: 'who_can_create_a_community_challenge',
    question: 'Who can create a Community Challenge?',
    answer:
      'Signed-in members can create a challenge from Create on Contribute > Community Challenges. The publisher (your profile or a linked organization account) becomes the coordinator for that challenge. Proposal selection is done by the coordinator, not by public voting.',
    aliases: ['who can create one', 'who creates challenges'],
    capabilityIds: ['community_challenges'],
    sourceRefs: ['src/pages/contribute/CommunityChallenges.tsx', 'src/pages/contribute/ChallengeForm.tsx'],
  },
  {
    id: 'what_are_projects',
    question: 'What are Projects?',
    answer:
      'Projects are implementation records inside Community Challenges. There is no separate projects board. Contribute > Projects sends you to Community Challenges.',
    aliases: ['community projects', 'implementation projects'],
    capabilityIds: ['projects'],
    sourceRefs: ['docs/04-operations/dev/contribute-page.md'],
  },
  {
    id: 'what_is_my_contributions',
    question: 'What is My Contributions?',
    answer:
      'My Contributions (Contribute > My Contributions) shows work you applied for, completed, or had verified. Your Profile Contributions ledger shows the inspectable record that feeds Score.',
    aliases: ['where are my contributions'],
    capabilityIds: ['my_contributions'],
    sourceRefs: ['src/lib/contribute-lanes.ts', 'src/pages/contribute/ContributeImpact.tsx'],
  },
  {
    id: 'what_is_study',
    question: 'What is Study?',
    answer:
      'Study is the learning hub in the bottom navigation. It holds civic learning materials such as charter/constitution study and links to the Law library. It is not the same as Learning Commons, where people share practical contribution knowledge.',
    aliases: ['what is the study tab'],
    capabilityIds: ['study'],
    sourceRefs: ['src/lib/study.ts', 'docs/assistant/civizen-assistant-cheatsheet.md'],
  },
  {
    id: 'what_are_knowledge_spaces',
    question: 'What are Knowledge Spaces?',
    answer:
      'Knowledge Spaces are shared collections in Contribute > Learning Commons. Each space holds resources, can name Knowledge Gaps, and can link resulting work back as improved knowledge.',
    aliases: ['what is learning commons', 'what is a knowledge space'],
    capabilityIds: ['knowledge_spaces'],
    sourceRefs: ['src/lib/knowledge.ts', 'docs/04-operations/dev/contribute-page.md'],
  },
  {
    id: 'what_are_knowledge_gaps',
    question: 'What are Knowledge Gaps?',
    answer:
      'Knowledge Gaps name what is missing, weak, outdated, or still needs practical development inside a Knowledge Space. A coordinator can turn a gap into an Opportunity or a Community Challenge.',
    aliases: ['what is a knowledge gap'],
    capabilityIds: ['knowledge_gaps'],
    sourceRefs: ['docs/04-operations/dev/contribute-page.md'],
  },
  {
    id: 'what_are_solution_records',
    question: 'What are Solution Records?',
    answer:
      'A Solution Record is the outcome kept after a Community Challenge is actually implemented. It is not the Governance Solutions page. Coordinators can share a Solution Record into a Knowledge Space.',
    aliases: ['what is a solution record'],
    capabilityIds: ['solution_records'],
    sourceRefs: ['docs/04-operations/dev/contribute-page.md'],
  },
];
