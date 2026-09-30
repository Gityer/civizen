import { PERSONAL_HARDSHIP_FAQ_ID, PERSONAL_HARDSHIP_REPLY } from './hardship';
import { CANONICAL_CIVIZEN_IDENTITY } from './identity';
import { PEACE_COOPERATION_FAQ_ID, PEACE_COOPERATION_REPLY } from './peace';
import type {
  AssistantCapability,
  AssistantFaqItem,
  TerminologyAlias,
} from './types';

/**
 * Curated Civi capability registry.
 * Status must describe the current application, not a roadmap hope.
 * Prefer deriving routes and names from live product surfaces.
 */
export const ASSISTANT_CAPABILITIES: AssistantCapability[] = [
  {
    id: 'home',
    name: 'Home',
    status: 'implemented',
    description: 'Signed-in home feed with Score snapshot, Governance shortcut, post composer with formatting (including line spacing), Edit post for the author, and post actions Like · Comment · Repost · Publish to….',
    howTo: 'Open Home from the bottom nav. Share a post from the composer; Bold, Italic, Underline, lists, and line spacing are available while the composer is focused. On any post: Like, Comment (discussion under the post), Repost (plain or with thoughts into your own feed), or Publish to… (external networks when you are the author on the official Civizen org account). The author (or the organization account that published it) can Edit post at any time; Edited appears next to the time after a change. Repost keeps a link to the original — it does not copy the text.',
    routes: ['/'],
    roles: ['member', 'citizen', 'verified_member', 'certified', 'moderator', 'admin', 'founder'],
    relatedCapabilities: ['score', 'governance', 'messaging'],
    aliases: ['feed', 'timeline'],
    sourceRefs: ['src/pages/Home.tsx', 'src/lib/main-nav.ts'],
  },
  {
    id: 'study',
    name: 'Study',
    status: 'implemented',
    description:
      'Learning hub for civic materials such as the Community Governance Charter, laws, and related study domains. Distinct from Learning Commons.',
    howTo: 'Open Study from the bottom navigation.',
    routes: ['/study', '/law'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['governance_charter', 'knowledge_spaces'],
    aliases: ['learning hub', 'courses'],
    sourceRefs: ['src/lib/study.ts', 'src/lib/main-nav.ts', 'docs/assistant/civizen-assistant-cheatsheet.md'],
  },
  {
    id: 'contribute_hub',
    name: 'Contribute',
    status: 'implemented',
    description:
      'Participation gateway asking how you would like to contribute today. Ways, Community, Knowledge, and Your Impact.',
    howTo: 'Open Contribute from the bottom navigation.',
    routes: ['/contribute'],
    roles: ['member'],
    relatedCapabilities: ['opportunities', 'community_challenges', 'knowledge_spaces', 'my_contributions', 'matters'],
    aliases: ['contribution hub', 'how can I contribute'],
    sourceRefs: [
      'src/lib/contribute-lanes.ts',
      'docs/04-operations/dev/contribute-page.md',
      'docs/assistant/civizen-assistant-cheatsheet.md',
    ],
  },
  {
    id: 'opportunities',
    name: 'Opportunities',
    status: 'implemented',
    description:
      'Short verifiable pieces of work. Education-to-Contribution lives under Contribute > Opportunities. Apply, complete work, submit evidence, and get it verified.',
    howTo:
      'Open Contribute > Opportunities. Open an opportunity, apply, do the work, then submit evidence for verification.',
    routes: ['/contribute/professional', '/contribute/professional/new'],
    roles: ['member'],
    relatedCapabilities: ['my_contributions', 'score', 'community_challenges', 'knowledge_gaps'],
    aliases: ['professional listings', 'open tasks', 'professional skills', 'tasks'],
    sourceRefs: [
      'src/lib/contribute-lanes.ts',
      'src/pages/contribute/ProfessionalOpportunities.tsx',
      'docs/04-operations/dev/contribute-page.md',
    ],
  },
  {
    id: 'community_challenges',
    name: 'Community Challenges',
    status: 'implemented',
    description:
      'Name a local problem, collect proposals, choose one solution, implement it through a Project, and keep a Solution Record. Distinct from Governance Solutions.',
    howTo:
      'Open Contribute > Community Challenges. Use Create to start a challenge. Others can submit proposals; the coordinator selects one and runs implementation work as Opportunities.',
    routes: ['/contribute/challenges', '/contribute/challenges/new'],
    roles: ['member'],
    relatedCapabilities: ['projects', 'solution_records', 'opportunities', 'programs'],
    aliases: ['challenges', 'community problem-solving', 'problem solving lab'],
    sourceRefs: [
      'src/lib/challenges.ts',
      'src/pages/contribute/CommunityChallenges.tsx',
      'docs/04-operations/dev/contribute-page.md',
      'docs/04-operations/dev/phase-1-pilot-operating-model.md',
    ],
  },
  {
    id: 'matters',
    name: 'Questions, Issues & Ideas',
    status: 'implemented',
    description:
      'Generic Matter collaboration under Contribute. Ask a question, raise an issue, suggest an improvement, or work with others toward an outcome. Every active Matter shows who must act next, what is expected, when it is due, and what happens if nobody acts. Comments are not formal actions. When work is needed, the responsible party can start collaborative work, assign Tasks, record Decisions, and return to the same resolution confirmation flow. Completing a Task does not resolve the Matter. Ordinary collaborative-work completion requires required Tasks to be Completed or Cancelled; inviting someone to collaborate is not the same as asking them to accept shared responsibility. Authorized leads can add AI assistance, including a Coding Agent that uses a live model to inspect and edit authorized files through a trusted isolated worktree runner for human review — it does not commit, push, or deploy.',
    howTo:
      'Open Contribute > Questions, Issues & Ideas. Create a Matter, choose the intended person or organization, then follow the Current Action panel. For work that needs several people, use Start collaborative work. Needs Your Action also lists assigned Tasks.',
    routes: ['/contribute/matters', '/contribute/matters/new'],
    roles: ['member'],
    relatedCapabilities: ['contribute_hub'],
    aliases: ['matters', 'questions', 'issues', 'ideas', 'suggestions', 'requests', 'discussions'],
    sourceRefs: [
      'src/lib/matters.ts',
      'src/pages/contribute/Matters.tsx',
      'src/pages/contribute/MatterWorkPanel.tsx',
      'src/pages/contribute/MatterAgentPanel.tsx',
      'docs/04-operations/dev/matter-collaboration.md',
      'docs/04-operations/dev/contribute-page.md',
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    status: 'implemented',
    description:
      'Implementation records inside Community Challenges. There is no separate community-projects board. Contribute > Projects redirects to Challenges.',
    routes: ['/contribute/challenges'],
    roles: ['member'],
    relatedCapabilities: ['community_challenges', 'opportunities'],
    aliases: ['implementation project', 'community projects'],
    sourceRefs: ['docs/04-operations/dev/contribute-page.md', 'docs/04-operations/dev/phase-1-pilot-operating-model.md'],
  },
  {
    id: 'knowledge_spaces',
    name: 'Knowledge Spaces',
    status: 'implemented',
    description:
      'Learning Commons collections of practical resources. Distinct from Study and Governance Solutions.',
    howTo: 'Open Contribute > Learning Commons.',
    routes: ['/contribute/knowledge', '/contribute/knowledge/new'],
    roles: ['member'],
    relatedCapabilities: ['knowledge_gaps', 'solution_records', 'study'],
    aliases: ['learning commons', 'shared knowledge'],
    sourceRefs: [
      'src/lib/knowledge.ts',
      'src/pages/contribute/KnowledgeSpaces.tsx',
      'docs/04-operations/dev/contribute-page.md',
    ],
  },
  {
    id: 'knowledge_gaps',
    name: 'Knowledge Gaps',
    status: 'implemented',
    description:
      'Named gaps in a Knowledge Space. Coordinators can turn an actionable gap into an Opportunity or a Community Challenge.',
    routes: ['/contribute/knowledge'],
    roles: ['member'],
    relatedCapabilities: ['knowledge_spaces', 'opportunities', 'community_challenges'],
    aliases: ['gaps'],
    sourceRefs: ['src/lib/knowledge.ts', 'docs/04-operations/dev/contribute-page.md'],
  },
  {
    id: 'solution_records',
    name: 'Solution Records',
    status: 'implemented',
    description:
      'Outcome record created when a Community Challenge completes. May link a Human Outcome Review and a public-safe lesson. Negative or unclear human outcomes are preserved. Not a Happiness ranking and not Governance Solutions.',
    routes: ['/contribute/challenges'],
    roles: ['member'],
    relatedCapabilities: ['community_challenges', 'knowledge_spaces', 'governance_solutions'],
    aliases: ['challenge solution record'],
    sourceRefs: ['src/lib/challenges.ts', 'docs/04-operations/dev/contribute-page.md'],
  },
  {
    id: 'programs',
    name: 'Programs',
    status: 'implemented',
    description:
      'Containers for contribution work (education_to_contribution, community_problem_solving, shared_knowledge). Published by a profile.',
    routes: ['/contribute'],
    roles: ['member'],
    relatedCapabilities: ['opportunities', 'community_challenges', 'knowledge_spaces'],
    aliases: ['contribution programs'],
    sourceRefs: ['src/lib/challenges.ts', 'docs/04-operations/dev/phase-1-pilot-operating-model.md'],
  },
  {
    id: 'my_contributions',
    name: 'My Contributions',
    status: 'implemented',
    description: 'Your applications, completed work, and verified participations across opportunity kinds.',
    howTo: 'Open Contribute > My Contributions. Profile also shows the Contributions ledger.',
    routes: ['/contribute/impact', '/profile/contributions'],
    roles: ['member'],
    relatedCapabilities: ['opportunities', 'score'],
    aliases: ['impact', 'contribution ledger'],
    sourceRefs: ['src/pages/contribute/ContributeImpact.tsx', 'src/lib/contribute-lanes.ts'],
  },
  {
    id: 'contribute_improvements',
    name: 'Suggest Improvements',
    status: 'implemented',
    description:
      'Shortcut into Matter create as a Suggestion addressed to Civizen. Not a separate suggestion backend, and not a second place for Opportunities, Challenges, or shared knowledge.',
    howTo: 'Open Contribute > Suggest Improvements. It opens a new Matter already set as a Suggestion to Civizen. You can edit the type, recipient, and Area before submitting.',
    routes: ['/contribute/improvements', '/contribute/matters/new'],
    roles: ['member'],
    relatedCapabilities: ['contribute_hub', 'matters'],
    aliases: ['product suggestions'],
    sourceRefs: ['src/lib/contribute-lanes.ts', 'docs/04-operations/dev/contribute-page.md', 'docs/04-operations/dev/matter-collaboration.md'],
  },
  {
    id: 'market',
    name: 'Market',
    status: 'implemented',
    description:
      'Public Jobs board plus marketplace listings, products, and services. Anyone can look for work or post a job without an account. Contact details stay locked until sign-in. Start agreement or Contact for member listings. Ordinary orders use Marketplace terms.',
    howTo: 'Open Jobs from the public website, or Market > Jobs. The page title is Marketplace / Jobs. The sentence fills place from your location and shows a guide pay for the job type. Employers look for a person, not a job. Guests can browse and post there. Signed-in members can unfold More for work days, hours, languages, and notes.',
    routes: ['/jobs', '/market'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['agreements', 'prototype_credits'],
    aliases: ['marketplace', 'listings'],
    sourceRefs: ['src/pages/Market.tsx', 'src/lib/main-nav.ts', 'docs/04-operations/dev/agreements.md', 'docs/04-operations/dev/market-jobs-public.md'],
  },
  {
    id: 'agreements',
    name: 'Agreements',
    status: 'implemented',
    description:
      'Platform workspace to create, review, sign, and keep agreements with people and organizations. Supported types open purpose-built documents (including Employment and Lease). Native electronic signing uses typed name plus explicit consent. Paper or external execution can be recorded. Not a certified PKI digital signature and not a claim of legal enforceability.',
    howTo:
      'Open Market > Agreements. Tap + beside the title, choose a type (Employment and Lease are in the common list; Lease includes Car, Vehicle, Residential, Commercial, Equipment, Office, and Property rental), edit the agreement document, create it, then propose and sign.',
    routes: ['/agreements', '/agreements/new'],
    roles: ['member', 'citizen', 'verified_member', 'certified', 'moderator', 'admin', 'founder'],
    relatedCapabilities: ['market', 'partnerships', 'opportunities'],
    aliases: ['contracts', 'sign agreement', 'e-sign', 'digital signature', 'collaboration agreement', 'employment agreement', 'lease', 'car lease', 'equipment lease', 'rental agreement'],
    sourceRefs: [
      'docs/04-operations/dev/agreements.md',
      'src/lib/agreements-model.ts',
      'src/lib/agreements-api.ts',
      'src/pages/Agreements.tsx',
      'src/lib/feature-registry.ts',
    ],
  },
  {
    id: 'messaging',
    name: 'Messaging',
    status: 'implemented',
    description:
      'Private conversations, including a pinned chat with Civi. Person-to-person chats can be hidden from your inbox (the other person keeps their copy). Disappearing messages is a shared thread setting both people see, applying to new messages. You can edit or unsend your own message for one minute. Civi chats can be cleared entirely. Searching for people can use phone contacts with permission; people not on Civizen can be invited. Optional device-based E2EE for person-to-person chat.',
    routes: ['/messaging'],
    roles: ['member'],
    relatedCapabilities: ['nela'],
    aliases: ['chat', 'dm', 'inbox'],
    sourceRefs: ['src/components/ui/chat-bar.tsx', 'src/lib/main-nav.ts'],
  },
  {
    id: 'nela',
    name: 'Civi',
    status: 'implemented',
    description:
      'Civi is Civizen’s AI assistant. Visitors can ask project questions without creating an account. Members also find Civi pinned in Messaging. Answers from current project knowledge for this build. When Civi does not already have a good answer and uses Gemini, it checks that reply and may remember it for similar questions later. Identity, the capability registry, and the cheat sheet still win. Personal records are not stored in Civi memory. During development, founders can review questions and replies at Settings > AI Agent.',
    howTo: 'Open the Civi button at the lower right, or Messaging after you sign in. Founders can review interaction history from Settings > AI Agent.',
    routes: ['/onboarding', '/messaging', '/settings/ai-agent'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['messaging'],
    aliases: ['nela', 'civi', 'assistant', 'in-app assistant', 'ai assistant', 'your ai assistant'],
    sourceRefs: [
      'supabase/functions/messaging-agent-reply/index.ts',
      'src/lib/messaging-constants.ts',
      'src/components/public/PublicCiviWidget.tsx',
      'src/lib/assistant/learned-memory.ts',
      'src/pages/settings/AiAgentSettings.tsx',
    ],
  },
  {
    id: 'why_civizen_exists',
    name: 'Why Civizen Exists',
    status: 'implemented',
    description:
      'Public founding message: Civizen exists to help people unite around shared human responsibility, with practical systems for cooperation and peace. Unity does not require uniformity. Nations and cultures stay. Complementary world citizenship is a civic identity, not current legal nationality.',
    howTo: 'Open Why Civizen Exists from the public site, or ask Civi how we can stop wars or unite humanity.',
    routes: ['/why-this-exists'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['study', 'contribute_hub', 'governance'],
    aliases: ['why this exists', 'why civizen', 'founding message', 'unite humanity'],
    sourceRefs: [
      'docs/00-foundation/why-civizen-exists-page-brief.md',
      'docs/00-foundation/recognized-planetary-citizenship-pathway.md',
      'docs/00-foundation/the-civizen-charter.md',
      'src/lib/assistant/peace.ts',
    ],
  },
  {
    id: 'profile',
    name: 'Profiles',
    status: 'implemented',
    description:
      'Member and linked business profiles with identity, education, experience, skills, endorsements, and Score. Optional Identity verification from Settings → Edit Profile uploads an ID photo and face photo for staff review when stronger trust is needed (not at signup; not a government ID).',
    howTo:
      'Open Profile from the menu. To verify identity when needed: Open Settings > Edit Profile, then use Identity verification to upload an ID photo and a face photo and submit for review.',
    routes: ['/profile', '/settings/profile'],
    roles: ['member'],
    relatedCapabilities: ['score', 'my_contributions', 'governance'],
    aliases: ['account', 'edit profile', 'identity verification', 'verify identity'],
    sourceRefs: [
      'src/lib/feature-registry.ts',
      'src/lib/identity-verification.ts',
      'docs/04-operations/dev/identity-verification-manual.md',
      'docs/assistant/civizen-assistant-cheatsheet.md',
    ],
  },
  {
    id: 'score',
    name: 'Civizen Score',
    status: 'implemented',
    description:
      'Score V2 with Learning, Experience, Skills, Performance, and Contributions. Public overall score is established activity. Tiers: Explorer, Builder, Contributor, Catalyst, Steward. Still in formation. Happiness data is not part of Score.',
    howTo: 'Open Profile or the Home Score card. Contributions detail is also under Profile > Contributions.',
    routes: ['/profile', '/profile/contributions'],
    roles: ['member'],
    relatedCapabilities: ['my_contributions', 'profile'],
    aliases: ['rating', 'reputation', 'civizen score v2'],
    sourceRefs: ['src/lib/civizen-score-model.ts', 'docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md'],
  },
  {
    id: 'happiness',
    name: 'Happiness & Fulfillment',
    status: 'implemented',
    description:
      'Private Happiness & Human Fulfillment. Five levels (Struggling, Unsettled, Balanced, Flourishing, Thriving) — not a numeric Happiness Score. Adaptive check-ins record today’s feeling, multiple life areas, and specific supports or problems; weekly pulse, monthly review, Fulfillment Plans under Improve, causes, and small actions with follow-up. Private by default. Not used for Score, reputation, hiring, or governance power. Work issues open Work Fulfillment. Actual employment uses Marketplace Jobs. Optional privacy-protected group insights are off by default and never show individual Happiness to employers. Civi may receive a grounded Plan brief; it must not invent history or diagnose. Follow-up timing can be stored; notifications are not sent yet.',
    howTo: 'Open Happiness & Fulfillment from the Profile menu. Check in from Overview or the Check-ins tab, review wellbeing, or Improve to start a Fulfillment Plan.',
    routes: ['/happiness', '/happiness/check-in', '/happiness/review', '/happiness/improve', '/happiness/privacy'],
    roles: ['member'],
    relatedCapabilities: ['work_fulfillment', 'study', 'opportunities', 'contribute_hub', 'market', 'wellbeing_aggregate'],
    aliases: ['wellbeing', 'happiness score', 'how am I doing', 'fulfillment'],
    sourceRefs: [
      'docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md',
      'src/pages/happiness/Happiness.tsx',
      'src/lib/happiness/model.ts',
    ],
  },
  {
    id: 'work_fulfillment',
    name: 'Work Fulfillment',
    status: 'implemented',
    description:
      'Distinct Work Fulfillment & Occupational Fit subunit inside Happiness. Current work, Work Joy Monitor, Fit profile, improve-current-work first. Contribute is for trying work (Contribution Fit). Marketplace Jobs is for actual employment (Job Fit). Study for learning/reskill. Low work fulfillment does not automatically recommend a new career. No public Work Fulfillment or Job Fit score. Approved shareable preferences may prefill Jobs; private Joy, diagnoses, and notes never transfer.',
    howTo: 'Open Happiness & Fulfillment, then Work Fulfillment. For a job, open Market > Jobs.',
    routes: ['/happiness/work', '/market'],
    roles: ['member'],
    relatedCapabilities: ['happiness', 'study', 'opportunities', 'contribute_hub', 'market'],
    aliases: ['occupational fit', 'work joy', 'career fit'],
    sourceRefs: [
      'docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md',
      'src/lib/work-fulfillment/types.ts',
      'src/pages/happiness/HappinessWork.tsx',
    ],
  },
  {
    id: 'wellbeing_aggregate',
    name: 'Wellbeing Insights',
    status: 'implemented',
    description:
      'Authorized viewers can open Wellbeing Insights and Human Outcome Reviews for privacy-protected group patterns. Individual Happiness stays private. Published lessons are Civizen-member readable after an intentional publish step, not anonymous internet access. There is no Happiness impact score, ranking, or causal claim from before-and-after observation.',
    howTo: 'Open Happiness & Fulfillment > Privacy, or Wellbeing Insights. After a linked Challenge, Project, or Governance action, use Human Outcome Review. Participation is off by default.',
    routes: ['/happiness/privacy', '/wellbeing-insights', '/wellbeing-insights/outcome'],
    roles: ['member'],
    relatedCapabilities: ['happiness'],
    aliases: ['anonymous happiness', 'employer wellbeing dashboard', 'organization happiness score', 'human outcome review'],
    sourceRefs: ['docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md', 'src/pages/wellbeing/WellbeingInsights.tsx'],
  },
  {
    id: 'governance',
    name: 'Governance',
    status: 'implemented',
    description:
      'Public governance landing, civic voting, member proposal workspace, and related policy pages. Current public community instrument is the Community Governance Charter.',
    howTo:
      'Open Home > Governance for the landing, Home > Governance > Civic voting for elections, and Home > Governance workspace for member proposals.',
    routes: ['/governance', '/governance/workspace', '/governance/new', '/governance/voting'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['governance_charter', 'civic_voting', 'governance_solutions'],
    aliases: ['civic governance', 'proposals'],
    sourceRefs: [
      'src/pages/governance/PublicGovernanceLanding.tsx',
      'docs/02-policies/governance/civizen-community-governance-charter.md',
    ],
  },
  {
    id: 'civic_voting',
    name: 'Civic voting',
    status: 'implemented',
    description:
      'Elections catalog and election detail/observe at /governance/voting. Public browsing is available. The first real public consultation is A Single World Citizenship: a global, nonbinding question on whether humanity should work toward a single world citizenship shared by all people regardless of nationality. Support, Oppose, and Abstain are equal. A Support vote does not create or grant citizenship. Token wealth does not create voting power.',
    routes: ['/governance/voting'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['governance'],
    aliases: ['elections', 'vote'],
    sourceRefs: ['src/pages/governance/CivicVotingHub.tsx', 'docs/02-policies/governance/civizen-community-governance-charter.md'],
  },
  {
    id: 'governance_solutions',
    name: 'Governance Solutions',
    status: 'implemented',
    description:
      'Post a civic Problem and Discuss or Solve. AI council can participate in discussion. Distinct from Community Challenge Solution Records.',
    routes: ['/governance/solutions'],
    roles: ['member'],
    relatedCapabilities: ['governance', 'solution_records'],
    aliases: ['solutions hub', 'problem council'],
    sourceRefs: ['src/pages/governance/SolutionsHub.tsx', 'docs/04-operations/dev/solutions-council.md'],
  },
  {
    id: 'governance_charter',
    name: 'Civizen Community Governance Charter',
    status: 'implemented',
    description:
      'Current public community governance instrument (interim). Not a government constitution. Replaces Civizen Constitution v0.1.',
    routes: ['/governance/charter'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['governance'],
    aliases: ['civizen constitution', 'constitution', 'charter'],
    sourceRefs: [
      'docs/02-policies/governance/civizen-community-governance-charter.md',
      'docs/01-governance/constitution/civizen-constitution-v0.1.md',
    ],
  },
  {
    id: 'areas',
    name: 'Areas',
    status: 'implemented',
    description:
      'Read-only public Areas V1: Health, Education, Culture, Responsibility, Environment. Shows where help is needed.',
    howTo: 'Open Areas from Contribute, Home > Governance, or the public footer.',
    routes: ['/areas'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['partnerships', 'contribute_hub'],
    aliases: ['foundational areas', 'where help is needed'],
    sourceRefs: [
      'src/lib/areas/public-areas.ts',
      'docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md',
    ],
  },
  {
    id: 'partnerships',
    name: 'Partnerships',
    status: 'implemented',
    description:
      'Public Partners notice for international partnerships and chapters. Institutional inquiries are under Contribute > Financial Support. Not a partner CRM.',
    routes: ['/partners', '/fund/institutional'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['areas', 'funding', 'agreements'],
    aliases: ['organization partnership', 'chapters', 'institutions'],
    sourceRefs: [
      'docs/02-policies/institutional/international-partnerships-and-chapters.md',
      'src/lib/contribute-lanes.ts',
    ],
  },
  {
    id: 'funding',
    name: 'Funding',
    status: 'implemented',
    description:
      'Public inquiry hub only. Does not process investments, issue securities, or create binding investment agreements. Current public policy is Funding and Financial Integrity.',
    routes: ['/fund', '/fund/support', '/fund/invest', '/fund/transparency'],
    roles: ['guest', 'member'],
    relatedCapabilities: ['partnerships', 'tokenomics_governance'],
    aliases: ['donate', 'invest', 'support civizen'],
    sourceRefs: ['docs/02-policies/institutional/funding-and-financial-integrity.md', 'src/pages/fund/FundHub.tsx'],
  },
  {
    id: 'prototype_credits',
    name: 'Prototype credits',
    status: 'experimental',
    description:
      'Luma is a non-transferable prototype credit for demonstration. Not money, not a wallet for settlement, no governance rights. Peer send is disabled.',
    routes: ['/settings/prototype-credits'],
    roles: ['member'],
    relatedCapabilities: ['market', 'tokenomics_governance'],
    aliases: ['luma', 'luma wallet', 'wallet', 'lumens'],
    sourceRefs: ['src/lib/prototype-credits.ts', 'src/lib/feature-registry.ts'],
  },
  {
    id: 'luma_transfers',
    name: 'Luma transfers',
    status: 'deprecated',
    description: 'Peer Luma transfer and marketplace Luma checkout are disabled. Do not describe Luma as a working currency.',
    routes: ['/settings/prototype-credits'],
    roles: ['member'],
    relatedCapabilities: ['prototype_credits'],
    aliases: ['peer send luma', 'luma checkout'],
    sourceRefs: ['src/lib/prototype-credits.ts', 'src/lib/luma-transfer.ts'],
  },
  {
    id: 'tokenomics_governance',
    name: 'Constitutional Tokenomics + Governance Model',
    status: 'historical',
    description:
      'Earlier planning document. Not adopted. Not current policy. Not an implemented monetary system. Current public funding policy is Funding and Financial Integrity.',
    routes: ['/documents', '/fund'],
    roles: ['guest'],
    relatedCapabilities: ['funding', 'governance_charter', 'prototype_credits'],
    aliases: [
      'civizen constitutional tokenomics + governance model',
      'tokenomics',
      'funding constitution',
      'luma tokenomics',
    ],
    sourceRefs: [
      'docs/01-governance/funding-and-monetary/civizen-constitutional-tokenomics-governance.md',
      'docs/02-policies/institutional/funding-and-financial-integrity.md',
    ],
  },
  {
    id: 'institutional_blueprint',
    name: 'Institutional Blueprint',
    status: 'proposed',
    description:
      'Working institutional architecture (legal entities, funding allocation principles, authority). Project reference, not a live in-app government and not adopted public policy.',
    routes: [],
    roles: ['guest'],
    relatedCapabilities: ['governance'],
    aliases: ['institutional architecture'],
    sourceRefs: ['docs/institutional/institutional-blueprint.md'],
  },
  {
    id: 'phase1_pilots',
    name: 'Phase 1 contribution pilots',
    status: 'implemented',
    description:
      'Three live pilots: Education-to-Contribution, Community Problem-Solving Lab, and Shared Knowledge / Learning Commons.',
    routes: ['/contribute/professional', '/contribute/challenges', '/contribute/knowledge'],
    roles: ['member'],
    relatedCapabilities: ['opportunities', 'community_challenges', 'knowledge_spaces'],
    aliases: ['pilots', 'phase 1'],
    sourceRefs: ['docs/04-operations/dev/phase-1-pilot-operating-model.md'],
  },
];

export const ASSISTANT_FAQ: AssistantFaqItem[] = [
  {
    id: 'what_is_civizen',
    question: 'What is Civizen?',
    answer: CANONICAL_CIVIZEN_IDENTITY,
    aliases: [
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
  {
    id: 'how_does_governance_work',
    question: 'How does governance work?',
    answer:
      'Civizen currently has a public Governance landing, civic voting/elections, a member proposal workspace, and Governance Solutions. Community participation is described by the Community Governance Charter. Civizen is not a government. Working institutional frameworks exist as project design, not as live public-law authority.',
    aliases: ['civizen governance'],
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
      'Eligible signed-in participants can submit proposals in Home > Governance workspace under the Community Governance Charter. Community Challenge proposals are a different flow inside a Challenge, selected by that challenge’s coordinator.',
    aliases: ['who can propose'],
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
      'Civic elections are at Home > Governance > Civic voting. Community votes follow published eligibility in the Charter and platform rules. Token ownership, financial support, or wealth alone does not create voting authority.',
    aliases: ['voting rights', 'who votes'],
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

export const ASSISTANT_ALIASES: TerminologyAlias[] = [
  { current: 'Opportunities', aliases: ['professional listings', 'open tasks', 'tasks'] },
  { current: 'Community Challenges', aliases: ['challenges', 'community problem-solving lab'] },
  { current: 'Learning Commons', aliases: ['shared knowledge', 'knowledge commons'] },
  { current: 'Prototype credits', aliases: ['luma', 'luma wallet', 'wallet'] },
  { current: 'Community Governance Charter', aliases: ['civizen constitution', 'constitution v0.1'] },
  { current: 'Agreements', aliases: ['contracts', 'collaboration agreement'] },
  { current: 'Happiness & Fulfillment', aliases: ['happiness score', 'wellbeing', 'mental health score'] },
  { current: 'Work Fulfillment', aliases: ['occupational fit', 'work joy'] },
  { current: 'Wellbeing Insights', aliases: ['group insights', 'organization happiness'] }, { current: 'Human Outcome Review', aliases: ['outcome review', 'happiness impact'] },
  { current: 'My Contributions', aliases: ['impact ledger'] },
  { current: 'Civizen', aliases: ['levela'] },
];
