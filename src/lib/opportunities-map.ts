import {
  COMPENSATION_STATUSES,
  EVALUATION_DECISIONS,
  EVALUATION_DIMENSIONS,
  isOpportunityKind,
  isOpportunityStatus,
  isParticipationStatus,
  isVerifiedCompletedParticipation,
  isVerificationStatus,
  sanitizeEvaluationDimensions,
  type CompensationStatus,
  type ContributionOpportunity,
  type EvaluationDecision,
  type EvaluationDimension,
  type OpportunityEvaluation,
  type OpportunityEvidence,
  type OpportunityKind,
  type OpportunityParticipation,
  type OpportunityPayload,
  type OpportunitySkillEvidence,
  type OpportunityWorkAssessment,
  type OpportunityWorkAssessmentScores,
} from '@/lib/opportunities';

export function demonstratedSkillsNotInDeclared(args: {
  demonstrated: readonly string[];
  declaredHard: readonly string[];
  declaredSoft: readonly string[];
}): { overlapping: string[]; additional: string[] } {
  const declared = new Set(
    [...args.declaredHard, ...args.declaredSoft].map((name) => name.trim().toLowerCase()).filter(Boolean),
  );
  const overlapping: string[] = [];
  const additional: string[] = [];
  const seen = new Set<string>();
  for (const raw of args.demonstrated) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (declared.has(key)) overlapping.push(name);
    else additional.push(name);
  }
  return { overlapping, additional };
}

export function opportunityCardSkills(
  opportunity: Pick<ContributionOpportunity, 'requiredSkills' | 'optionalSkills'>,
  limit = 3,
): string[] {
  const names = [...opportunity.requiredSkills, ...opportunity.optionalSkills]
    .map((name) => name.trim())
    .filter(Boolean);
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
    if (unique.length >= limit) break;
  }
  return unique;
}

export function toOpportunityPayloadJson(payload: OpportunityPayload): Record<string, unknown> {
  return {
    title: payload.title,
    summary: payload.summary,
    description: payload.description ?? null,
    status: payload.status ?? 'draft',
    opportunity_kind: payload.opportunityKind ?? 'education_to_contribution',
    area_node_id: payload.areaNodeId ?? null,
    required_skills: payload.requiredSkills ?? [],
    optional_skills: payload.optionalSkills ?? [],
    location_text: payload.locationText ?? null,
    is_remote: payload.isRemote ?? true,
    estimated_effort: payload.estimatedEffort ?? null,
    application_deadline: payload.applicationDeadline ?? null,
    work_starts_at: payload.workStartsAt ?? null,
    work_ends_at: payload.workEndsAt ?? null,
    compensation_status: payload.compensationStatus ?? 'learning',
    expected_outcome: payload.expectedOutcome ?? null,
    evidence_requirements: payload.evidenceRequirements ?? null,
    evaluation_criteria: payload.evaluationCriteria ?? null,
    evaluation_dimensions: sanitizeEvaluationDimensions(payload.evaluationDimensions ?? []),
  };
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringOrNull(value: unknown): string | null {
  const text = asString(value).trim();
  return text ? text : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function mapContributionOpportunity(row: Record<string, unknown>): ContributionOpportunity {
  const status = isOpportunityStatus(row.status) ? row.status : 'draft';
  const kind: OpportunityKind = isOpportunityKind(row.opportunity_kind)
    ? row.opportunity_kind
    : 'education_to_contribution';
  const compensation = COMPENSATION_STATUSES.includes(row.compensation_status as CompensationStatus)
    ? (row.compensation_status as CompensationStatus)
    : 'learning';
  return {
    id: asString(row.id),
    isDemo: row.is_demo === true,
    publisherProfileId: asString(row.publisher_profile_id),
    title: asString(row.title),
    summary: asString(row.summary),
    description: asStringOrNull(row.description),
    status,
    opportunityKind: kind,
    areaNodeId: asStringOrNull(row.area_node_id),
    requiredSkills: asStringArray(row.required_skills),
    optionalSkills: asStringArray(row.optional_skills),
    locationText: asStringOrNull(row.location_text),
    isRemote: asBoolean(row.is_remote, true),
    estimatedEffort: asStringOrNull(row.estimated_effort),
    applicationDeadline: asStringOrNull(row.application_deadline),
    workStartsAt: asStringOrNull(row.work_starts_at),
    workEndsAt: asStringOrNull(row.work_ends_at),
    compensationStatus: compensation,
    expectedOutcome: asStringOrNull(row.expected_outcome),
    evidenceRequirements: asStringOrNull(row.evidence_requirements),
    evaluationCriteria: asStringOrNull(row.evaluation_criteria),
    evaluationDimensions: sanitizeEvaluationDimensions(row.evaluation_dimensions),
    programId: asStringOrNull(row.program_id),
    knowledgeGapId: asStringOrNull(row.knowledge_gap_id),
    knowledgeSpaceId: asStringOrNull(row.knowledge_space_id),
    implementationProjectId: asStringOrNull(row.implementation_project_id),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapOpportunityParticipation(row: Record<string, unknown>): OpportunityParticipation {
  return {
    id: asString(row.id),
    opportunityId: asString(row.opportunity_id),
    participantProfileId: asString(row.participant_profile_id),
    status: isParticipationStatus(row.status) ? row.status : 'applied',
    verificationStatus: isVerificationStatus(row.verification_status)
      ? row.verification_status
      : 'not_submitted',
    applicationMessage: asStringOrNull(row.application_message),
    appliedAt: asString(row.applied_at),
    acceptedAt: asStringOrNull(row.accepted_at),
    acceptedBy: asStringOrNull(row.accepted_by),
    declinedAt: asStringOrNull(row.declined_at),
    declinedBy: asStringOrNull(row.declined_by),
    declineNote: asStringOrNull(row.decline_note),
    activatedAt: asStringOrNull(row.activated_at),
    submittedAt: asStringOrNull(row.submitted_at),
    completedAt: asStringOrNull(row.completed_at),
    completedBy: asStringOrNull(row.completed_by),
    withdrawnAt: asStringOrNull(row.withdrawn_at),
    cancelledAt: asStringOrNull(row.cancelled_at),
    cancelledBy: asStringOrNull(row.cancelled_by),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapOpportunityEvidence(row: Record<string, unknown>): OpportunityEvidence {
  return {
    id: asString(row.id),
    participationId: asString(row.participation_id),
    description: asString(row.description),
    referenceUrl: asStringOrNull(row.reference_url),
    referenceLabel: asStringOrNull(row.reference_label),
    createdBy: asString(row.created_by),
    createdAt: asString(row.created_at),
  };
}

export function mapOpportunityEvaluation(row: Record<string, unknown>): OpportunityEvaluation {
  const decision = EVALUATION_DECISIONS.includes(row.decision as EvaluationDecision)
    ? (row.decision as EvaluationDecision)
    : 'rejected';
  return {
    id: asString(row.id),
    participationId: asString(row.participation_id),
    evaluatorProfileId: asString(row.evaluator_profile_id),
    decision,
    feedback: asStringOrNull(row.feedback),
    qualityScore: asNumberOrNull(row.quality_score),
    impactScore: asNumberOrNull(row.impact_score),
    createdAt: asString(row.created_at),
  };
}

export function mapOpportunityWorkAssessment(row: Record<string, unknown>): OpportunityWorkAssessment {
  const scores: OpportunityWorkAssessmentScores = {};
  for (const dimension of EVALUATION_DIMENSIONS) {
    scores[dimension] = asNumberOrNull(row[`${dimension}_score`]);
  }
  return {
    id: asString(row.id),
    participationId: asString(row.participation_id),
    evaluatorProfileId: asString(row.evaluator_profile_id),
    notes: asStringOrNull(row.notes),
    scores,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function workAssessmentScoresPayload(
  scores: OpportunityWorkAssessmentScores,
  dimensions: readonly EvaluationDimension[],
): Record<string, number> {
  const enabled = new Set(sanitizeEvaluationDimensions(dimensions));
  const payload: Record<string, number> = {};
  for (const dimension of EVALUATION_DIMENSIONS) {
    if (!enabled.has(dimension)) continue;
    const value = scores[dimension];
    if (typeof value === 'number' && Number.isFinite(value)) {
      payload[dimension] = value;
    }
  }
  return payload;
}

export function mapOpportunitySkillEvidence(row: Record<string, unknown>): OpportunitySkillEvidence {
  return {
    id: asString(row.id),
    participationId: asString(row.participation_id),
    evaluationId: asStringOrNull(row.evaluation_id),
    skillName: asString(row.skill_name),
    createdAt: asString(row.created_at),
  };
}

export type OpportunityApplicantIdentity = {
  participationId: string;
  profileId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

export function mapOpportunityApplicantIdentity(row: Record<string, unknown>): OpportunityApplicantIdentity {
  const username = String(row.username ?? '').trim() || null;
  const displayName = String(row.display_name ?? '').trim() || username || 'Applicant';
  const avatarUrl = String(row.avatar_url ?? '').trim() || null;
  return {
    participationId: String(row.participation_id ?? ''),
    profileId: String(row.profile_id ?? ''),
    displayName,
    username,
    avatarUrl,
  };
}

export function parseOptionalEvaluationScore(
  raw: string,
): { ok: true; value: number | null } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || value > 100) return { ok: false };
  return { ok: true, value };
}

export type DemonstratedExperience = {
  participationId: string;
  opportunityId: string;
  title: string;
  summary: string;
  completedAt: string | null;
  skills: string[];
};

export function demonstratedExperienceFromVerified(args: {
  opportunity: Pick<ContributionOpportunity, 'id' | 'title' | 'summary'>;
  participation: OpportunityParticipation;
  skills?: readonly string[];
}): DemonstratedExperience | null {
  if (!isVerifiedCompletedParticipation(args.participation)) return null;
  return {
    participationId: args.participation.id,
    opportunityId: args.opportunity.id,
    title: args.opportunity.title,
    summary: args.opportunity.summary,
    completedAt: args.participation.completedAt,
    skills: [...(args.skills ?? [])],
  };
}
