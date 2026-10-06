/**
 * Civizen Score Performance: system + peer ratings on contribution activities.
 * Own Performance is read-only; peers rate others' contribution events.
 */

import {
  clampScore,
  diminishingQuantityScore,
  type CategoryScoreInput,
  type ScoreMetric,
} from '@/lib/civizen-score';
import { evaluateContributionObservation } from '@/lib/civizen-contribution-observation';
import type { ContributionEvent } from '@/lib/civizen-contributions';
import { contributionEvidenceRoots } from '@/lib/civizen-contributions';
import {
  evidenceRootId,
  reputationFromObservations,
  type CategoryObservation,
} from '@/lib/civizen-score-model';
import { supabase } from '@/integrations/supabase/client';
import type { UntypedSupabaseClient } from '@/integrations/supabase/untyped';

export type PerformancePeerRating = {
  id?: string;
  contributionEventId: string;
  subjectProfileId: string;
  raterProfileId: string;
  score: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PerformanceActivity = {
  event: ContributionEvent;
  systemRating: number;
  peerAverage: number | null;
  peerCount: number;
  myRating: number | null;
};

export const PERFORMANCE_QUANTITY_SOFT_CAP = 24;
export const PERFORMANCE_QUANTITY_MAX = 25;

/** Platform-direct contribution types get full system-rating weight. */
const PLATFORM_DIRECT_TYPES = new Set([
  'development_story',
  'law_contribution',
  'funding_record',
  'governance_proposal',
  'content_item',
  'solution_problem',
  'opportunity_participation',
]);

type DbClient = UntypedSupabaseClient;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Derive a 0–100 system rating from contribution factor estimates.
 * Verification does not change the rating; it only affects evidential weight later.
 */
export function deriveSystemRating(event: ContributionEvent): number {
  const evaluated = evaluateContributionObservation(event);
  const blend =
    evaluated.observation ??
    event.impactEstimate * 0.55 + event.capacityEstimate * 0.35 + event.collaborationEstimate * 0.1;
  const typeWeight = PLATFORM_DIRECT_TYPES.has(event.eventType) ? 1 : 0.85;
  return clampScore(blend * typeWeight);
}

export function canRatePerformance(args: {
  raterProfileId: string | null | undefined;
  subjectProfileId: string | null | undefined;
}): boolean {
  if (!args.raterProfileId || !args.subjectProfileId) return false;
  return args.raterProfileId !== args.subjectProfileId;
}

export function mapPerformanceRatingRow(row: Record<string, unknown>): PerformancePeerRating {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    contributionEventId: String(row.contribution_event_id),
    subjectProfileId: String(row.subject_profile_id),
    raterProfileId: String(row.rater_profile_id),
    score: asNumber(row.score) ?? 0,
    comment: asText(row.comment) || null,
    createdAt: asText(row.created_at) || new Date().toISOString(),
    updatedAt: asText(row.updated_at) || new Date().toISOString(),
  };
}

export async function loadPerformanceRatings(
  subjectProfileId: string,
  client: DbClient = supabase,
): Promise<PerformancePeerRating[]> {
  const { data, error } = await client
    .from('profile_performance_ratings')
    .select('*')
    .eq('subject_profile_id', subjectProfileId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('loadPerformanceRatings failed', error);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>) => mapPerformanceRatingRow(row));
}

export async function upsertPerformanceRating(
  args: {
    contributionEventId: string;
    subjectProfileId: string;
    raterProfileId: string;
    score: number;
    comment?: string | null;
  },
  client: DbClient = supabase,
): Promise<{ ok: boolean; error?: string }> {
  if (!canRatePerformance(args)) {
    return { ok: false, error: 'self_rate_forbidden' };
  }

  const score = clampScore(args.score);
  const { error } = await client.from('profile_performance_ratings').upsert(
    {
      contribution_event_id: args.contributionEventId,
      subject_profile_id: args.subjectProfileId,
      rater_profile_id: args.raterProfileId,
      score,
      comment: args.comment?.trim() || null,
    },
    { onConflict: 'contribution_event_id,rater_profile_id' },
  );

  if (error) {
    console.error('upsertPerformanceRating failed', error);
    return { ok: false, error: error.message ?? 'upsert_failed' };
  }

  return { ok: true };
}

export function buildPerformanceActivities(
  events: ContributionEvent[],
  ratings: PerformancePeerRating[],
  viewerProfileId?: string | null,
): PerformanceActivity[] {
  const byEvent = new Map<string, PerformancePeerRating[]>();
  for (const rating of ratings) {
    const list = byEvent.get(rating.contributionEventId) ?? [];
    list.push(rating);
    byEvent.set(rating.contributionEventId, list);
  }

  return events.map((event) => {
    const eventId = event.id;
    const peerRatings = eventId ? byEvent.get(eventId) ?? [] : [];
    const peerScores = peerRatings.map((r) => r.score);
    const my = viewerProfileId
      ? peerRatings.find((r) => r.raterProfileId === viewerProfileId)
      : undefined;

    return {
      event,
      systemRating: deriveSystemRating(event),
      peerAverage: peerScores.length > 0 ? clampScore(mean(peerScores)) : null,
      peerCount: peerScores.length,
      myRating: my != null ? clampScore(my.score) : null,
    };
  });
}

/**
 * Score Performance as accumulated reputation from activity evaluations.
 * System ratings remain activity evaluations; the category score is small-sample shrunk.
 */
export function scorePerformanceFromActivities(
  activities: PerformanceActivity[],
): CategoryScoreInput | null {
  if (activities.length === 0) return null;

  const byRoot = new Map<string, PerformanceActivity>();
  for (const activity of activities) {
    const root = evidenceRootId(activity.event.sourceTable, activity.event.sourceId);
    if (!byRoot.has(root)) byRoot.set(root, activity);
  }
  const unique = [...byRoot.values()];

  const observations: CategoryObservation[] = unique.map((activity) => {
    const evaluatorIds: string[] = [];
    if (activity.peerCount > 0) {
      evaluatorIds.push(`peers:${activity.peerCount}`);
    }
    const stored = Array.isArray(activity.event.rawMeta.evaluatorIds)
      ? activity.event.rawMeta.evaluatorIds.filter((id): id is string => typeof id === 'string')
      : [];
    return {
      evidenceRootId: evidenceRootId(activity.event.sourceTable, activity.event.sourceId),
      value: activity.systemRating,
      verified: activity.event.verified,
      occurredAt: activity.event.occurredAt,
      evaluatorIds: [...stored, ...evaluatorIds],
      evaluationCount: Math.max(
        typeof activity.event.rawMeta.evaluationCount === 'number'
          ? activity.event.rawMeta.evaluationCount
          : 0,
        activity.peerCount,
        stored.length,
      ),
    };
  });
  const peerObservations: CategoryObservation[] = unique.flatMap((activity) => {
    if (activity.peerAverage == null || activity.peerCount <= 0) return [];
    return [
      {
        evidenceRootId: evidenceRootId(activity.event.sourceTable, activity.event.sourceId),
        value: activity.peerAverage,
        verified: activity.event.verified,
        occurredAt: activity.event.occurredAt,
        evaluatorIds: [`peer-avg:${activity.peerCount}`],
        evaluationCount: activity.peerCount,
      },
    ];
  });

  const reputation = reputationFromObservations([...observations, ...peerObservations]);
  if (reputation.score == null) return null;

  const verifiedCount = unique.filter((activity) => activity.event.verified).length;
  const peerCount = unique.reduce((sum, activity) => sum + activity.peerCount, 0);
  const now = Date.now();
  const recentCutoff = now - 90 * 24 * 60 * 60 * 1000;
  const recentActivities = unique.filter((activity) => {
    const t = Date.parse(activity.event.occurredAt);
    return Number.isFinite(t) && t >= recentCutoff;
  });

  const systemRatings = unique.map((activity) => activity.systemRating);
  const accomplishmentMetric = clampScore(mean(systemRatings));
  const peerFlat = unique.flatMap((activity) =>
    activity.peerAverage == null || activity.peerCount <= 0 ? [] : [activity.peerAverage],
  );
  const ratingsMetric = peerFlat.length > 0 ? clampScore(mean(peerFlat)) : null;
  const activityMetric = diminishingQuantityScore(
    unique.length,
    PERFORMANCE_QUANTITY_SOFT_CAP,
    70,
  );
  const verifiedRatio = unique.length > 0 ? verifiedCount / unique.length : 0;
  const reliabilityMetric = clampScore(verifiedRatio * 40 + accomplishmentMetric * 0.6);
  const engagementMetric = clampScore(diminishingQuantityScore(recentActivities.length, 8, 70));

  const metrics: ScoreMetric[] = [
    {
      id: 'engagement',
      label: 'Engagement',
      value: engagementMetric,
      sourceCount: recentActivities.length,
      confidence: 'low',
    },
    {
      id: 'activity',
      label: 'Activity',
      value: activityMetric,
      sourceCount: unique.length,
      confidence: 'low',
    },
    {
      id: 'reliability',
      label: 'Reliability',
      value: reliabilityMetric,
      sourceCount: verifiedCount,
      confidence: 'low',
    },
    {
      id: 'accomplishment',
      label: 'Accomplishment',
      value: accomplishmentMetric,
      sourceCount: unique.length,
      confidence: 'low',
    },
    {
      id: 'ratings',
      label: 'Ratings',
      value: ratingsMetric,
      sourceCount: peerCount,
      confidence: peerCount > 0 ? 'low' : 'insufficient',
    },
  ];

  return {
    score: reputation.score,
    sourceCount: unique.length,
    verifiedSourceCount: verifiedCount,
    confidence: 'low',
    status: reputation.status,
    independentEvidenceCount: reputation.independentEvidenceCount,
    effectiveEvidenceVolume: reputation.effectiveEvidenceVolume,
    evidenceRoots: reputation.evidenceRoots,
    evidenceRootRefs: contributionEvidenceRoots(unique.map((activity) => activity.event)),
    metrics,
  };
}

/** Convenience: events + ratings → category input. */
export function scorePerformanceFromEvents(
  events: ContributionEvent[],
  ratings: PerformancePeerRating[] = [],
  viewerProfileId?: string | null,
): CategoryScoreInput | null {
  return scorePerformanceFromActivities(
    buildPerformanceActivities(events, ratings, viewerProfileId),
  );
}
