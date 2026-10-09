/**
 * Community Problem-Solving Lab (Slice 3).
 * Challenges, proposals, and implementation projects sit on contribution_programs.
 * Work still uses opportunity_participations (Slice 1/2). Distinct from Governance Solutions.
 */

export const PROGRAM_KINDS = [
  'community_problem_solving',
  'shared_knowledge',
  'education_to_contribution',
] as const;
export type ProgramKind = (typeof PROGRAM_KINDS)[number];

export const PROGRAM_STATUSES = ['draft', 'active', 'completed', 'cancelled'] as const;
export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const CHALLENGE_STATUSES = [
  'draft',
  'active',
  'proposal_review',
  'implementation',
  'completed',
  'cancelled',
] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const PUBLIC_CHALLENGE_STAGES = [
  'draft',
  'active',
  'proposal_review',
  'implementation',
  'completed',
] as const;
export type PublicChallengeStage = (typeof PUBLIC_CHALLENGE_STAGES)[number];

export const PROPOSAL_STATUSES = ['submitted', 'selected', 'not_selected', 'withdrawn'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROJECT_STATUSES = ['planned', 'active', 'completed', 'cancelled'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

const PROGRAM_STATUS_SET = new Set<string>(PROGRAM_STATUSES);
const CHALLENGE_STATUS_SET = new Set<string>(CHALLENGE_STATUSES);
const PROPOSAL_STATUS_SET = new Set<string>(PROPOSAL_STATUSES);
const PROJECT_STATUS_SET = new Set<string>(PROJECT_STATUSES);

export type ContributionProgram = {
  id: string;
  isDemo?: boolean;
  publisherProfileId: string;
  title: string;
  summary: string;
  description: string | null;
  status: ProgramStatus;
  programKind: ProgramKind;
  areaNodeId: string | null;
  seedKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityChallenge = {
  id: string;
  isDemo?: boolean;
  programId: string;
  publisherProfileId: string;
  title: string;
  problemStatement: string;
  whyItMatters: string;
  affected: string | null;
  areaNodeId: string | null;
  scope: string | null;
  successCriteria: string;
  status: ChallengeStatus;
  evidenceLinks: string | null;
  constraints: string | null;
  resources: string | null;
  contextDetail: string | null;
  selectedProposalId: string | null;
  outcomeSummary: string | null;
  outcomeEvidence: string | null;
  successCriteriaResult: string | null;
  lessonsLearned: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChallengeProposal = {
  id: string;
  challengeId: string;
  authorProfileId: string;
  title: string;
  rationale: string;
  expectedResult: string;
  implementationApproach: string | null;
  resourcesNeeded: string | null;
  risks: string | null;
  supportingEvidence: string | null;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
};

export type ImplementationProject = {
  id: string;
  challengeId: string;
  proposalId: string;
  publisherProfileId: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  keySteps: string | null;
  outcomeEvidence: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SolutionRecord = {
  id: string;
  challengeId: string;
  projectId: string | null;
  programId: string;
  publisherProfileId: string;
  problemContext: string;
  implementedSolution: string;
  contributors: string | null;
  implementationSummary: string;
  outcome: string;
  evidence: string | null;
  lessonsLearned: string | null;
  reuseNotes: string | null;
  knowledgeResourceId: string | null;
  knowledgeSpaceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProgramPayload = {
  title: string;
  summary: string;
  description?: string | null;
  status?: 'draft' | 'active';
  areaNodeId?: string | null;
  programKind?: ProgramKind;
};

export type ChallengePayload = {
  programId: string;
  title: string;
  problemStatement: string;
  whyItMatters: string;
  successCriteria: string;
  affected?: string | null;
  areaNodeId?: string | null;
  scope?: string | null;
  evidenceLinks?: string | null;
  constraints?: string | null;
  resources?: string | null;
  contextDetail?: string | null;
  status?: 'draft' | 'active';
};

export type ProposalPayload = {
  title: string;
  rationale: string;
  expectedResult: string;
  implementationApproach?: string | null;
  resourcesNeeded?: string | null;
  risks?: string | null;
  supportingEvidence?: string | null;
};

export type ChallengeOutcomePayload = {
  outcomeSummary: string;
  outcomeEvidence?: string | null;
  successCriteriaResult?: string | null;
  lessonsLearned?: string | null;
};

export function isProgramStatus(value: unknown): value is ProgramStatus {
  return typeof value === 'string' && PROGRAM_STATUS_SET.has(value);
}

export function isChallengeStatus(value: unknown): value is ChallengeStatus {
  return typeof value === 'string' && CHALLENGE_STATUS_SET.has(value);
}

export function isProposalStatus(value: unknown): value is ProposalStatus {
  return typeof value === 'string' && PROPOSAL_STATUS_SET.has(value);
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && PROJECT_STATUS_SET.has(value);
}

export function publicChallengeStage(status: ChallengeStatus): PublicChallengeStage {
  if (status === 'cancelled') return 'draft';
  return status;
}

export function canTransitionChallengeStatus(from: ChallengeStatus, to: ChallengeStatus): boolean {
  if (from === to) return true;
  if (from === 'cancelled' || from === 'completed') return false;
  if (from === 'draft') return to === 'active' || to === 'cancelled';
  if (from === 'active') return to === 'proposal_review' || to === 'draft' || to === 'cancelled';
  if (from === 'proposal_review') return to === 'active' || to === 'implementation' || to === 'cancelled';
  if (from === 'implementation') return to === 'completed' || to === 'cancelled';
  return false;
}

export function canPublishChallenge(status: ChallengeStatus): boolean {
  return status === 'draft';
}

export function canSubmitProposal(args: {
  challenge: Pick<CommunityChallenge, 'status' | 'publisherProfileId'>;
  currentProfileId: string | null | undefined;
  ownedLinkedProfileIds?: readonly string[];
  existingProposal?: Pick<ChallengeProposal, 'id'> | null;
}): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (!args.currentProfileId) return { ok: false, reason: 'not_authenticated' };
  if (args.challenge.status !== 'active') return { ok: false, reason: 'challenge_not_open_for_proposals' };
  if (
    args.currentProfileId === args.challenge.publisherProfileId ||
    (args.ownedLinkedProfileIds ?? []).includes(args.challenge.publisherProfileId)
  ) {
    return { ok: false, reason: 'cannot_propose_to_own_challenge' };
  }
  if (args.existingProposal) return { ok: false, reason: 'already_proposed' };
  return { ok: true };
}

export function canSelectProposal(args: {
  challenge: Pick<CommunityChallenge, 'status'>;
  proposal: Pick<ChallengeProposal, 'status' | 'challengeId'>;
  challengeId: string;
}): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (args.proposal.challengeId !== args.challengeId) {
    return { ok: false, reason: 'proposal_not_on_challenge' };
  }
  if (args.challenge.status !== 'active' && args.challenge.status !== 'proposal_review') {
    return { ok: false, reason: 'challenge_not_in_selection' };
  }
  if (args.proposal.status !== 'submitted') return { ok: false, reason: 'proposal_not_selectable' };
  return { ok: true };
}

export function canCompleteChallenge(args: {
  challenge: Pick<CommunityChallenge, 'status' | 'selectedProposalId' | 'outcomeSummary'>;
  project?: Pick<ImplementationProject, 'id'> | null;
}): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (args.challenge.status !== 'implementation') {
    return { ok: false, reason: 'challenge_not_in_implementation' };
  }
  if (!args.challenge.selectedProposalId) return { ok: false, reason: 'proposal_not_selected' };
  if (!args.project) return { ok: false, reason: 'project_required' };
  if (!args.challenge.outcomeSummary?.trim()) return { ok: false, reason: 'outcome_required' };
  return { ok: true };
}

export function canCreateSolutionRecord(args: {
  challenge: Pick<CommunityChallenge, 'status'>;
  existing?: Pick<SolutionRecord, 'id'> | null;
}): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (args.challenge.status !== 'completed') return { ok: false, reason: 'challenge_not_completed' };
  if (args.existing) return { ok: false, reason: 'solution_record_exists' };
  return { ok: true };
}

export function participantChallengeAction(args: {
  challenge: Pick<CommunityChallenge, 'status' | 'publisherProfileId'>;
  currentProfileId: string | null | undefined;
  ownedLinkedProfileIds?: readonly string[];
  existingProposal?: Pick<ChallengeProposal, 'id'> | null;
}): 'propose' | 'view' | 'none' {
  if (
    args.currentProfileId &&
    (args.currentProfileId === args.challenge.publisherProfileId ||
      (args.ownedLinkedProfileIds ?? []).includes(args.challenge.publisherProfileId))
  ) {
    return 'none';
  }
  if (canSubmitProposal(args).ok) return 'propose';
  if (args.challenge.status === 'draft' || args.challenge.status === 'cancelled') return 'none';
  return 'view';
}

export type ChallengePrimaryAction = 'view' | 'propose' | 'join' | 'manage';

export function challengeCardAction(args: {
  challenge: Pick<CommunityChallenge, 'status' | 'publisherProfileId'>;
  currentProfileId: string | null | undefined;
  ownedLinkedProfileIds?: readonly string[];
}): ChallengePrimaryAction {
  if (
    args.currentProfileId &&
    (args.currentProfileId === args.challenge.publisherProfileId ||
      (args.ownedLinkedProfileIds ?? []).includes(args.challenge.publisherProfileId))
  ) {
    return 'manage';
  }
  if (args.challenge.status === 'active') return 'propose';
  if (args.challenge.status === 'implementation') return 'join';
  return 'view';
}
