import { supabase } from '@/integrations/supabase/client';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { parseSearchDirectoryPayload } from '@/lib/search-directory';
import { type FormalActionType, type Matter, type MatterActorKind, type MatterListRow, type MatterQueue, type MatterType, type MatterVisibility, type ReopenReason } from '@/lib/matters';
import { type DbClient, asRecord, asRows, db, rpcErrorMessage, str } from '@/lib/matters-api-core';
import { type MatterDetailBundle, mapAction, mapAttachment, mapComment, mapEvent, mapListBundle, mapMatter, mapParty } from '@/lib/matters-api-mappers';
import { mapAgentArtifact, mapAgentAssignment, mapAgentRun, mapAiAgent, mapCodingWorkspace, mapDecision, mapEvaluation, mapOutcomeFollowup, mapPatternCounts, mapResolution, mapResponsibility, mapTask } from '@/lib/matters-api-mappers-work';

export type CreateMatterInput = {
  title: string;
  description: string;
  matterType: MatterType;
  initiatorKind: MatterActorKind;
  initiatorProfileId: string;
  initiatorUnitLabel?: string | null;
  addresseeKind: MatterActorKind;
  addresseeProfileId: string;
  addresseeUnitLabel?: string | null;
  visibility: MatterVisibility;
  areaNodeId?: string | null;
  scopeKind?: Matter['scopeKind'];
  scopeCountryCode?: string | null;
  scopeRegionCode?: string | null;
  scopeLocalityCode?: string | null;
  evidenceUrl?: string | null;
  evidenceLabel?: string | null;
  submit?: boolean;
};

export type MatterActorSuggestion = {
  profileId: string;
  displayName: string;
  subtitle?: string;
  kind: 'person' | 'organization';
};

export async function resolveOfficialCivizenMatterActor(
  client: DbClient = supabase,
): Promise<MatterActorSuggestion | null> {
  const { data, error } = await db(client).rpc('resolve_civizen_org_profile');
  if (error || typeof data !== 'string' || !data) return null;
  const { data: profile } = await db(client)
    .from('profiles')
    .select('id, full_name, username')
    .in('id', [data]);
  const row = asRows(profile)[0];
  return {
    profileId: data,
    displayName: str(row?.full_name || row?.username) || 'Civizen',
    kind: 'organization',
  };
}

export async function searchMatterActors(
  query: string,
  excludeProfileId?: string | null,
  client: DbClient = supabase,
): Promise<MatterActorSuggestion[]> {
  const needle = query.trim();
  if (needle.length < 2) return [];
  const { data, error } = await db(client).rpc('search_civizen_directory', {
    p_query: needle,
    p_exclude_profile_id: excludeProfileId ?? null,
    p_limit: 8,
  });
  if (error) return [];
  const parsed = parseSearchDirectoryPayload(data);
  const companies: MatterActorSuggestion[] = parsed.companies.map((company) => ({
    profileId: company.profile_id,
    displayName: company.profile.full_name || company.business_name_normalized || company.profile.username || 'Organization',
    subtitle: company.profile.username || undefined,
    kind: 'organization',
  }));
  const people: MatterActorSuggestion[] = parsed.people.map((person) => ({
    profileId: person.id,
    displayName: person.full_name || person.username || 'Member',
    subtitle: person.username || undefined,
    kind: 'person',
  }));
  return [...companies, ...people].slice(0, 8);
}

export async function listManagedMatterActors(
  ownerProfileId: string,
  client: DbClient = supabase,
): Promise<MatterActorSuggestion[]> {
  const ids = await listOwnedLinkedProfileIds(ownerProfileId, client);
  if (ids.length === 0) return [];
  const { data, error } = await db(client)
    .from('profiles')
    .select('id, full_name, username')
    .in('id', ids);
  if (error) {
    return ids.map((id) => ({ profileId: id, displayName: 'Organization', kind: 'organization' as const }));
  }
  return asRows(data).map((row) => ({
    profileId: str(row.id),
    displayName: str(row.full_name || row.username) || 'Organization',
    kind: 'organization' as const,
  }));
}

export async function createMatterRecord(
  input: CreateMatterInput,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('create_matter', {
    payload: {
      title: input.title,
      description: input.description,
      matter_type: input.matterType,
      initiator_kind: input.initiatorKind,
      initiator_profile_id: input.initiatorProfileId,
      initiator_unit_label: input.initiatorUnitLabel ?? null,
      addressee_kind: input.addresseeKind,
      addressee_profile_id: input.addresseeProfileId,
      addressee_unit_label: input.addresseeUnitLabel ?? null,
      visibility: input.visibility,
      area_node_id: input.areaNodeId ?? null,
      scope_kind: input.scopeKind ?? 'global',
      scope_country_code: input.scopeKind === 'global' || !input.scopeKind ? null : input.scopeCountryCode ?? null,
      scope_region_code:
        input.scopeKind === 'region' || input.scopeKind === 'locality'
          ? input.scopeRegionCode ?? null
          : null,
      scope_locality_code: input.scopeKind === 'locality' ? input.scopeLocalityCode ?? null : null,
      evidence_url: input.evidenceUrl ?? null,
      evidence_label: input.evidenceLabel ?? null,
      submit: input.submit !== false,
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string' || !data) throw new Error('Could not create the Matter.');
  return data;
}

export async function listMatters(
  queue: MatterQueue,
  viewerProfileId: string,
  managedOrganizationIds: readonly string[] = [],
  client: DbClient = supabase,
): Promise<MatterListRow[]> {
  const { data, error } = await db(client).rpc('list_matters', { p_queue: queue });
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data)
    .map((row) => mapListBundle(row, viewerProfileId, managedOrganizationIds))
    .filter((row): row is MatterListRow => Boolean(row));
}

export async function getMatterDetail(
  matterId: string,
  client: DbClient = supabase,
): Promise<MatterDetailBundle | null> {
  const { data, error } = await db(client).rpc('get_matter', { p_matter_id: matterId });
  if (error) throw new Error(rpcErrorMessage(error));
  const record = asRecord(data);
  const matterRow = asRecord(record?.matter);
  if (!matterRow) return null;
  const listed = mapListBundle(record, '', []);
  const { data: workspaceRows } = await db(client)
    .from('matter_coding_workspaces')
    .select('id, assignment_id, run_id, base_commit_sha, workspace_ref, primary_dirty_summary, status')
    .eq('matter_id', matterId);
  return {
    matter: mapMatter(matterRow),
    currentAction: mapAction(asRecord(record?.current_action)),
    pendingActions: listed?.pendingActions ?? [],
    comments: asRows(record?.comments).map(mapComment),
    events: asRows(record?.events).map(mapEvent),
    parties: asRows(record?.parties).map(mapParty),
    attachments: asRows(record?.attachments).map(mapAttachment),
    tasks: asRows(record?.tasks).map(mapTask),
    decisions: asRows(record?.decisions).map(mapDecision),
    responsibilities: asRows(record?.responsibilities).map(mapResponsibility),
    workSummary: listed?.workSummary ?? null,
    resolutions: asRows(record?.resolutions).map(mapResolution),
    evaluations: asRows(record?.evaluations).map(mapEvaluation),
    outcomeFollowups: asRows(record?.outcome_followups).map(mapOutcomeFollowup),
    patternCounts: mapPatternCounts(record?.pattern_counts),
    agentAssignments: asRows(record?.agent_assignments).map(mapAgentAssignment),
    agentRuns: asRows(record?.agent_runs).map(mapAgentRun),
    agentArtifacts: asRows(record?.agent_artifacts).map(mapAgentArtifact),
    aiAgents: asRows(record?.ai_agents).map(mapAiAgent),
    codingWorkspaces: asRows(workspaceRows).map(mapCodingWorkspace),
  };
}

export async function addMatterComment(
  matterId: string,
  body: string,
  options?: { parentId?: string | null; authorKind?: MatterActorKind; mentionedProfileIds?: string[]; taskId?: string | null },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('add_matter_comment', {
    p_matter_id: matterId,
    p_body: body,
    p_parent_id: options?.parentId ?? null,
    p_author_kind: options?.authorKind ?? 'person',
    p_mentioned_profile_ids: options?.mentionedProfileIds ?? [],
    p_task_id: options?.taskId ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function performMatterFormalAction(
  matterId: string,
  action: FormalActionType,
  options?: {
    message?: string;
    targetKind?: MatterActorKind;
    targetProfileId?: string;
    targetUnitLabel?: string | null;
    reopenReason?: ReopenReason;
    actorKind?: MatterActorKind;
  },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('perform_matter_formal_action', {
    p_matter_id: matterId,
    p_action: action,
    p_message: options?.message ?? null,
    p_target_kind: options?.targetKind ?? null,
    p_target_profile_id: options?.targetProfileId ?? null,
    p_target_unit_label: options?.targetUnitLabel ?? null,
    p_reopen_reason: options?.reopenReason ?? null,
    p_actor_kind: options?.actorKind ?? 'person',
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function addMatterAttachmentRecord(
  matterId: string,
  params: {
    kind: 'file' | 'url';
    filePath?: string | null;
    fileName?: string | null;
    contentType?: string | null;
    byteSize?: number | null;
    url?: string | null;
    label?: string | null;
  },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('add_matter_attachment', {
    p_matter_id: matterId,
    p_kind: params.kind,
    p_file_path: params.filePath ?? null,
    p_file_name: params.fileName ?? null,
    p_content_type: params.contentType ?? null,
    p_byte_size: params.byteSize ?? null,
    p_url: params.url ?? null,
    p_label: params.label ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function uploadMatterFile(
  matterId: string,
  file: File,
  client: DbClient = supabase,
): Promise<{ path: string; name: string }> {
  const safeName = file.name.replace(/[^\w.-]+/g, '_');
  const path = `${matterId}/${Date.now()}-${safeName}`;
  const { error } = await db(client).storage.from('matter-files').upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message || 'Could not upload the file.');
  await addMatterAttachmentRecord(matterId, {
    kind: 'file',
    filePath: path,
    fileName: file.name,
    contentType: file.type || null,
    byteSize: file.size,
  }, client);
  return { path, name: file.name };
}
