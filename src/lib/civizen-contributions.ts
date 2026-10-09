/**
 * Civizen Score Contributions: collect domain activity, estimate factors, score.
 * Heuristics are deterministic (v1). AI classification and off-platform declaration come later.
 */
export {
  contributionEvidenceRoots,
  scoreContributionsFromEvents,
  demonstratedSkillsFromContributionEvents,
  demonstratedProjectsFromContributionEvents,
} from '@/lib/civizen-contribution-score';
import { supabase } from '@/integrations/supabase/client';
import { collectCivicContributionSources } from '@/lib/civizen-contributions-civic-sources';
import type { SupabaseDbClient } from '@/integrations/supabase/client-type';
import type { Json } from '@/integrations/supabase/types';
import {
  groupDevelopmentStoriesToContributions,
  storyFromDevelopmentRow,
} from '@/lib/civizen-development-evidence';
import { involvementFromStories } from '@/lib/civizen-contribution-provenance';
import { enrichContributionEventsWithLiveEvidence } from '@/lib/civizen-contribution-evidence-store';

export type ContributionEventType =
  | 'law_contribution'
  | 'funding_record'
  | 'solution_problem'
  | 'solution_comment'
  | 'solution_endorsement'
  | 'governance_proposal'
  | 'governance_vote'
  | 'development_story'
  | 'post'
  | 'post_comment'
  | 'content_item'
  | 'opportunity_participation'
  | 'matter_raised'
  | 'knowledge_resource';

export type ContributionEvent = {
  id?: string;
  profileId: string;
  sourceTable: string;
  sourceId: string;
  eventType: ContributionEventType;
  title: string;
  summary: string | null;
  capacityEstimate: number;
  impactEstimate: number;
  collaborationEstimate: number;
  beneficiaryEstimate: number;
  verified: boolean;
  occurredAt: string;
  rawMeta: Record<string, unknown>;
};

type TypeBase = {
  capacity: number;
  impact: number;
  collaboration: number;
  beneficiaries: number;
};

export const CONTRIBUTION_TYPE_BASES: Record<ContributionEventType, TypeBase> = {
  law_contribution: { capacity: 70, impact: 55, collaboration: 20, beneficiaries: 60 },
  funding_record: { capacity: 65, impact: 70, collaboration: 15, beneficiaries: 55 },
  solution_problem: { capacity: 55, impact: 50, collaboration: 35, beneficiaries: 65 },
  solution_comment: { capacity: 35, impact: 30, collaboration: 70, beneficiaries: 40 },
  solution_endorsement: { capacity: 25, impact: 35, collaboration: 60, beneficiaries: 40 },
  governance_proposal: { capacity: 75, impact: 60, collaboration: 40, beneficiaries: 70 },
  governance_vote: { capacity: 20, impact: 25, collaboration: 50, beneficiaries: 45 },
  // Platform improvement requests documented in Home → Stories (high civic capacity).
  development_story: { capacity: 72, impact: 68, collaboration: 35, beneficiaries: 75 },
  post: { capacity: 25, impact: 15, collaboration: 20, beneficiaries: 20 },
  post_comment: { capacity: 15, impact: 10, collaboration: 55, beneficiaries: 15 },
  content_item: { capacity: 50, impact: 40, collaboration: 25, beneficiaries: 45 },
  opportunity_participation: { capacity: 75, impact: 70, collaboration: 40, beneficiaries: 65 },
  matter_raised: { capacity: 55, impact: 50, collaboration: 45, beneficiaries: 60 },
  knowledge_resource: { capacity: 55, impact: 45, collaboration: 30, beneficiaries: 55 },
};

import { CONTRIBUTION_EVENT_TYPE_LABELS } from '@/lib/civizen-contributions-labels';
export { CONTRIBUTION_EVENT_TYPE_LABELS };

/** Soft-cap for quantity curve — sustained builders need room before diminishing returns flatten. */
export const CONTRIBUTION_QUANTITY_SOFT_CAP = 48;
export const CONTRIBUTION_QUANTITY_MAX = 48;

const SKIP_CONTENT_SOURCE_TABLES = new Set([
  'posts',
  'post_comments',
  'law_contributions',
  'solution_problems',
  'solution_comments',
  'governance_proposals',
  'governance_proposal_votes',
  'contribution_records',
  'development_stories',
  'opportunity_participations',
  // Chat mirrors are not civic contribution artifacts; development_stories capture product work.
  'private_messages',
  'messages',
]);

function clampFactor(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Soft size multiplier from text length (capacity). */
export function contentSizeFactor(textLen: number): number {
  if (textLen > 300) return 1.1;
  if (textLen < 50) return 0.85;
  return 1;
}

/**
 * Verification must not change the semantic activity rating.
 * Kept as a named function so call sites stay explicit.
 */
export function applyVerifiedImpactBoost(impact: number, _verified: boolean): number {
  return clampFactor(impact);
}

export function applyVerifiedEvidenceWeight(verified: boolean): number {
  return verified ? 1.25 : 0.55;
}

export type EstimateContributionInput = {
  eventType: ContributionEventType;
  title?: string | null;
  summary?: string | null;
  textLen?: number;
  verified?: boolean;
  /** Optional 0–100 overrides (e.g. funding quality/impact scores). */
  capacityOverride?: number | null;
  impactOverride?: number | null;
  beneficiaryOverride?: number | null;
  rawMeta?: Record<string, unknown>;
  occurredAt?: string;
  sourceTable: string;
  sourceId: string;
  profileId: string;
};

export function estimateContributionEvent(input: EstimateContributionInput): ContributionEvent {
  const base = CONTRIBUTION_TYPE_BASES[input.eventType];
  const size = contentSizeFactor(input.textLen ?? 0);
  const verified = Boolean(input.verified);

  const capacity = clampFactor(
    input.capacityOverride != null && Number.isFinite(input.capacityOverride)
      ? Number(input.capacityOverride)
      : base.capacity * size,
  );

  const impactBase =
    input.impactOverride != null && Number.isFinite(input.impactOverride)
      ? Number(input.impactOverride)
      : base.impact;
  const impact = clampFactor(impactBase);

  const beneficiaries = clampFactor(
    input.beneficiaryOverride != null && Number.isFinite(input.beneficiaryOverride)
      ? Number(input.beneficiaryOverride)
      : base.beneficiaries,
  );

  const title =
    (input.title?.trim() || CONTRIBUTION_EVENT_TYPE_LABELS[input.eventType]).slice(0, 120);

  return {
    profileId: input.profileId,
    sourceTable: input.sourceTable,
    sourceId: input.sourceId,
    eventType: input.eventType,
    title,
    summary: input.summary?.trim() ? input.summary.trim().slice(0, 80) : null,
    capacityEstimate: capacity,
    impactEstimate: impact,
    collaborationEstimate: clampFactor(base.collaboration),
    beneficiaryEstimate: beneficiaries,
    verified,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    rawMeta: input.rawMeta ?? {},
  };
}


function asText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

type DbClient = SupabaseDbClient;

/**
 * Fan-out collect + estimate from live domain tables for one profile.
 */
export async function collectContributionSources(
  profileId: string,
  userId: string | null | undefined,
  client: DbClient = supabase,
): Promise<ContributionEvent[]> {
  const events: ContributionEvent[] = [];
  const db = client;

  const [
    lawRes,
    solutionsRes,
    commentsRes,
    endorseRes,
    proposalsRes,
    votesRes,
    postsRes,
    postCommentsRes,
    contentRes,
    storiesRes,
    opportunityRes,
  ] = await Promise.all([
    db
      .from('law_contributions')
      .select('id, title, note, contribution_type, status, reviewed_at, created_at')
      .eq('author_id', profileId),
    db
      .from('solution_problems')
      .select('id, title, body, status, created_at')
      .eq('author_id', profileId),
    db
      .from('solution_comments')
      .select('id, body, created_at')
      .eq('author_id', profileId),
    db
      .from('solution_proposal_endorsements')
      .select('proposal_id, profile_id, created_at')
      .eq('profile_id', profileId),
    db
      .from('governance_proposals')
      .select('id, title, body, status, created_at')
      .eq('proposer_id', profileId),
    db
      .from('governance_proposal_votes')
      .select('id, choice, proposal_id, created_at')
      .eq('voter_id', profileId),
    db.from('posts').select('id, content, created_at').eq('author_id', profileId),
    db.from('post_comments').select('id, content, created_at').eq('author_id', profileId),
    db
      .from('content_items')
      .select('id, title, body_preview, review_status, content_type, source_table, submitted_at, created_at')
      .eq('author_id', profileId),
    db
      .from('development_stories')
      .select(
        'id, title, original_instruction, rephrased_description, section, area, created_features, requested_at, created_at, commit_sha, pr_number, reviewed_by, source, source_type, source_story_key, chat_id, metadata, status',
      )
      .eq('author_id', profileId),
    db
      .from('opportunity_participations')
      .select('id, completed_at, updated_at, opportunity_id')
      .eq('participant_profile_id', profileId)
      .eq('status', 'completed')
      .eq('verification_status', 'verified'),
  ]);

  for (const row of lawRes.data ?? []) {
    const status = asText(row.status);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'law_contributions',
        sourceId: String(row.id),
        eventType: 'law_contribution',
        title: asText(row.title),
        summary: asText(row.contribution_type),
        textLen: asText(row.note).length,
        verified: status === 'approved',
        occurredAt: asText(row.reviewed_at) || asText(row.created_at),
        rawMeta: { status, contribution_type: row.contribution_type },
      }),
    );
  }

  for (const row of solutionsRes.data ?? []) {
    const status = asText(row.status);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'solution_problems',
        sourceId: String(row.id),
        eventType: 'solution_problem',
        title: asText(row.title),
        summary: status,
        textLen: asText(row.body).length,
        verified: status === 'consensus' || status === 'closed',
        occurredAt: asText(row.created_at),
        rawMeta: { status },
      }),
    );
  }

  for (const row of commentsRes.data ?? []) {
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'solution_comments',
        sourceId: String(row.id),
        eventType: 'solution_comment',
        title: asText(row.body).slice(0, 120),
        summary: 'discuss',
        textLen: asText(row.body).length,
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: {},
      }),
    );
  }

  for (const row of endorseRes.data ?? []) {
    const proposalId = String(row.proposal_id);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'solution_proposal_endorsements',
        sourceId: `${proposalId}:${profileId}`,
        eventType: 'solution_endorsement',
        title: 'Solution endorsement',
        summary: 'endorse',
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: { proposal_id: proposalId },
      }),
    );
  }

  for (const row of proposalsRes.data ?? []) {
    const status = asText(row.status);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'governance_proposals',
        sourceId: String(row.id),
        eventType: 'governance_proposal',
        title: asText(row.title),
        summary: status,
        textLen: asText(row.body).length,
        verified: status === 'approved',
        occurredAt: asText(row.created_at),
        rawMeta: { status },
      }),
    );
  }

  for (const row of votesRes.data ?? []) {
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'governance_proposal_votes',
        sourceId: String(row.id),
        eventType: 'governance_vote',
        title: 'Governance vote',
        summary: asText(row.choice),
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: { choice: row.choice, proposal_id: row.proposal_id },
      }),
    );
  }

  for (const row of postsRes.data ?? []) {
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'posts',
        sourceId: String(row.id),
        eventType: 'post',
        title: asText(row.content).slice(0, 120),
        summary: 'social',
        textLen: asText(row.content).length,
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: {},
      }),
    );
  }

  for (const row of postCommentsRes.data ?? []) {
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'post_comments',
        sourceId: String(row.id),
        eventType: 'post_comment',
        title: asText(row.content).slice(0, 120),
        summary: 'social',
        textLen: asText(row.content).length,
        verified: false,
        occurredAt: asText(row.created_at),
        rawMeta: {},
      }),
    );
  }

  for (const row of contentRes.data ?? []) {
    const sourceTable = asText(row.source_table);
    if (sourceTable && SKIP_CONTENT_SOURCE_TABLES.has(sourceTable)) continue;
    const status = asText(row.review_status);
    events.push(
      estimateContributionEvent({
        profileId,
        sourceTable: 'content_items',
        sourceId: String(row.id),
        eventType: 'content_item',
        title: asText(row.title) || asText(row.body_preview),
        summary: status || asText(row.content_type),
        textLen: asText(row.body_preview).length,
        verified: status === 'approved',
        occurredAt: asText(row.submitted_at) || asText(row.created_at),
        rawMeta: { review_status: status, source_table: sourceTable },
      }),
    );
  }

  if (!storiesRes.error) {
    const developmentStories = (storiesRes.data ?? []).map((row: Record<string, unknown>) => storyFromDevelopmentRow(row));
    for (const item of groupDevelopmentStoriesToContributions(developmentStories)) {
      events.push(
        estimateContributionEvent({
          profileId,
          sourceTable: 'development_stories',
          sourceId: item.sourceId,
          eventType: 'development_story',
          title: item.title,
          summary: item.summary,
          textLen: item.instruction.length,
          verified: item.verified,
          occurredAt: item.occurredAt,
          rawMeta: {
            eligibility: item.eligibility,
            provenanceCount: item.provenanceStoryIds.length,
            provenanceStoryIds: item.provenanceStoryIds,
            humanInvolvement: involvementFromStories(developmentStories.filter((story) =>
              item.provenanceStoryIds.includes(story.id || story.sourceStoryKey || ''),
            )),
            commitShas: item.commitShas.slice(0, 8),
            contributionRoles: item.roles,
            implementationAssisted: item.implementationAssisted,
            independentValidation: item.independentValidation,
            outcomeValidated: item.outcomeValidated,
            realFeatures: item.realFeatures.slice(0, 12),
            contributionFunction: item.contributionFunction,
            domain: item.classifiedDomain,
            testsPassed: item.testsPassed,
            affectedPaths: item.affectedPaths,
            reconstructionResult: item.reconstructionResult,
            survivingImplementation: item.survivingImplementation,
            instruction: item.instruction,
            linkedInstructions: item.linkedInstructions,
          },
        }),
      );
    }
  }

  const opportunityRows = opportunityRes.data ?? [];
  if (opportunityRows.length > 0) {
    const participationIds = opportunityRows.map((row: { id: unknown }) => String(row.id));
    const opportunityIds = [
      ...new Set(opportunityRows.map((row: { opportunity_id: unknown }) => String(row.opportunity_id))),
    ];
    const [{ data: opportunityRecords }, { data: evaluationRecords }] = await Promise.all([
      db
        .from('contribution_opportunities')
        .select('id, title, opportunity_kind')
        .in('id', opportunityIds),
      db
        .from('opportunity_evaluations')
        .select('participation_id, evaluator_profile_id, quality_score, impact_score, created_at, decision')
        .in('participation_id', participationIds)
        .eq('decision', 'verified'),
    ]);
    const assessmentsRes = await db
      .from('opportunity_work_assessments')
      .select(
        'participation_id, evaluator_profile_id, quality_score, impact_score, collaboration_score, created_at',
      )
      .in('participation_id', participationIds);
    const skillsRes = await db
      .from('opportunity_skill_evidence')
      .select('participation_id, skill_name')
      .in('participation_id', participationIds);
    const opportunityById = new Map(
      ((opportunityRecords ?? []) as Array<{ id: unknown; title?: unknown; opportunity_kind?: unknown }>).map(
        (row): [string, { title?: unknown; opportunity_kind?: unknown }] => [String(row.id), row],
      ),
    );
    const evaluationsByParticipation = new Map<
      string,
      Array<{ quality_score?: unknown; impact_score?: unknown; evaluator_profile_id?: unknown }>
    >();
    for (const row of evaluationRecords ?? []) {
      const key = String(row.participation_id);
      const list = evaluationsByParticipation.get(key) ?? [];
      list.push(row);
      evaluationsByParticipation.set(key, list);
    }
    const assessmentByParticipation = new Map<
      string,
      {
        quality_score?: unknown;
        impact_score?: unknown;
        collaboration_score?: unknown;
        evaluator_profile_id?: unknown;
      }
    >();
    for (const row of assessmentsRes.data ?? []) {
      assessmentByParticipation.set(String(row.participation_id), row);
    }
    const skillsByParticipation = new Map<string, string[]>();
    for (const row of skillsRes.data ?? []) {
      const key = String(row.participation_id);
      const name = asText(row.skill_name);
      if (!name) continue;
      const list = skillsByParticipation.get(key) ?? [];
      if (!list.some((item) => item.toLowerCase() === name.toLowerCase())) list.push(name);
      skillsByParticipation.set(key, list);
    }

    for (const row of opportunityRows) {
      const opportunity = opportunityById.get(String(row.opportunity_id));
      const evaluations = evaluationsByParticipation.get(String(row.id)) ?? [];
      const assessment = assessmentByParticipation.get(String(row.id));
      const qualityValues = [
        ...evaluations.map((item) => asNumber(item.quality_score)),
        asNumber(assessment?.quality_score),
      ].filter((value): value is number => value != null);
      const impactValues = [
        ...evaluations.map((item) => asNumber(item.impact_score)),
        asNumber(assessment?.impact_score),
      ].filter((value): value is number => value != null);
      const collaboration = asNumber(assessment?.collaboration_score);
      const evaluatorIds = [
        ...evaluations.map((item) => asText(item.evaluator_profile_id)),
        asText(assessment?.evaluator_profile_id),
      ].filter(Boolean);
      events.push(
        estimateContributionEvent({
          profileId,
          sourceTable: 'opportunity_participations',
          sourceId: String(row.id),
          eventType: 'opportunity_participation',
          title: asText(opportunity?.title) || 'Verified contribution',
          summary: asText(opportunity?.opportunity_kind) || 'education_to_contribution',
          verified: true,
          capacityOverride: qualityValues.length > 0 ? mean(qualityValues) : 75,
          impactOverride: impactValues.length > 0 ? mean(impactValues) : 70,
          occurredAt: asText(row.completed_at) || asText(row.updated_at),
          rawMeta: {
            kind: asText(opportunity?.opportunity_kind) || 'education_to_contribution',
            opportunityId: String(row.opportunity_id),
            opportunityTitle: asText(opportunity?.title) || null,
            evaluationCount: evaluations.length,
            evaluatorIds: [...new Set(evaluatorIds)],
            demonstratedSkills: skillsByParticipation.get(String(row.id)) ?? [],
            collaborationOverride: collaboration,
          },
        }),
      );
      const last = events[events.length - 1];
      if (collaboration != null) {
        last.collaborationEstimate = clampFactor(collaboration);
      }
    }
  }

  if (userId) {
    const { data: contributor } = await db
      .from('contributor_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (contributor?.id) {
      const { data: records } = await db
        .from('contribution_records')
        .select(
          'id, work_type, quality_score, impact_score, verified_points, status, created_at',
        )
        .eq('contributor_id', contributor.id);

      for (const row of records ?? []) {
        const status = asText(row.status);
        const verifiedPoints = asNumber(row.verified_points) ?? 0;
        events.push(
          estimateContributionEvent({
            profileId,
            sourceTable: 'contribution_records',
            sourceId: String(row.id),
            eventType: 'funding_record',
            title: asText(row.work_type) || 'Funding contribution',
            summary: status,
            verified: status === 'verified',
            capacityOverride: asNumber(row.quality_score) ?? undefined,
            impactOverride: asNumber(row.impact_score) ?? undefined,
            beneficiaryOverride: clampFactor(Math.max(55, Math.min(100, verifiedPoints / 10))),
            occurredAt: asText(row.created_at),
            rawMeta: {
              status,
              verified_points: verifiedPoints,
            },
          }),
        );
      }
    }
  }

  events.push(...(await collectCivicContributionSources(profileId, db)));
  events.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return events;
}

function eventToRow(event: ContributionEvent) {
  return {
    profile_id: event.profileId,
    source_table: event.sourceTable,
    source_id: event.sourceId,
    event_type: event.eventType,
    title: event.title,
    summary: event.summary,
    capacity_estimate: event.capacityEstimate,
    impact_estimate: event.impactEstimate,
    collaboration_estimate: event.collaborationEstimate,
    beneficiary_estimate: event.beneficiaryEstimate,
    verified: event.verified,
    occurred_at: event.occurredAt,
    raw_meta: event.rawMeta as NonNullable<Json>,
    updated_at: new Date().toISOString(),
  };
}

export function mapContributionEventRow(row: Record<string, unknown>): ContributionEvent {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    profileId: String(row.profile_id),
    sourceTable: String(row.source_table),
    sourceId: String(row.source_id),
    eventType: String(row.event_type) as ContributionEventType,
    title: asText(row.title) || CONTRIBUTION_EVENT_TYPE_LABELS[String(row.event_type) as ContributionEventType] || 'Contribution',
    summary: asText(row.summary) || null,
    capacityEstimate: asNumber(row.capacity_estimate) ?? 0,
    impactEstimate: asNumber(row.impact_estimate) ?? 0,
    collaborationEstimate: asNumber(row.collaboration_estimate) ?? 0,
    beneficiaryEstimate: asNumber(row.beneficiary_estimate) ?? 0,
    verified: Boolean(row.verified),
    occurredAt: asText(row.occurred_at) || new Date().toISOString(),
    rawMeta:
      row.raw_meta && typeof row.raw_meta === 'object' && !Array.isArray(row.raw_meta)
        ? (row.raw_meta as Record<string, unknown>)
        : {},
  };
}

/** Skip full domain recollect within this window (Home/Profile remounts). */
export const CONTRIBUTION_SYNC_TTL_MS = 90_000;

const contributionSyncState = new Map<
  string,
  { at: number; promise: Promise<ContributionEvent[]> | null }
>();

/**
 * Collect domain activity, upsert into the ledger, return estimated events.
 * Dedupes in-flight work and skips full recollect within {@link CONTRIBUTION_SYNC_TTL_MS}
 * unless `force` is set — callers should prefer {@link loadContributionEvents} for first paint.
 */
export async function syncContributionEvents(
  profileId: string,
  userId?: string | null,
  client: DbClient = supabase,
  options?: { force?: boolean },
): Promise<ContributionEvent[]> {
  const existing = contributionSyncState.get(profileId);
  if (existing?.promise) {
    return existing.promise;
  }

  const now = Date.now();
  if (!options?.force && existing && now - existing.at < CONTRIBUTION_SYNC_TTL_MS) {
    return loadContributionEvents(profileId, client);
  }

  const promise = (async () => {
    const events = await collectContributionSources(profileId, userId, client);
    const db = client;
    const eligibleDevelopmentSourceIds = events
      .filter((event) => event.sourceTable === 'development_stories')
      .map((event) => event.sourceId);
    const { data: existingDevelopment } = await db
      .from('profile_contribution_events')
      .select('id, source_id')
      .eq('profile_id', profileId)
      .eq('source_table', 'development_stories');
    const eligible = new Set(eligibleDevelopmentSourceIds);
    const staleIds = ((existingDevelopment ?? []) as Array<{ id?: unknown; source_id?: unknown }>)
      .filter((row) => !eligible.has(String(row.source_id ?? '')))
      .map((row) => row.id)
      .filter((id): id is string => typeof id === 'string');
    for (let i = 0; i < staleIds.length; i += 100) {
      const { error: pruneError } = await db
        .from('profile_contribution_events')
        .delete()
        .in('id', staleIds.slice(i, i + 100));
      if (pruneError) {
        console.error('syncContributionEvents prune failed', pruneError);
        break;
      }
    }

    if (events.length === 0) {
      const { data } = await db
        .from('profile_contribution_events')
        .select('*')
        .eq('profile_id', profileId)
        .order('occurred_at', { ascending: false });
      return enrichContributionEventsWithLiveEvidence(
        (data ?? []).map((row: Record<string, unknown>) => mapContributionEventRow(row)),
        client,
      );
    }

    const rows = events.map(eventToRow);
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await db
        .from('profile_contribution_events')
        .upsert(chunk, { onConflict: 'source_table,source_id' });
      if (error) {
        console.error('syncContributionEvents upsert failed', error);
        break;
      }
    }

    // Drop chat-mirror content_items that were backfilled before the skip list.
    await db
      .from('profile_contribution_events')
      .delete()
      .eq('profile_id', profileId)
      .eq('source_table', 'content_items')
      .filter('raw_meta->>source_table', 'in', '("private_messages","messages")');

    const { data } = await db
      .from('profile_contribution_events')
      .select('*')
      .eq('profile_id', profileId)
      .order('occurred_at', { ascending: false });

    return enrichContributionEventsWithLiveEvidence(
      (data ?? []).map((row: Record<string, unknown>) => mapContributionEventRow(row)),
      client,
    );
  })();

  contributionSyncState.set(profileId, { at: now, promise });
  try {
    const result = await promise;
    contributionSyncState.set(profileId, { at: Date.now(), promise: null });
    return result;
  } catch (error) {
    contributionSyncState.set(profileId, { at: 0, promise: null });
    throw error;
  }
}

/** Fast ledger read, then optional background sync (does not await sync). */
export async function loadContributionEventsThenSync(
  profileId: string,
  userId?: string | null,
  client: DbClient = supabase,
  onSynced?: (events: ContributionEvent[]) => void,
): Promise<ContributionEvent[]> {
  const events = await loadContributionEvents(profileId, client);
  void syncContributionEvents(profileId, userId, client)
    .then((synced) => {
      onSynced?.(synced);
    })
    .catch((error) => {
      console.error('Background contribution sync failed', error);
    });
  return events;
}

export {
  queryContributionLedger,
  previewContributionRecords,
  canonicalContributionRecords,
  summarizeContributionTypes,
} from '@/lib/civizen-contribution-ledger';

export async function loadContributionEvents(
  profileId: string,
  client: DbClient = supabase,
): Promise<ContributionEvent[]> {
  const { data, error } = await client
    .from('profile_contribution_events')
    .select('*')
    .eq('profile_id', profileId)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('loadContributionEvents failed', error);
    return [];
  }

  return enrichContributionEventsWithLiveEvidence(
    (data ?? []).map((row: Record<string, unknown>) => mapContributionEventRow(row)),
    client,
  );
}

