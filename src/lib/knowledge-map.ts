import {
  isKnowledgeAttributionKind,
  isKnowledgeGapKind,
  isKnowledgeGapStatus,
  isKnowledgeResourceStatus,
  isKnowledgeResourceType,
  isKnowledgeSpaceStatus,
  type KnowledgeAttribution,
  type KnowledgeAttributionIdentity,
  type KnowledgeAttributionPayload,
  type KnowledgeGap,
  type KnowledgeGapPayload,
  type KnowledgeResource,
  type KnowledgeResourcePayload,
  type KnowledgeSpace,
  type KnowledgeSpacePayload,
} from '@/lib/knowledge';

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asStringOrNull(value: unknown): string | null {
  const text = asString(value).trim();
  return text ? text : null;
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

export function mapKnowledgeSpace(row: Record<string, unknown>): KnowledgeSpace {
  return {
    id: asString(row.id),
    isDemo: row.is_demo === true,
    publisherProfileId: asString(row.publisher_profile_id),
    programId: asString(row.program_id),
    title: asString(row.title),
    summary: asString(row.summary),
    description: asStringOrNull(row.description),
    areaNodeId: asStringOrNull(row.area_node_id),
    status: isKnowledgeSpaceStatus(row.status) ? row.status : 'draft',
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapKnowledgeResource(row: Record<string, unknown>): KnowledgeResource {
  return {
    id: asString(row.id),
    spaceId: asString(row.space_id),
    publisherProfileId: asString(row.publisher_profile_id),
    programId: asString(row.program_id),
    title: asString(row.title),
    summary: asString(row.summary),
    resourceType: isKnowledgeResourceType(row.resource_type) ? row.resource_type : 'other',
    bodyText: asStringOrNull(row.body_text),
    externalUrl: asStringOrNull(row.external_url),
    relatedSkills: asStringArray(row.related_skills),
    status: isKnowledgeResourceStatus(row.status) ? row.status : 'draft',
    reviewerNotes: asStringOrNull(row.reviewer_notes),
    sourceEvidence: asStringOrNull(row.source_evidence),
    uncertaintyNotes: asStringOrNull(row.uncertainty_notes),
    challengeId: asStringOrNull(row.challenge_id),
    opportunityId: asStringOrNull(row.opportunity_id),
    solutionRecordId: asStringOrNull(row.solution_record_id),
    pathwayOrder: asNumberOrNull(row.pathway_order),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapKnowledgeAttribution(row: Record<string, unknown>): KnowledgeAttribution {
  return {
    id: asString(row.id),
    resourceId: asString(row.resource_id),
    attributionKind: isKnowledgeAttributionKind(row.attribution_kind) ? row.attribution_kind : 'person',
    profileId: asStringOrNull(row.profile_id),
    organizationName: asStringOrNull(row.organization_name),
  };
}

export function mapKnowledgeAttributionIdentity(row: Record<string, unknown>): KnowledgeAttributionIdentity {
  const mapped = mapKnowledgeAttribution(row);
  const username = asStringOrNull(row.username);
  const displayName =
    asStringOrNull(row.display_name) || mapped.organizationName || username || 'Contributor';
  return { ...mapped, displayName };
}

export function mapKnowledgeGap(row: Record<string, unknown>): KnowledgeGap {
  return {
    id: asString(row.id),
    spaceId: asString(row.space_id),
    publisherProfileId: asString(row.publisher_profile_id),
    programId: asString(row.program_id),
    title: asString(row.title),
    description: asString(row.description),
    gapKind: isKnowledgeGapKind(row.gap_kind) ? row.gap_kind : 'missing',
    status: isKnowledgeGapStatus(row.status) ? row.status : 'open',
    opportunityId: asStringOrNull(row.opportunity_id),
    challengeId: asStringOrNull(row.challenge_id),
    resultResourceId: asStringOrNull(row.result_resource_id),
    resultSolutionRecordId: asStringOrNull(row.result_solution_record_id),
    resolutionNotes: asStringOrNull(row.resolution_notes),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function toSpacePayloadJson(payload: KnowledgeSpacePayload): Record<string, unknown> {
  return {
    program_id: payload.programId,
    title: payload.title,
    summary: payload.summary,
    description: payload.description ?? null,
    area_node_id: payload.areaNodeId ?? null,
    status: payload.status ?? 'draft',
  };
}

export function toResourcePayloadJson(payload: KnowledgeResourcePayload): Record<string, unknown> {
  return {
    space_id: payload.spaceId,
    title: payload.title,
    summary: payload.summary,
    resource_type: payload.resourceType,
    body_text: payload.bodyText ?? null,
    external_url: payload.externalUrl ?? null,
    related_skills: payload.relatedSkills ?? [],
    status: payload.status ?? 'draft',
    reviewer_notes: payload.reviewerNotes ?? null,
    source_evidence: payload.sourceEvidence ?? null,
    uncertainty_notes: payload.uncertaintyNotes ?? null,
    challenge_id: payload.challengeId ?? null,
    opportunity_id: payload.opportunityId ?? null,
    solution_record_id: payload.solutionRecordId ?? null,
    pathway_order: payload.pathwayOrder ?? null,
    attributions: (payload.attributions ?? []).map((row: KnowledgeAttributionPayload) => ({
      attribution_kind: row.attributionKind,
      profile_id: row.profileId ?? null,
      organization_name: row.organizationName ?? null,
    })),
  };
}

export function toGapPayloadJson(payload: KnowledgeGapPayload): Record<string, unknown> {
  return {
    space_id: payload.spaceId,
    title: payload.title,
    description: payload.description,
    gap_kind: payload.gapKind ?? 'missing',
  };
}
