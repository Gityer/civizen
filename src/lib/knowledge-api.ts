import { supabase } from '@/integrations/supabase/client';
import type {
  GapChallengePayload,
  GapOpportunityPayload,
  GapResolutionPayload,
  KnowledgeGap,
  KnowledgeGapPayload,
  KnowledgeResource,
  KnowledgeResourcePayload,
  KnowledgeSpace,
  KnowledgeSpacePayload,
  KnowledgeAttributionIdentity,
} from '@/lib/knowledge';
import {
  mapKnowledgeAttributionIdentity,
  mapKnowledgeGap,
  mapKnowledgeResource,
  mapKnowledgeSpace,
  toGapPayloadJson,
  toResourcePayloadJson,
  toSpacePayloadJson,
} from '@/lib/knowledge-map';

type DbClient = typeof supabase;
type QueryError = { message?: string } | null;
type QueryResult = { data: unknown; error: QueryError };
type KnowledgeQuery = {
  select: (columns: string) => KnowledgeQuery;
  eq: (column: string, value: unknown) => KnowledgeQuery;
  in: (column: string, values: readonly unknown[]) => KnowledgeQuery;
  not: (column: string, operator: string, value: unknown) => KnowledgeQuery;
  is: (column: string, value: unknown) => KnowledgeQuery;
  order: (column: string, options?: { ascending: boolean }) => KnowledgeQuery;
  maybeSingle: () => Promise<QueryResult>;
  then: (resolve: (value: QueryResult) => unknown) => Promise<unknown>;
};
type KnowledgeClient = {
  from: (table: string) => KnowledgeQuery;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: QueryError }>;
};

function db(client: DbClient): KnowledgeClient {
  return client as unknown as KnowledgeClient;
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

async function rpcId(name: string, args: Record<string, unknown>, client: DbClient): Promise<string> {
  const { data, error } = await db(client).rpc(name, args);
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data === 'string' && data) return data;
  throw new Error('request_failed');
}

async function rpcVoid(name: string, args: Record<string, unknown>, client: DbClient): Promise<void> {
  const { error } = await db(client).rpc(name, args);
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function listBrowsableKnowledgeSpaces(client: DbClient = supabase): Promise<KnowledgeSpace[]> {
  const { data, error } = await db(client)
    .from('knowledge_spaces')
    .select('*').eq('is_demo', false)
    .in('status', ['shared'])
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapKnowledgeSpace(row));
}

export async function listManagedKnowledgeSpaces(
  publisherProfileIds: readonly string[],
  client: DbClient = supabase,
): Promise<KnowledgeSpace[]> {
  if (publisherProfileIds.length === 0) return [];
  const { data, error } = await db(client)
    .from('knowledge_spaces')
    .select('*')
    .in('publisher_profile_id', publisherProfileIds)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapKnowledgeSpace(row));
}

export async function getKnowledgeSpace(
  spaceId: string,
  client: DbClient = supabase,
): Promise<KnowledgeSpace | null> {
  const { data, error } = await db(client).from('knowledge_spaces').select('*').eq('id', spaceId).maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapKnowledgeSpace(row) : null;
}

export async function listKnowledgeResources(
  spaceId: string,
  client: DbClient = supabase,
): Promise<KnowledgeResource[]> {
  const { data, error } = await db(client)
    .from('knowledge_resources')
    .select('*')
    .eq('space_id', spaceId)
    .order('pathway_order', { ascending: true });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapKnowledgeResource(row));
}

export async function getKnowledgeResource(
  resourceId: string,
  client: DbClient = supabase,
): Promise<KnowledgeResource | null> {
  const { data, error } = await db(client)
    .from('knowledge_resources')
    .select('*')
    .eq('id', resourceId)
    .maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapKnowledgeResource(row) : null;
}

export async function listKnowledgeGaps(spaceId: string, client: DbClient = supabase): Promise<KnowledgeGap[]> {
  const { data, error } = await db(client)
    .from('knowledge_gaps')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapKnowledgeGap(row));
}

export async function getKnowledgeGap(gapId: string, client: DbClient = supabase): Promise<KnowledgeGap | null> {
  const { data, error } = await db(client).from('knowledge_gaps').select('*').eq('id', gapId).maybeSingle();
  if (error) throw new Error(rpcErrorMessage(error));
  const row = asRecord(data);
  return row ? mapKnowledgeGap(row) : null;
}

export async function listResourceAttributionIdentities(
  resourceId: string,
  client: DbClient = supabase,
): Promise<KnowledgeAttributionIdentity[]> {
  const { data, error } = await db(client).rpc('list_knowledge_resource_attribution_identities', {
    p_resource_id: resourceId,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => mapKnowledgeAttributionIdentity(row));
}

export async function listManagedSolutionRecords(
  publisherProfileIds: readonly string[],
  client: DbClient = supabase,
): Promise<{ id: string; title: string; knowledgeResourceId: string | null }[]> {
  if (publisherProfileIds.length === 0) return [];
  const { data, error } = await db(client)
    .from('solution_records')
    .select('*')
    .in('publisher_profile_id', publisherProfileIds)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map((row) => ({
    id: String(row.id ?? ''),
    title: String(row.implemented_solution ?? row.problem_context ?? ''),
    knowledgeResourceId: typeof row.knowledge_resource_id === 'string' ? row.knowledge_resource_id : null,
  }));
}

export async function createKnowledgeSpace(
  payload: KnowledgeSpacePayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('create_knowledge_space', { payload: toSpacePayloadJson(payload) }, client);
}

export async function updateKnowledgeSpace(
  spaceId: string,
  payload: KnowledgeSpacePayload,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid('update_knowledge_space', { p_space_id: spaceId, payload: toSpacePayloadJson(payload) }, client);
}

export async function setKnowledgeSpaceStatus(
  spaceId: string,
  status: 'draft' | 'shared' | 'archived',
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid('set_knowledge_space_status', { p_space_id: spaceId, p_status: status }, client);
}

export async function createKnowledgeResource(
  payload: KnowledgeResourcePayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('create_knowledge_resource', { payload: toResourcePayloadJson(payload) }, client);
}

export async function updateKnowledgeResource(
  resourceId: string,
  payload: KnowledgeResourcePayload,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'update_knowledge_resource',
    { p_resource_id: resourceId, payload: toResourcePayloadJson(payload) },
    client,
  );
}

export async function setKnowledgeResourceStatus(
  resourceId: string,
  status: 'draft' | 'shared' | 'reviewed',
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid('set_knowledge_resource_status', { p_resource_id: resourceId, p_status: status }, client);
}

/** A member proposes a resource for the space's coordinators to review (lands as a draft). */
export async function proposeKnowledgeResource(
  input: { spaceId: string; title: string; summary: string; externalUrl?: string | null; resourceType?: string },
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('propose_knowledge_resource', {
    payload: { space_id: input.spaceId, title: input.title, summary: input.summary, external_url: input.externalUrl ?? null, resource_type: input.resourceType ?? 'other' },
  }, client);
}

/** A member reports a gap in a space they can read. */
export async function proposeKnowledgeGap(
  input: { spaceId: string; title: string; description: string; gapKind?: string },
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('propose_knowledge_gap', {
    payload: { space_id: input.spaceId, title: input.title, description: input.description, gap_kind: input.gapKind ?? 'missing' },
  }, client);
}

export async function createKnowledgeGap(
  payload: KnowledgeGapPayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId('create_knowledge_gap', { payload: toGapPayloadJson(payload) }, client);
}

export async function convertGapToOpportunity(
  gapId: string,
  payload: GapOpportunityPayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId(
    'convert_knowledge_gap_to_opportunity',
    {
      p_gap_id: gapId,
      payload: {
        title: payload.title,
        summary: payload.summary,
        estimated_effort: payload.estimatedEffort ?? null,
      },
    },
    client,
  );
}

export async function convertGapToChallenge(
  gapId: string,
  payload: GapChallengePayload,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId(
    'convert_knowledge_gap_to_challenge',
    {
      p_gap_id: gapId,
      payload: {
        title: payload.title,
        problem_statement: payload.problemStatement,
        why_it_matters: payload.whyItMatters,
        success_criteria: payload.successCriteria,
      },
    },
    client,
  );
}

export async function resolveKnowledgeGap(
  gapId: string,
  payload: GapResolutionPayload,
  client: DbClient = supabase,
): Promise<void> {
  await rpcVoid(
    'resolve_knowledge_gap',
    {
      p_gap_id: gapId,
      payload: {
        status: payload.status,
        result_resource_id: payload.resultResourceId ?? null,
        result_solution_record_id: payload.resultSolutionRecordId ?? null,
        resolution_notes: payload.resolutionNotes ?? null,
      },
    },
    client,
  );
}

export async function publishSolutionRecordAsResource(
  solutionId: string,
  spaceId: string,
  client: DbClient = supabase,
): Promise<string> {
  return rpcId(
    'publish_solution_record_as_resource',
    { p_solution_id: solutionId, p_space_id: spaceId },
    client,
  );
}
