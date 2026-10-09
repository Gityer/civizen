import type { AssistantFaqItem } from '../types';
import { VOTING_FAQ_HY } from './faq-voting.hy';
import { VOTING_FAQ_RU } from './faq-voting.ru';

const VOTING_SOURCES = [
  'src/lib/civic-voting/voting-proposals.ts',
  'src/lib/civic-voting/outcome.ts',
  'src/pages/governance/civic-voting-election/CivicVotingConsultationVote.tsx',
  'supabase/migrations/20261006060000_consultation_ballot_integrity.sql',
  'supabase/migrations/20261006080000_consultation_options_and_outcome.sql',
];

function localized(id: string) {
  return { hy: VOTING_FAQ_HY[id], ru: VOTING_FAQ_RU[id] };
}

/** Civic voting, member proposals, notifications, and the member Governance page. */
export const ASSISTANT_FAQ_VOTING: AssistantFaqItem[] = [
  {
    id: 'where_are_public_matters',
    question: 'Where are the public Matters?',
    answer:
      'Open Contribute > Questions, Issues & Ideas: the page lands on Public Matters, the browsable list of every public Matter. Search by words, and filter by Area, country and type (question, issue, suggestion, request, discussion). Your own queues (Needs your action, My Matters, Participating, Organization) are the other tabs. A Matter becomes public when its author chooses Public, or automatically when a consultation is published from it.',
    localizedAnswers: localized('where_are_public_matters'),
    aliases: ['public matters', 'browse matters', 'find a matter', 'search matters', 'list of matters', 'see what others raised'],
    capabilityIds: ['matters', 'civic_voting'],
    sourceRefs: ['src/pages/contribute/Matters.tsx', 'supabase/migrations/20261009130000_public_matters_browse.sql'],
  },
  {
    id: 'how_do_i_raise_a_matter_for_the_community',
    question: 'How do I raise a Matter for the whole community?',
    answer:
      'Open Contribute > Questions, Issues & Ideas and tap the + button. Write a title and description, choose the type, and under Recipient tap Address it to the Civizen community: the official Civizen organization receives it on behalf of everyone, so you do not have to name a person. Set the geographic scope (Global, Country, Region or City) and the Area, choose Public visibility if you want everyone to find it, and submit. From the Matter you can later Create voting proposal; publishing that proposal makes the Matter public and, when voting closes, the outcome returns to the Matter.',
    localizedAnswers: localized('how_do_i_raise_a_matter_for_the_community'),
    aliases: ['raise a matter', 'raise an issue for everyone', 'address the community', 'matter without a person', 'suggest something to the community', 'propose to the community'],
    capabilityIds: ['matters', 'civic_voting'],
    sourceRefs: ['src/pages/contribute/MatterForm.tsx', 'supabase/migrations/20261009140000_consultation_outcome_to_matter.sql'],
  },
  {
    id: 'how_do_i_vote',
    question: 'How do I vote?',
    answer:
      'Open Home > Governance > Civic voting (or the Open votes card on Study, or the Votes tab on your Governance page) and open the consultation. Sign in if you have not, choose an option — Support, Oppose, or Abstain, or the options that consultation lists — and confirm. The page then shows Your receipt: keep that code.\n\nOrdinary consultations need only a free account, but only ballots from members with a verified identity are counted; a ballot from an unverified member is recorded as advisory, shown separately in the public split, and counted automatically once their verification is approved while voting is open (Settings > Edit Profile > Identity verification). Until voting closes you can withdraw your ballot and vote again. Your choice is sealed; only totals are public.',
    localizedAnswers: localized('how_do_i_vote'),
    aliases: ['how to vote', 'how do I cast a ballot', 'how do I vote on a consultation', 'where do I vote', 'cast my vote'],
    capabilityIds: ['civic_voting', 'governance'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'how_do_i_know_my_vote_was_counted',
    question: 'How do I know my vote was counted?',
    answer:
      'After you vote, the ballot page shows Your receipt — a code in groups of four characters. Tap Check that my receipt is counted: Civizen compares it with the public list of counted receipts for that consultation and tells you whether it is on the list.\n\nThe receipt proves your ballot is counted without revealing your choice, and anyone with the code can run the same check. If you withdraw your ballot, the receipt leaves the list; voting again gives you a new one.',
    localizedAnswers: localized('how_do_i_know_my_vote_was_counted'),
    aliases: ['was my vote counted', 'is my vote counted', 'was my ballot counted', 'verify my vote', 'check my receipt', 'where do I check my receipt', 'receipt check'],
    capabilityIds: ['civic_voting'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'what_is_a_voting_receipt',
    question: 'What is a receipt?',
    answer:
      'A receipt is the random code Civizen gives you when you cast a ballot in a consultation, shown as Your receipt on the ballot page in groups of four characters. It proves your ballot is counted without revealing how you voted.\n\nKeep the code. Tap Check that my receipt is counted on the ballot page to compare it with the public list of counted receipts. Withdrawing your ballot removes the receipt from that list.',
    localizedAnswers: localized('what_is_a_voting_receipt'),
    aliases: ['voting receipt', 'ballot receipt', 'receipt code', 'what is the receipt for', 'vote receipt'],
    capabilityIds: ['civic_voting'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'why_cant_i_vote',
    question: "Why can't I vote?",
    answer:
      'Open the consultation page: when you cannot vote, the reason is shown under the voting buttons. The usual reasons are: you are not signed in; voting has not opened yet or has already closed; a governance sanction blocks voting; the vote needs a verified identity (Settings > Edit Profile > Identity verification); the vote has a minimum age and your profile has no date of birth, or you are under that age; the vote is limited to residents of one country and your profile shows another; it is a sample election; or it is a high-security election that takes ballots only in the native app.\n\nThese checks run on the server, so the same rule applies to everyone. Ordinary consultations need only a free account, but only ballots from members with a verified identity are counted; a ballot from an unverified member is recorded as advisory, shown separately in the public split, and counted automatically once their verification is approved while voting is open (Settings > Edit Profile > Identity verification).',
    localizedAnswers: localized('why_cant_i_vote'),
    aliases: ['why cannot I vote', 'I cannot vote', 'voting buttons are disabled', 'not eligible to vote', 'why am I not eligible', 'eligibility reason'],
    capabilityIds: ['civic_voting', 'profile'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'do_i_need_verification_to_vote',
    question: 'Do I need to be verified to vote?',
    answer:
      'You can vote with a free Civizen account, but only ballots from verified members are counted. Until your identity is verified your ballot is recorded as advisory: you see your choice and receipt, it appears in the public split as advisory, and it is counted automatically when your verification is approved while voting is still open. Identity verification is at Settings > Edit Profile. A consultation may additionally require a minimum age or residence in one country; the ballot page shows the reason when you cannot vote.',
    localizedAnswers: localized('do_i_need_verification_to_vote'),
    aliases: ['verified to vote', 'identity verification for voting', 'do I need verification to vote'],
    capabilityIds: ['civic_voting', 'profile'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'can_i_vote_without_account',
    question: 'Can I vote without an account?',
    answer:
      'No. Anyone can browse consultations and results at Home > Governance > Civic voting without signing in, but casting a ballot needs a Civizen account. Create one from Sign up, then open the consultation and vote.',
    localizedAnswers: localized('can_i_vote_without_account'),
    aliases: ['vote without signing up', 'vote as a guest', 'vote without registering'],
    capabilityIds: ['civic_voting'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'can_i_change_my_vote',
    question: 'Can I change my vote?',
    answer:
      'Yes, while voting is open. Open the consultation page and tap Withdraw ballot, then vote again. Withdrawing removes your ballot from the counts, the country statistics, and the participant directory, and your receipt leaves the list of counted receipts; a new ballot gives you a new receipt.\n\nAfter the consultation closes nothing can be changed.',
    localizedAnswers: localized('can_i_change_my_vote'),
    aliases: ['change my vote', 'can I withdraw my ballot', 'withdraw my vote', 'undo my vote', 'vote again', 'revote'],
    capabilityIds: ['civic_voting'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'who_can_see_how_i_voted',
    question: 'Who can see how I voted?',
    answer:
      'No one. Your choice is sealed on the server with a key that no app role can read, so founders, admins, and staff see only totals. Public pages show the count per option, country statistics only when enough people took part (at least 25 overall and 5 per country), and an optional participant directory with display name and country that you join only by choice — never your choice. Your receipt is a random code that is not linked to an option, and the audit log stores no voter identities.',
    localizedAnswers: localized('who_can_see_how_i_voted'),
    aliases: ['is my vote secret', 'is my ballot anonymous', 'can admins see my vote', 'who sees my vote', 'is voting anonymous', 'sealed ballot'],
    capabilityIds: ['civic_voting'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'what_happens_when_a_vote_closes',
    question: 'What happens when a vote closes?',
    answer:
      'At its closing time the consultation closes by itself: Civizen marks it closed, stores the final tally, and publishes the result on the ballot page and under Results on the Votes tab of your Governance page. The proposal behind it is closed too, and everyone who voted or supported it gets a notification.\n\nThe outcome follows the rules set on the proposal: no countable ballots; quorum not met (fewer ballots than required); otherwise the share of Support among Support and Oppose ballots is compared with the pass threshold (50% unless set otherwise) and shown as Passed or Not passed. Consultations with their own options show the most chosen option.\n\nThe outcome also returns to the Matter the consultation came from: a system event and a Decision record it there, and the Matter\u2019s responsible party receives an outcome follow-up action to say what happens next.',
    localizedAnswers: localized('what_happens_when_a_vote_closes'),
    aliases: ['when voting closes', 'how is the result decided', 'how is the result of a consultation decided', 'who counts the ballots', 'does civizen count ballots automatically', 'when is the result published', 'final tally'],
    capabilityIds: ['civic_voting', 'governance'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'what_are_quorum_and_pass_threshold',
    question: 'What is quorum?',
    answer:
      'Quorum is the minimum number of countable ballots a consultation needs for a result; below it the outcome reads Quorum not met. The pass threshold is the share of Support among Support and Oppose ballots (Abstain does not count) needed for Passed — 50% unless the proposal sets another value.\n\nThe author sets both when drafting the proposal, under Scope and timing on the proposal page. The outcome is computed automatically when voting closes and shown on the ballot page.',
    localizedAnswers: localized('what_are_quorum_and_pass_threshold'),
    aliases: ['what is the pass threshold', 'quorum and threshold', 'what is a quorum', 'how many votes are needed to pass'],
    capabilityIds: ['civic_voting'],
    sourceRefs: VOTING_SOURCES,
  },
  {
    id: 'is_voting_binding',
    question: 'Is voting binding?',
    answer:
      'Current civic consultations are nonbinding: they record what members think and publish the result, but they do not create legal citizenship, replace public-law elections, or bind anyone. Under the Community Governance Charter a vote can be binding only within a scope that has been delegated to it.',
    localizedAnswers: localized('is_voting_binding'),
    aliases: ['are votes binding', 'is the consultation binding', 'nonbinding consultation'],
    capabilityIds: ['civic_voting', 'governance_charter'],
    sourceRefs: ['docs/02-policies/governance/civizen-community-governance-charter.md', 'docs/assistant/civizen-assistant-cheatsheet.md'],
  },
  {
    id: 'how_do_i_submit_a_proposal',
    question: 'How do I submit a proposal?',
    answer:
      'A consultation starts as a Matter. Open Contribute > Questions, Issues & Ideas, open or create your Matter, and choose Create voting proposal. On the proposal page set the scope (global or one country), when voting opens and closes, the ballot options (Support / Oppose / Abstain, or 2 to 12 of your own), and optionally a quorum and pass threshold. Then tap Open for support and set how many supporters are needed.\n\nOther members add their support on the proposal page; your own support does not count toward the threshold. Once the threshold is reached and your identity is verified you can publish the ballot yourself; founders and admins can publish at any time. Your drafts, open proposals, and published ones are listed on the Proposals tab of your Governance page.',
    localizedAnswers: localized('how_do_i_submit_a_proposal'),
    aliases: ['how do I create a proposal', 'how do I create a consultation', 'how do I start a vote', 'propose a vote', 'start a consultation', 'create voting proposal', 'when can I publish my proposal'],
    capabilityIds: ['governance', 'matters'],
    sourceRefs: ['src/lib/civic-voting/voting-proposals.ts', 'supabase/migrations/20261006070000_voting_proposals_member_support.sql'],
  },
  {
    id: 'how_does_proposal_support_work',
    question: 'How does member support for a proposal work?',
    answer:
      'The author opens a draft for member support and sets the number of supporters needed. Any other signed-in member can then tap Support this proposal on the proposal page, or Withdraw my support later; support from the author never counts. The page shows the progress, for example 3 of 10 supporters, and Threshold reached when the goal is met. From that moment the author can publish the ballot if their identity is verified; founders and admins can publish at any time.\n\nDrafts open for support are listed on the Proposals tab of your Governance page.',
    localizedAnswers: localized('how_does_proposal_support_work'),
    aliases: ['support a proposal', 'support threshold', 'how do I support a proposal', 'open for support', 'supporters needed'],
    capabilityIds: ['governance'],
    sourceRefs: ['src/pages/governance/civic-voting-proposal/ProposalSupportCard.tsx', 'supabase/migrations/20261006070000_voting_proposals_member_support.sql'],
  },
  {
    id: 'can_a_proposal_have_custom_options',
    question: 'Can a proposal have custom options?',
    answer:
      'Yes. When drafting a proposal, the author can keep the default Support / Oppose / Abstain or list 2 to 12 options of their own under Ballot options. Publishing creates one choice per option. When Support and Oppose are among the options the pass rule applies; otherwise the result shows the most chosen option.\n\nA draft with its own options can also use approval voting (How members vote > Approval: choose several): each voter picks several options up to the maximum the author sets, and the result names the most approved option without a Passed / Not passed verdict. It can also use ranked voting (How members vote > Ranked: order of preference): each voter taps the options in order of preference, the public counts show first preferences, and the winner is found by instant run-off, where the option with the fewest first preferences is dropped round by round until one has a majority.',
    localizedAnswers: localized('can_a_proposal_have_custom_options'),
    aliases: ['custom ballot options', 'more than three options', 'multiple choice vote', 'ballot options', 'approval voting', 'can I pick several options', 'choose several options', 'ranked voting', 'ranked choice', 'instant run-off', 'order of preference', 'can I rank the options'],
    capabilityIds: ['governance', 'civic_voting'],
    sourceRefs: ['src/pages/governance/civic-voting-proposal/proposal-options.ts', 'supabase/migrations/20261006080000_consultation_options_and_outcome.sql'],
  },
  {
    id: 'where_are_my_notifications',
    question: 'Where are my notifications?',
    answer:
      'Tap the bell at the top of the app, or open Settings > Notifications. The bell shows how many are unread, and the Notifications page lists consultations you follow (published, result published), Matters, agreements, and posts that concern you. Tapping an item opens the related page.\n\nYou are notified when a proposal you supported or started is published and when the result of a consultation you voted in is published.',
    localizedAnswers: localized('where_are_my_notifications'),
    aliases: ['notifications', 'what is the bell icon', 'bell icon', 'notification center', 'how do I get notified when a vote result is published', 'unread notifications'],
    capabilityIds: ['notifications', 'governance'],
    sourceRefs: ['src/pages/Notifications.tsx', 'src/components/layout/NotificationBell.tsx', 'src/lib/notifications.ts'],
  },
  {
    id: 'where_is_help_and_support',
    question: 'Where is help and support?',
    answer:
      'Open Settings > Help and support. It links to Ask Civi (Messaging), the public Documents, Why Civizen Exists, the legal status notice, and the Terms.',
    localizedAnswers: localized('where_is_help_and_support'),
    aliases: ['help page', 'help and support', 'where do I get help', 'support page', 'where is the help page'],
    capabilityIds: ['help_support', 'nela'],
    sourceRefs: ['src/pages/settings/HelpSupport.tsx', 'src/pages/settings/help-support-links.ts'],
  },
  {
    id: 'where_is_the_governance_page',
    question: 'Where is the Governance page?',
    answer:
      'Open Home > Governance while signed in (the address is /governance) or Settings > Governance. The page has five tabs: Open votes (open consultations with your ballot status, and scheduled ones), My votes (consultations you voted in), Proposals (drafts open for support, your drafts, published and closed proposals), Results (closed consultations with the final count and outcome), and Tools (steward console and workspace tools). Tools appears only for office holders, founders, admins, and members who can assign roles. Signed-out visitors see the public Governance landing at the same address.',
    localizedAnswers: localized('where_is_the_governance_page'),
    aliases: ['governance page', 'member governance page', 'governance workspace', 'votes proposals and tools tabs', 'what are the votes proposals and tools tabs', 'who can see the tools tab', 'tools tab'],
    capabilityIds: ['governance'],
    sourceRefs: ['src/pages/governance/GovernanceMember.tsx', 'src/components/governance/member/governance-member-model.ts'],
  },
  {
    id: 'what_is_the_observer_console',
    question: 'What is the Observer console?',
    answer:
      'Open a consultation at Home > Governance > Civic voting and tap Observe next to its title, or add /observe to its address. The Observer console shows live process metrics for that election: countable ballots, withdrawn ballots, and the number of audit events in the hash-chained log — no voter identities and no ballot choices. When a consultation has no eligibility roster it says so instead of showing turnout, and sample elections are marked as not counted anywhere.',
    localizedAnswers: localized('what_is_the_observer_console'),
    aliases: ['observer console', 'observe an election', 'election observer', 'observer metrics'],
    capabilityIds: ['civic_voting'],
    sourceRefs: ['src/pages/governance/CivicVotingObserver.tsx', 'supabase/migrations/20261006050000_civic_election_observer_metrics.sql'],
  },
  {
    id: 'where_are_open_votes_in_study',
    question: 'Where can I see open votes in Study?',
    answer:
      'Open Study: the Open votes card lists the consultations that are open right now with their closing dates. Tap one to open its ballot page. When nothing is open the card says so.',
    localizedAnswers: localized('where_are_open_votes_in_study'),
    aliases: ['open votes card', 'open votes in study', 'pending votes in study', 'which votes are open'],
    capabilityIds: ['study', 'civic_voting'],
    sourceRefs: ['src/components/study/StudyOpenVotesCard.tsx'],
  },
];
