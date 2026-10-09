import {
  isChallengeStatus,
  isProgramStatus,
  isProjectStatus,
  isProposalStatus,
  type ChallengePayload,
  type ChallengeProposal,
  type CommunityChallenge,
  type ContributionProgram,
  type ImplementationProject,
  type ProgramKind,
  type ProgramPayload,
  type ProposalPayload,
  type SolutionRecord,
} from '@/lib/challenges';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringOrNull(value: unknown): string | null {
  const text = asString(value).trim();
  return text ? text : null;
}

export function mapContributionProgram(row: Record<string, unknown>): ContributionProgram {
  const kind: ProgramKind =
    row.program_kind === 'shared_knowledge' || row.program_kind === 'education_to_contribution'
      ? row.program_kind
      : 'community_problem_solving';
  return {
    id: asString(row.id),
    isDemo: row.is_demo === true,
    publisherProfileId: asString(row.publisher_profile_id),
    title: asString(row.title),
    summary: asString(row.summary),
    description: asStringOrNull(row.description),
    status: isProgramStatus(row.status) ? row.status : 'draft',
    programKind: kind,
    areaNodeId: asStringOrNull(row.area_node_id),
    seedKey: asStringOrNull(row.seed_key),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapCommunityChallenge(row: Record<string, unknown>): CommunityChallenge {
  return {
    id: asString(row.id),
    isDemo: row.is_demo === true,
    programId: asString(row.program_id),
    publisherProfileId: asString(row.publisher_profile_id),
    title: asString(row.title),
    problemStatement: asString(row.problem_statement),
    whyItMatters: asString(row.why_it_matters),
    affected: asStringOrNull(row.affected),
    areaNodeId: asStringOrNull(row.area_node_id),
    scope: asStringOrNull(row.scope_text),
    successCriteria: asString(row.success_criteria),
    status: isChallengeStatus(row.status) ? row.status : 'draft',
    evidenceLinks: asStringOrNull(row.evidence_links),
    constraints: asStringOrNull(row.constraints),
    resources: asStringOrNull(row.resources),
    contextDetail: asStringOrNull(row.context_detail),
    selectedProposalId: asStringOrNull(row.selected_proposal_id),
    outcomeSummary: asStringOrNull(row.outcome_summary),
    outcomeEvidence: asStringOrNull(row.outcome_evidence),
    successCriteriaResult: asStringOrNull(row.success_criteria_result),
    lessonsLearned: asStringOrNull(row.lessons_learned),
    completedAt: asStringOrNull(row.completed_at),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapChallengeProposal(row: Record<string, unknown>): ChallengeProposal {
  return {
    id: asString(row.id),
    challengeId: asString(row.challenge_id),
    authorProfileId: asString(row.author_profile_id),
    title: asString(row.title),
    rationale: asString(row.rationale),
    expectedResult: asString(row.expected_result),
    implementationApproach: asStringOrNull(row.implementation_approach),
    resourcesNeeded: asStringOrNull(row.resources_needed),
    risks: asStringOrNull(row.risks),
    supportingEvidence: asStringOrNull(row.supporting_evidence),
    status: isProposalStatus(row.status) ? row.status : 'submitted',
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapImplementationProject(row: Record<string, unknown>): ImplementationProject {
  return {
    id: asString(row.id),
    challengeId: asString(row.challenge_id),
    proposalId: asString(row.proposal_id),
    publisherProfileId: asString(row.publisher_profile_id),
    title: asString(row.title),
    summary: asString(row.summary),
    status: isProjectStatus(row.status) ? row.status : 'planned',
    keySteps: asStringOrNull(row.key_steps),
    outcomeEvidence: asStringOrNull(row.outcome_evidence),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapSolutionRecord(row: Record<string, unknown>): SolutionRecord {
  return {
    id: asString(row.id),
    challengeId: asString(row.challenge_id),
    projectId: asStringOrNull(row.project_id),
    programId: asString(row.program_id),
    publisherProfileId: asString(row.publisher_profile_id),
    problemContext: asString(row.problem_context),
    implementedSolution: asString(row.implemented_solution),
    contributors: asStringOrNull(row.contributors),
    implementationSummary: asString(row.implementation_summary),
    outcome: asString(row.outcome),
    evidence: asStringOrNull(row.evidence),
    lessonsLearned: asStringOrNull(row.lessons_learned),
    reuseNotes: asStringOrNull(row.reuse_notes),
    knowledgeResourceId: asStringOrNull(row.knowledge_resource_id),
    knowledgeSpaceId: asStringOrNull(row.knowledge_space_id),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export type ChallengeProposalIdentity = {
  proposalId: string;
  profileId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

export function mapChallengeProposalIdentity(row: Record<string, unknown>): ChallengeProposalIdentity {
  const username = String(row.username ?? '').trim() || null;
  const displayName = String(row.display_name ?? '').trim() || username || 'Participant';
  return {
    proposalId: String(row.proposal_id ?? ''),
    profileId: String(row.profile_id ?? ''),
    displayName,
    username,
    avatarUrl: String(row.avatar_url ?? '').trim() || null,
  };
}

export function toProgramPayloadJson(payload: ProgramPayload): Record<string, unknown> {
  return {
    title: payload.title,
    summary: payload.summary,
    description: payload.description ?? null,
    status: payload.status ?? 'draft',
    area_node_id: payload.areaNodeId ?? null,
    program_kind: payload.programKind ?? 'community_problem_solving',
  };
}

export function toChallengePayloadJson(payload: ChallengePayload): Record<string, unknown> {
  return {
    program_id: payload.programId,
    title: payload.title,
    problem_statement: payload.problemStatement,
    why_it_matters: payload.whyItMatters,
    success_criteria: payload.successCriteria,
    affected: payload.affected ?? null,
    area_node_id: payload.areaNodeId ?? null,
    scope_text: payload.scope ?? null,
    evidence_links: payload.evidenceLinks ?? null,
    constraints: payload.constraints ?? null,
    resources: payload.resources ?? null,
    context_detail: payload.contextDetail ?? null,
    status: payload.status ?? 'draft',
  };
}

export function toProposalPayloadJson(payload: ProposalPayload): Record<string, unknown> {
  return {
    title: payload.title,
    rationale: payload.rationale,
    expected_result: payload.expectedResult,
    implementation_approach: payload.implementationApproach ?? null,
    resources_needed: payload.resourcesNeeded ?? null,
    risks: payload.risks ?? null,
    supporting_evidence: payload.supportingEvidence ?? null,
  };
}
