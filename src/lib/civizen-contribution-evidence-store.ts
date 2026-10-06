/** Persist live contribution evidence, evaluation history, and score history. */

import { supabase } from '@/integrations/supabase/client';
import type { UntypedSupabaseClient } from '@/integrations/supabase/untyped';
import type { ContributionEvent } from '@/lib/civizen-contributions';
import { scoreContributionsFromEvents } from '@/lib/civizen-contribution-score';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import { applyLiveEvaluatorWeights } from '@/lib/civizen-contribution-evaluator-live';
import {
  mergeEvidenceIntoEvents,
  type ContributionEvidenceKind,
  type ContributionEvidenceRecord,
  type ContributionEvaluatorRole,
  type RatingDimension,
} from '@/lib/civizen-contribution-evidence';
import { SCORE_CALCULATION_VERSION } from '@/lib/civizen-score-model';
import type { RatingConflict } from '@/lib/civizen-evaluator-reputation';

type DbClient = Pick<UntypedSupabaseClient, 'from'>;

export type NewContributionEvidence = {
  contributionSourceTable: string;
  contributionSourceId: string;
  subjectProfileId: string;
  evaluatorProfileId: string;
  kind: ContributionEvidenceKind;
  evaluatorRole: ContributionEvaluatorRole;
  ratings?: Partial<Record<RatingDimension, number>>;
  reason?: string | null;
  relationshipContext?: string | null;
  affected?: boolean;
  conflictType?: RatingConflict | null;
  conflictDisclosed?: boolean;
  payload?: Record<string, unknown>;
  validationStatus?: ContributionEvidenceRecord['validationStatus'];
  reweightReason?: string | null;
  occurredAt?: string;
};

function mapRow(row: Record<string, unknown>): ContributionEvidenceRecord {
  return {
    id: String(row.id),
    contributionSourceTable: String(row.contribution_source_table),
    contributionSourceId: String(row.contribution_source_id),
    kind: row.kind as ContributionEvidenceKind,
    evaluatorProfileId: String(row.evaluator_profile_id),
    evaluatorRole: row.evaluator_role as ContributionEvaluatorRole,
    ratings: (row.ratings && typeof row.ratings === 'object' ? row.ratings : {}) as ContributionEvidenceRecord['ratings'],
    reason: typeof row.reason === 'string' ? row.reason : null,
    relationshipContext: typeof row.relationship_context === 'string' ? row.relationship_context : null,
    affected: row.affected === true,
    conflictType: (row.conflict_type as RatingConflict | null) ?? null,
    conflictDisclosed: row.conflict_disclosed === true,
    payload: row.payload && typeof row.payload === 'object' ? row.payload as Record<string, unknown> : {},
    validationStatus: (row.validation_status as ContributionEvidenceRecord['validationStatus']) ?? null,
    reweightReason: typeof row.reweight_reason === 'string' ? row.reweight_reason : null,
    occurredAt: String(row.occurred_at ?? row.created_at ?? ''),
  };
}

export async function loadContributionEvidenceRecords(
  events: ContributionEvent[],
  client: DbClient = supabase,
): Promise<ContributionEvidenceRecord[]> {
  const ids = [...new Set(events.map((event) => event.sourceId))];
  if (ids.length === 0) return [];
  try {
    const { data, error } = await client
      .from('contribution_evidence_records')
      .select('*')
      .in('contribution_source_id', ids);
    if (error || !data) return [];
    const keys = new Set(events.map((event) => `${event.sourceTable}:${event.sourceId}`));
    return (data as Record<string, unknown>[])
      .map(mapRow)
      .filter((item) => keys.has(`${item.contributionSourceTable}:${item.contributionSourceId}`));
  } catch {
    return [];
  }
}

export function enrichEventsWithRecords(
  events: ContributionEvent[],
  records: ContributionEvidenceRecord[],
): ContributionEvent[] {
  return applyLiveEvaluatorWeights(mergeEvidenceIntoEvents(events, records), records);
}

export async function enrichContributionEventsWithLiveEvidence(
  events: ContributionEvent[],
  client: DbClient = supabase,
): Promise<ContributionEvent[]> {
  const records = await loadContributionEvidenceRecords(events, client);
  return enrichEventsWithRecords(events, records);
}

export async function recordContributionEvidence(
  input: NewContributionEvidence,
  events: ContributionEvent[],
  client: DbClient = supabase,
): Promise<{ record: ContributionEvidenceRecord; events: ContributionEvent[] }> {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const { data, error } = await client.from('contribution_evidence_records').insert({
    contribution_source_table: input.contributionSourceTable,
    contribution_source_id: input.contributionSourceId,
    subject_profile_id: input.subjectProfileId,
    evaluator_profile_id: input.evaluatorProfileId,
    kind: input.kind,
    evaluator_role: input.evaluatorRole,
    ratings: input.ratings ?? {},
    reason: input.reason ?? null,
    relationship_context: input.relationshipContext ?? null,
    affected: input.affected === true,
    conflict_type: input.conflictType ?? null,
    conflict_disclosed: input.conflictDisclosed === true,
    payload: input.payload ?? {},
    validation_status: input.validationStatus ?? (input.kind === 'independent_validation' ? 'accepted' : null),
    reweight_reason: input.reweightReason ?? null,
    occurred_at: occurredAt,
  }).select('*').single();
  if (error || !data) throw new Error(error?.message || 'Could not record contribution evidence');
  const record = mapRow(data as Record<string, unknown>);
  const before = scoreContributionsFromEvents(events);
  const nextEvents = enrichEventsWithRecords(events, [
    ...(await loadContributionEvidenceRecords(events, client)),
    record,
  ]);
  const after = scoreContributionsFromEvents(nextEvents);
  const view = evaluateContributionLifecycle(
    nextEvents.find((item) => item.sourceTable === input.contributionSourceTable && item.sourceId === input.contributionSourceId)
      ?? nextEvents[0]!,
  );
  await client.from('contribution_evaluation_history').insert({
    contribution_source_table: input.contributionSourceTable,
    contribution_source_id: input.contributionSourceId,
    profile_id: input.subjectProfileId,
    model_version: view.evaluationVersion,
    stage: view.stage,
    observation: view.observation,
    realized_impact: view.realizedImpact === 'unknown' ? null : view.realizedImpact,
    verification_kind: view.verificationKind,
    cause: input.reweightReason || input.kind,
    evidence_record_id: record.id,
    snapshot: view,
  });
  const scoreChanged = before?.score !== after?.score || before?.confidence !== after?.confidence;
  if (scoreChanged) {
    await client.from('profile_score_history').insert({
      profile_id: input.subjectProfileId,
      model_version: SCORE_CALCULATION_VERSION,
      previous_contributions: before?.score ?? null,
      new_contributions: after?.score ?? null,
      previous_confidence: before?.confidence ?? null,
      new_confidence: after?.confidence ?? null,
      cause: input.reweightReason || input.kind,
      evidence_root: `${input.contributionSourceTable}:${input.contributionSourceId}`,
    });
  }
  return { record, events: nextEvents };
}

export async function loadContributionEvaluationHistory(
  sourceTable: string,
  sourceId: string,
  client: DbClient = supabase,
): Promise<Array<Record<string, unknown>>> {
  try {
    const { data } = await client
      .from('contribution_evaluation_history')
      .select('*')
      .eq('contribution_source_table', sourceTable)
      .eq('contribution_source_id', sourceId)
      .order('created_at', { ascending: true });
    return (data ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

export async function loadProfileScoreHistory(
  profileId: string,
  client: DbClient = supabase,
): Promise<Array<Record<string, unknown>>> {
  try {
    const { data } = await client
      .from('profile_score_history')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(40);
    return (data ?? []) as Record<string, unknown>[];
  } catch {
    return [];
  }
}
