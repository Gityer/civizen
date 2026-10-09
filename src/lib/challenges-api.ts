import { supabase } from '@/integrations/supabase/client';
import {
  mapChallengeProposal,
  mapChallengeProposalIdentity,
  mapCommunityChallenge,
  mapContributionProgram,
  mapImplementationProject,
  mapSolutionRecord,
  toChallengePayloadJson,
  toProgramPayloadJson,
  toProposalPayloadJson,
  type ChallengeProposalIdentity,
} from '@/lib/challenges-map';
import type {
  ChallengeOutcomePayload,
  ChallengePayload,
  ChallengeProposal,
  CommunityChallenge,
  ContributionProgram,
  ImplementationProject,
  ProgramPayload,
  ProposalPayload,
  SolutionRecord,
} from '@/lib/challenges';

export type { ChallengeProposalIdentity };

type DbClient = typeof supabase;
type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };
type ChallengeQuery = {
  select: (columns: string) => ChallengeQuery;
  eq: (column: string, value: unknown) => ChallengeQuery;
  in: (column: string, values: readonly unknown[]) => ChallengeQuery;
  not: (column: string, operator: string, value: unknown) => ChallengeQuery;
  order: (column: string, options?: { ascending: boolean }) => ChallengeQuery;
  maybeSingle: () => Promise<QueryResult>;
  then: (resolve: (value: QueryResult) => unknown) => Promise<unknown>;
};
type ChallengesClient = {
  from: (table: string) => ChallengeQuery;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: QueryError }>;
};

function db(client: DbClient): ChallengesClient {
  return client as unknown as ChallengesClient;
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
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data === 'string' && data) return data;
  throw new Error('request_failed');
}

async function rpcVoid(
  name: string,
  args: Record<string, unknown>,
  client: DbClient,
): Promise<void> {
  const { error } = await db(client).rpc(name, args);
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function listActivePrograms(client: DbClient = supabase): Promise<ContributionProgram[]> {
  const { data, error } = await db(client)
    .from('contribution_programs')
    .select('*').eq('is_demo', false)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapContributionProgram(row));
}

export async function listManagedPrograms(
  publisherProfileIds: readonly string[],
  client: DbClient = supabase,
): Promise<ContributionProgram[]> {
  if (publisherProfileIds.length === 0) return [];
  const { data, error } = await db(client)
    .from('contribution_programs')
    .select('*')
    .in('publisher_profile_id', publisherProfileIds)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapContributionProgram(row));
}

export async function listBrowsableChallenges(client: DbClient = supabase): Promise<CommunityChallenge[]> {
  const { data, error } = await db(client)
    .from('community_challenges')
    .select('*').eq('is_demo', false)
    .in('status', ['active', 'proposal_review', 'implementation', 'completed'])
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapCommunityChallenge(row));
}

export async function listManagedChallenges(
  publisherProfileIds: readonly string[],
  client: DbClient = supabase,
): Promise<CommunityChallenge[]> {
  if (publisherProfileIds.length === 0) return [];
  const { data, error } = await db(client)
    .from('community_challenges')
    .select('*')
    .in('publisher_profile_id', publisherProfileIds)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapCommunityChallenge(row));
}

export async function getCommunityChallenge(
  challengeId: string,
  client: DbClient = supabase,
): Promise<CommunityChallenge | null> {
  const { data, error } = await db(client)
    .from('community_challenges')
    .select('*')
    .eq('id', challengeId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapCommunityChallenge(row) : null;
}

export async function getContributionProgram(
  programId: string,
  client: DbClient = supabase,
): Promise<ContributionProgram | null> {
  const { data, error } = await db(client)
    .from('contribution_programs')
    .select('*')
    .eq('id', programId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapContributionProgram(row) : null;
}

export async function listChallengeProposals(
  challengeId: string,
  client: DbClient = supabase,
): Promise<ChallengeProposal[]> {
  const { data, error } = await db(client)
    .from('challenge_proposals')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapChallengeProposal(row));
}

export async function getMyChallengeProposal(
  challengeId: string,
  profileId: string,
  client: DbClient = supabase,
): Promise<ChallengeProposal | null> {
  const { data, error } = await db(client)
    .from('challenge_proposals')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('author_profile_id', profileId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapChallengeProposal(row) : null;
}

export async function getImplementationProjectForChallenge(
  challengeId: string,
  client: DbClient = supabase,
): Promise<ImplementationProject | null> {
  const { data, error } = await db(client)
    .from('implementation_projects')
    .select('*')
    .eq('challenge_id', challengeId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapImplementationProject(row) : null;
}

export async function getChallengeIdForProject(
  projectId: string,
  client: DbClient = supabase,
): Promise<string | null> {
  const { data, error } = await db(client)
    .from('implementation_projects').select('challenge_id').eq('id', projectId).maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const id = String(asRecord(data)?.challenge_id ?? '').trim();
  return id || null;
}

export async function getSolutionRecordForChallenge(
  challengeId: string,
  client: DbClient = supabase,
): Promise<SolutionRecord | null> {
  const { data, error } = await db(client)
    .from('solution_records')
    .select('*')
    .eq('challenge_id', challengeId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapSolutionRecord(row) : null;
}

export async function listProjectOpportunities(
  projectId: string,
  client: DbClient = supabase,
): Promise<{ id: string; title: string; status: string; summary: string }[]> {
  const { data, error } = await db(client)
    .from('contribution_opportunities')
    .select('*')
    .eq('implementation_project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => ({
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    status: String(row.status ?? 'draft'),
    summary: String(row.summary ?? ''),
  }));
}

export async function listUnlinkedCoordinatorOpportunities(
  publisherProfileIds: readonly string[],
  client: DbClient = supabase,
): Promise<{ id: string; title: string; status: string; summary: string }[]> {
  if (publisherProfileIds.length === 0) return [];
  const { data, error } = await db(client)
    .from('contribution_opportunities')
    .select('*')
    .in('publisher_profile_id', publisherProfileIds)
    .in('status', ['open', 'draft'])
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data)
    .filter((row) => !row.implementation_project_id)
    .map((row) => ({
      id: String(row.id ?? ''),
      title: String(row.title ?? ''),
      status: String(row.status ?? 'draft'),
      summary: String(row.summary ?? ''),
    }));
}

export async function listChallengeProposalIdentities(
  challengeId: string,
  client: DbClient = supabase,
): Promise<ChallengeProposalIdentity[]> {
  const { data, error } = await db(client).rpc('list_challenge_proposal_identities', {
    p_challenge_id: challengeId,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapChallengeProposalIdentity(row));
}

export async function createContributionProgram(
  payload: ProgramPayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('create_contribution_program', { payload: toProgramPayloadJson(payload) }, client);
}

export async function createCommunityChallenge(
  payload: ChallengePayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('create_community_challenge', { payload: toChallengePayloadJson(payload) }, client);
}

export async function updateCommunityChallenge(
  challengeId: string,
  payload: ChallengePayload,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'update_community_challenge',
    { p_challenge_id: challengeId, payload: toChallengePayloadJson(payload) },
    client,
  );
}

export async function setCommunityChallengeStatus(
  challengeId: string,
  status: 'draft' | 'active' | 'proposal_review' | 'cancelled',
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'set_community_challenge_status',
    { p_challenge_id: challengeId, p_status: status },
    client,
  );
}

export async function submitChallengeProposal(
  challengeId: string,
  payload: ProposalPayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId(
    'submit_challenge_proposal',
    { p_challenge_id: challengeId, payload: toProposalPayloadJson(payload) },
    client,
  );
}

export async function selectChallengeProposal(
  proposalId: string,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('select_challenge_proposal', { p_proposal_id: proposalId }, client);
}

export async function recordChallengeOutcome(
  challengeId: string,
  payload: ChallengeOutcomePayload,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'record_challenge_outcome',
    {
      p_challenge_id: challengeId,
      payload: {
        outcome_summary: payload.outcomeSummary,
        outcome_evidence: payload.outcomeEvidence ?? null,
        success_criteria_result: payload.successCriteriaResult ?? null,
        lessons_learned: payload.lessonsLearned ?? null,
      },
    },
    client,
  );
}

export async function completeCommunityChallenge(
  challengeId: string,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('complete_community_challenge', { p_challenge_id: challengeId }, client);
}

export async function createImplementationOpportunity(
  projectId: string,
  payload: { title: string; summary: string; estimatedEffort?: string | null },
  client: DbClient = supabase,
): Promise<string> {
  return rpcId(
    'create_implementation_opportunity',
    {
      p_project_id: projectId,
      payload: {
        title: payload.title,
        summary: payload.summary,
        estimated_effort: payload.estimatedEffort ?? null,
      },
    },
    client,
  );
}

export async function linkImplementationOpportunity(
  projectId: string,
  opportunityId: string,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'link_implementation_opportunity',
    { p_project_id: projectId, p_opportunity_id: opportunityId },
    client,
  );
}
