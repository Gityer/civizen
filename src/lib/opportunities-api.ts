import { supabase } from '@/integrations/supabase/client';
import {
  mapContributionOpportunity,
  mapOpportunityApplicantIdentity,
  mapOpportunityEvaluation,
  mapOpportunityEvidence,
  mapOpportunityParticipation,
  mapOpportunityWorkAssessment,
  toOpportunityPayloadJson,
  workAssessmentScoresPayload,
  type ContributionOpportunity,
  type EvaluationDimension,
  type OpportunityApplicantIdentity,
  type OpportunityEvaluation,
  type OpportunityEvidence,
  type OpportunityParticipation,
  type OpportunityPayload,
  type OpportunityWorkAssessment,
  type OpportunityWorkAssessmentScores,
} from '@/lib/opportunities';

type DbClient = typeof supabase;
type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };
type OpportunityQuery = {
  select: (columns: string) => OpportunityQuery;
  eq: (column: string, value: unknown) => OpportunityQuery;
  in: (column: string, values: readonly unknown[]) => OpportunityQuery;
  order: (column: string, options?: { ascending: boolean }) => OpportunityQuery;
  maybeSingle: () => Promise<QueryResult>;
  then: (resolve: (value: QueryResult) => unknown) => Promise<unknown>;
};
type OpportunitiesClient = {
  from: (table: string) => OpportunityQuery;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: QueryError }>;
};

function db(client: DbClient): OpportunitiesClient {
  return client as unknown as OpportunitiesClient;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    return record ? [record] : [];
  });
}

function rpcErrorMessage(error: { message?: string } | null): string {
  const message = error?.message?.trim() || 'request_failed';
  const marker = message.split('\n')[0]?.trim() || message;
  return marker.replace(/^.*ERROR:\s*/i, '').split('CONTEXT:')[0].trim();
}

async function rpcId(
  name: string,
  args: Record<string, unknown>,
  client: DbClient,
): Promise<string> {
  const { data, error } = await db(client).rpc(name, args);
  if (error) {
    throw new Error(rpcErrorMessage(error));
  }
  if (typeof data === 'string' && data) return data;
  throw new Error('request_failed');
}

async function rpcVoid(
  name: string,
  args: Record<string, unknown>,
  client: DbClient,
): Promise<void> {
  const { error } = await db(client).rpc(name, args);
  if (error) {
    throw new Error(rpcErrorMessage(error));
  }
}

export async function listOpenOpportunities(
  client: DbClient = supabase,
): Promise<ContributionOpportunity[]> {
  const { data, error } = await db(client)
    .from('contribution_opportunities')
    .select('*').eq('is_demo', false)
    .eq('status', 'open')
    .eq('opportunity_kind', 'education_to_contribution')
    .order('created_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapContributionOpportunity(row));
}

export async function listManagedOpportunities(
  publisherProfileIds: readonly string[],
  client: DbClient = supabase,
): Promise<ContributionOpportunity[]> {
  if (publisherProfileIds.length === 0) return [];
  const { data, error } = await db(client)
    .from('contribution_opportunities')
    .select('*')
    .in('publisher_profile_id', publisherProfileIds)
    .eq('opportunity_kind', 'education_to_contribution')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapContributionOpportunity(row));
}

export async function getOpportunity(
  opportunityId: string,
  client: DbClient = supabase,
): Promise<ContributionOpportunity | null> {
  const { data, error } = await db(client)
    .from('contribution_opportunities')
    .select('*')
    .eq('id', opportunityId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapContributionOpportunity(row) : null;
}

export async function listOpportunitiesByIds(
  opportunityIds: readonly string[],
  client: DbClient = supabase,
): Promise<ContributionOpportunity[]> {
  if (opportunityIds.length === 0) return [];
  const { data, error } = await db(client)
    .from('contribution_opportunities')
    .select('*')
    .in('id', opportunityIds);
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapContributionOpportunity(row));
}

export async function listMyParticipations(
  profileId: string,
  client: DbClient = supabase,
): Promise<OpportunityParticipation[]> {
  const { data, error } = await db(client)
    .from('opportunity_participations')
    .select('*')
    .eq('participant_profile_id', profileId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapOpportunityParticipation(row));
}

export async function listOpportunityParticipations(
  opportunityId: string,
  client: DbClient = supabase,
): Promise<OpportunityParticipation[]> {
  const { data, error } = await db(client)
    .from('opportunity_participations')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('applied_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapOpportunityParticipation(row));
}

export async function getMyParticipation(
  opportunityId: string,
  profileId: string,
  client: DbClient = supabase,
): Promise<OpportunityParticipation | null> {
  const { data, error } = await db(client)
    .from('opportunity_participations')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .eq('participant_profile_id', profileId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapOpportunityParticipation(row) : null;
}

export async function listParticipationEvidence(
  participationId: string,
  client: DbClient = supabase,
): Promise<OpportunityEvidence[]> {
  const { data, error } = await db(client)
    .from('opportunity_participation_evidence')
    .select('*')
    .eq('participation_id', participationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapOpportunityEvidence(row));
}

export async function listParticipationEvaluations(
  participationId: string,
  client: DbClient = supabase,
): Promise<OpportunityEvaluation[]> {
  const { data, error } = await db(client)
    .from('opportunity_evaluations')
    .select('*')
    .eq('participation_id', participationId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapOpportunityEvaluation(row));
}

export async function listWorkAssessmentsForParticipations(
  participationIds: readonly string[],
  client: DbClient = supabase,
): Promise<OpportunityWorkAssessment[]> {
  if (participationIds.length === 0) return [];
  const { data, error } = await db(client)
    .from('opportunity_work_assessments')
    .select('*')
    .in('participation_id', participationIds);
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapOpportunityWorkAssessment(row));
}

export async function getOpportunityWorkAssessment(
  participationId: string,
  client: DbClient = supabase,
): Promise<OpportunityWorkAssessment | null> {
  const { data, error } = await db(client)
    .from('opportunity_work_assessments')
    .select('*')
    .eq('participation_id', participationId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapOpportunityWorkAssessment(row) : null;
}

export {
  listVerifiedDemonstratedExperience,
  listVerifiedSkillEvidenceForProfile,
} from '@/lib/opportunities-profile';

export async function listOpportunityApplicantIdentities(
  opportunityId: string,
  client: DbClient = supabase,
): Promise<OpportunityApplicantIdentity[]> {
  const { data, error } = await db(client).rpc('list_opportunity_applicant_identities', {
    p_opportunity_id: opportunityId,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapOpportunityApplicantIdentity(row));
}

export async function listOwnedLinkedProfileIds(
  ownerProfileId: string,
  client: DbClient = supabase,
): Promise<string[]> {
  const { data, error } = await db(client)
    .from('linked_accounts')
    .select('linked_profile_id')
    .eq('owner_profile_id', ownerProfileId);
  if (error) return [];
  return asRows(data)
    .map((row) => row.linked_profile_id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
}

export async function createContributionOpportunity(
  payload: OpportunityPayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('create_contribution_opportunity', { payload: toOpportunityPayloadJson(payload) }, client);
}

export async function updateContributionOpportunity(
  opportunityId: string,
  payload: OpportunityPayload,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'update_contribution_opportunity',
    { p_opportunity_id: opportunityId, payload: toOpportunityPayloadJson(payload) },
    client,
  );
}

export async function setContributionOpportunityStatus(
  opportunityId: string,
  status: 'draft' | 'open' | 'closed' | 'cancelled',
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'set_contribution_opportunity_status',
    { p_opportunity_id: opportunityId, p_status: status },
    client,
  );
}

export async function applyToContributionOpportunity(
  opportunityId: string,
  message: string,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId(
    'apply_to_contribution_opportunity',
    { p_opportunity_id: opportunityId, p_message: message },
    client,
  );
}

export async function withdrawOpportunityParticipation(
  participationId: string,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid('withdraw_opportunity_participation', { p_participation_id: participationId }, client);
}

export async function reviewOpportunityApplication(
  participationId: string,
  decision: 'accept' | 'decline',
  note?: string,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'review_opportunity_application',
    { p_participation_id: participationId, p_decision: decision, p_note: note ?? null },
    client,
  );
}

export async function startOpportunityWork(
  participationId: string,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid('start_opportunity_work', { p_participation_id: participationId }, client);
}

export async function addOpportunityEvidence(
  participationId: string,
  description: string,
  referenceUrl?: string,
  referenceLabel?: string,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId(
    'add_opportunity_evidence',
    {
      p_participation_id: participationId,
      p_description: description,
      p_reference_url: referenceUrl ?? null,
      p_reference_label: referenceLabel ?? null,
    },
    client,
  );
}

export async function submitOpportunityWork(
  participationId: string,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid('submit_opportunity_work', { p_participation_id: participationId }, client);
}

export async function evaluateOpportunityWork(
  args: {
    participationId: string;
    decision: 'verified' | 'rejected' | 'disputed';
    feedback?: string;
    qualityScore?: number | null;
    impactScore?: number | null;
    skillNames?: string[];
  },
  client: DbClient = supabase,
): Promise<string> {
  return rpcId(
    'evaluate_opportunity_work',
    {
      p_participation_id: args.participationId,
      p_decision: args.decision,
      p_feedback: args.feedback ?? null,
      p_quality_score: optionalEvaluationScore(args.qualityScore),
      p_impact_score: optionalEvaluationScore(args.impactScore),
      p_skill_names: args.skillNames ?? [],
    },
    client,
  );
}

function optionalEvaluationScore(value?: number | null): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error('invalid_evaluation_score');
  }
  return value;
}

export async function recordOpportunityWorkAssessment(
  args: {
    participationId: string;
    scores: OpportunityWorkAssessmentScores;
    dimensions: readonly EvaluationDimension[];
    notes?: string | null;
  },
  client: DbClient = supabase,
): Promise<string> {
  const payload = workAssessmentScoresPayload(args.scores, args.dimensions);
  for (const value of Object.values(payload)) {
    optionalEvaluationScore(value);
  }
  if (Object.keys(payload).length === 0 && !args.notes?.trim()) {
    throw new Error('evaluation_empty');
  }
  return rpcId(
    'record_opportunity_work_assessment',
    {
      p_participation_id: args.participationId,
      p_scores: payload,
      p_notes: args.notes?.trim() || null,
    },
    client,
  );
}
