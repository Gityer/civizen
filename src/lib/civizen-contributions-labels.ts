import type { ContributionEventType } from '@/lib/civizen-contributions';

export const CONTRIBUTION_EVENT_TYPE_LABELS: Record<ContributionEventType, string> = {
  law_contribution: 'Law library',
  funding_record: 'Verified work',
  solution_problem: 'Solution problem',
  solution_comment: 'Solution discuss',
  solution_endorsement: 'Solution endorsement',
  governance_proposal: 'Governance proposal',
  governance_vote: 'Governance vote',
  development_story: 'Platform improvement',
  post: 'Post',
  post_comment: 'Comment',
  content_item: 'Content',
  opportunity_participation: 'Verified contribution',
  matter_raised: 'Matter raised',
  knowledge_resource: 'Knowledge resource',
};
