/**
 * Shared Knowledge / Learning Commons (Slice 4).
 * Knowledge Spaces hold Resources and Gaps. Work still uses Opportunities and Challenges.
 * Distinct from Study, content_items, and Governance Solutions.
 */

export const KNOWLEDGE_SPACE_STATUSES = ['draft', 'shared', 'archived'] as const;
export type KnowledgeSpaceStatus = (typeof KNOWLEDGE_SPACE_STATUSES)[number];

export const KNOWLEDGE_RESOURCE_TYPES = [
  'guide',
  'research',
  'course',
  'case_study',
  'framework',
  'dataset',
  'tool',
  'solution_record',
  'other',
] as const;
export type KnowledgeResourceType = (typeof KNOWLEDGE_RESOURCE_TYPES)[number];

export const KNOWLEDGE_RESOURCE_STATUSES = ['draft', 'shared', 'reviewed'] as const;
export type KnowledgeResourceStatus = (typeof KNOWLEDGE_RESOURCE_STATUSES)[number];

export const KNOWLEDGE_GAP_KINDS = [
  'missing',
  'weak',
  'outdated',
  'unresolved',
  'contradictory',
  'needs_development',
] as const;
export type KnowledgeGapKind = (typeof KNOWLEDGE_GAP_KINDS)[number];

export const KNOWLEDGE_GAP_STATUSES = ['open', 'in_progress', 'resolved', 'partially_resolved'] as const;
export type KnowledgeGapStatus = (typeof KNOWLEDGE_GAP_STATUSES)[number];

export const KNOWLEDGE_ATTRIBUTION_KINDS = ['person', 'organization'] as const;
export type KnowledgeAttributionKind = (typeof KNOWLEDGE_ATTRIBUTION_KINDS)[number];

const SPACE_STATUS_SET = new Set<string>(KNOWLEDGE_SPACE_STATUSES);
const RESOURCE_TYPE_SET = new Set<string>(KNOWLEDGE_RESOURCE_TYPES);
const RESOURCE_STATUS_SET = new Set<string>(KNOWLEDGE_RESOURCE_STATUSES);
const GAP_KIND_SET = new Set<string>(KNOWLEDGE_GAP_KINDS);
const GAP_STATUS_SET = new Set<string>(KNOWLEDGE_GAP_STATUSES);
const ATTRIBUTION_KIND_SET = new Set<string>(KNOWLEDGE_ATTRIBUTION_KINDS);

export type KnowledgeSpace = {
  id: string;
  isDemo?: boolean;
  publisherProfileId: string;
  programId: string;
  title: string;
  summary: string;
  description: string | null;
  areaNodeId: string | null;
  status: KnowledgeSpaceStatus;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeResource = {
  id: string;
  spaceId: string;
  publisherProfileId: string;
  programId: string;
  title: string;
  summary: string;
  resourceType: KnowledgeResourceType;
  bodyText: string | null;
  externalUrl: string | null;
  relatedSkills: string[];
  status: KnowledgeResourceStatus;
  reviewerNotes: string | null;
  sourceEvidence: string | null;
  uncertaintyNotes: string | null;
  challengeId: string | null;
  opportunityId: string | null;
  solutionRecordId: string | null;
  pathwayOrder: number | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeAttribution = {
  id: string;
  resourceId: string;
  attributionKind: KnowledgeAttributionKind;
  profileId: string | null;
  organizationName: string | null;
};

export type KnowledgeAttributionIdentity = KnowledgeAttribution & {
  displayName: string;
};

export type KnowledgeGap = {
  id: string;
  spaceId: string;
  publisherProfileId: string;
  programId: string;
  title: string;
  description: string;
  gapKind: KnowledgeGapKind;
  status: KnowledgeGapStatus;
  opportunityId: string | null;
  challengeId: string | null;
  resultResourceId: string | null;
  resultSolutionRecordId: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSpacePayload = {
  programId: string;
  title: string;
  summary: string;
  description?: string | null;
  areaNodeId?: string | null;
  status?: 'draft' | 'shared';
};

export type KnowledgeAttributionPayload = {
  attributionKind: KnowledgeAttributionKind;
  profileId?: string | null;
  organizationName?: string | null;
};

export type KnowledgeResourcePayload = {
  spaceId: string;
  title: string;
  summary: string;
  resourceType: KnowledgeResourceType;
  bodyText?: string | null;
  externalUrl?: string | null;
  relatedSkills?: string[];
  status?: 'draft' | 'shared' | 'reviewed';
  reviewerNotes?: string | null;
  sourceEvidence?: string | null;
  uncertaintyNotes?: string | null;
  challengeId?: string | null;
  opportunityId?: string | null;
  solutionRecordId?: string | null;
  pathwayOrder?: number | null;
  attributions?: KnowledgeAttributionPayload[];
};

export type KnowledgeGapPayload = {
  spaceId: string;
  title: string;
  description: string;
  gapKind?: KnowledgeGapKind;
};

export type GapOpportunityPayload = {
  title: string;
  summary: string;
  estimatedEffort?: string | null;
};

export type GapChallengePayload = {
  title: string;
  problemStatement: string;
  whyItMatters: string;
  successCriteria: string;
};

export type GapResolutionPayload = {
  status: 'resolved' | 'partially_resolved';
  resultResourceId?: string | null;
  resultSolutionRecordId?: string | null;
  resolutionNotes?: string | null;
};

export function isKnowledgeSpaceStatus(value: unknown): value is KnowledgeSpaceStatus {
  return typeof value === 'string' && SPACE_STATUS_SET.has(value);
}

export function isKnowledgeResourceType(value: unknown): value is KnowledgeResourceType {
  return typeof value === 'string' && RESOURCE_TYPE_SET.has(value);
}

export function isKnowledgeResourceStatus(value: unknown): value is KnowledgeResourceStatus {
  return typeof value === 'string' && RESOURCE_STATUS_SET.has(value);
}

export function isKnowledgeGapKind(value: unknown): value is KnowledgeGapKind {
  return typeof value === 'string' && GAP_KIND_SET.has(value);
}

export function isKnowledgeGapStatus(value: unknown): value is KnowledgeGapStatus {
  return typeof value === 'string' && GAP_STATUS_SET.has(value);
}

export function isKnowledgeAttributionKind(value: unknown): value is KnowledgeAttributionKind {
  return typeof value === 'string' && ATTRIBUTION_KIND_SET.has(value);
}

export function publicSpaceStage(status: KnowledgeSpaceStatus): 'draft' | 'shared' {
  return status === 'archived' ? 'draft' : status;
}

export function canCreateKnowledgeSpace(currentProfileId: string | null | undefined): boolean {
  return Boolean(currentProfileId);
}

export function canManageKnowledgeSpace(args: {
  space: Pick<KnowledgeSpace, 'publisherProfileId'>;
  currentProfileId: string | null | undefined;
  ownedLinkedProfileIds?: readonly string[];
}): boolean {
  const current = args.currentProfileId?.trim();
  if (!current) return false;
  if (current === args.space.publisherProfileId) return true;
  return (args.ownedLinkedProfileIds ?? []).includes(args.space.publisherProfileId);
}

export function canConvertGapToOpportunity(args: {
  gap: Pick<KnowledgeGap, 'status' | 'opportunityId'>;
}): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (args.gap.opportunityId) return { ok: false, reason: 'gap_already_has_opportunity' };
  if (args.gap.status === 'resolved') return { ok: false, reason: 'gap_already_resolved' };
  return { ok: true };
}

export function canConvertGapToChallenge(args: {
  gap: Pick<KnowledgeGap, 'status' | 'challengeId'>;
}): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (args.gap.challengeId) return { ok: false, reason: 'gap_already_has_challenge' };
  if (args.gap.status === 'resolved') return { ok: false, reason: 'gap_already_resolved' };
  return { ok: true };
}

export function canResolveKnowledgeGap(args: {
  gap: Pick<KnowledgeGap, 'status'>;
  resultResourceId?: string | null;
  resultSolutionRecordId?: string | null;
  resolutionStatus: 'resolved' | 'partially_resolved';
}): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (args.gap.status === 'resolved') return { ok: false, reason: 'gap_already_resolved' };
  if (args.resolutionStatus === 'resolved' && !args.resultResourceId && !args.resultSolutionRecordId) {
    return { ok: false, reason: 'result_required' };
  }
  return { ok: true };
}

export function canPublishSolutionRecordAsResource(args: {
  existingResourceId?: string | null;
}): { ok: true; reason?: undefined } | { ok: false; reason: string } {
  if (args.existingResourceId) return { ok: false, reason: 'solution_already_published' };
  return { ok: true };
}

export function spaceCardAction(args: {
  space: Pick<KnowledgeSpace, 'publisherProfileId' | 'status'>;
  currentProfileId: string | null | undefined;
  ownedLinkedProfileIds?: readonly string[];
}): 'view' | 'manage' {
  return canManageKnowledgeSpace(args) ? 'manage' : 'view';
}

export function attributionLabel(row: Pick<KnowledgeAttributionIdentity, 'displayName' | 'attributionKind'>): string {
  return row.displayName.trim() || (row.attributionKind === 'organization' ? 'Organization' : 'Contributor');
}

export function pathwayResources(resources: readonly KnowledgeResource[]): KnowledgeResource[] {
  return [...resources]
    .filter((row) => row.pathwayOrder != null)
    .sort((a, b) => (a.pathwayOrder ?? 0) - (b.pathwayOrder ?? 0));
}
