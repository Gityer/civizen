import { supabase } from '@/integrations/supabase/client';
import { type MatterActorKind } from '@/lib/matters';
import { type DbClient, db, rpcErrorMessage } from '@/lib/matters-api-core';

export async function startMatterCollaborativeWork(matterId: string, client: DbClient = supabase): Promise<void> {
  const { error } = await db(client).rpc('start_matter_collaborative_work', { p_matter_id: matterId });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function inviteMatterParticipant(
  matterId: string,
  input: { role: string; kind: MatterActorKind; profileId: string; unitLabel?: string | null },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('invite_matter_participant', {
    p_matter_id: matterId,
    p_role: input.role,
    p_kind: input.kind,
    p_profile_id: input.profileId,
    p_unit_label: input.unitLabel ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function createCollaborationTask(
  input: {
    matterId: string;
    title: string;
    description?: string;
    assigneeKind?: MatterActorKind;
    assigneeProfileId?: string;
    reviewerKind?: MatterActorKind;
    reviewerProfileId?: string;
    reviewRequired?: boolean;
    parentTaskId?: string | null;
    dependsOn?: string[];
  },
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('create_collaboration_task', {
    payload: {
      matter_id: input.matterId,
      title: input.title,
      description: input.description ?? null,
      assignee_kind: input.assigneeKind ?? 'person',
      assignee_profile_id: input.assigneeProfileId ?? null,
      reviewer_kind: input.reviewerKind ?? 'person',
      reviewer_profile_id: input.reviewerProfileId ?? null,
      review_required: input.reviewRequired ?? false,
      parent_task_id: input.parentTaskId ?? null,
      depends_on: input.dependsOn ?? [],
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string' || !data) throw new Error('Could not create the Task.');
  return data;
}

export async function performCollaborationAction(
  actionId: string,
  action: string,
  options?: { message?: string; targetKind?: MatterActorKind; targetProfileId?: string },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('perform_collaboration_action', {
    p_action_id: actionId,
    p_action: action,
    p_message: options?.message ?? null,
    p_target_kind: options?.targetKind ?? null,
    p_target_profile_id: options?.targetProfileId ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function proposeMatterDecision(
  input: { matterId: string; title: string; statement: string; rationale?: string; taskIds?: string[] },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('propose_matter_decision', {
    payload: {
      matter_id: input.matterId,
      title: input.title,
      statement: input.statement,
      rationale: input.rationale ?? null,
      task_ids: input.taskIds ?? [],
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function completeMatterCollaborativeWork(
  matterId: string,
  options?: { allowOutstanding?: boolean; reason?: string },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('complete_matter_collaborative_work', {
    p_matter_id: matterId,
    p_allow_outstanding: options?.allowOutstanding ?? false,
    p_reason: options?.reason ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function addTaskEvidence(
  matterId: string,
  taskId: string,
  params: { kind?: 'file' | 'url' | 'text'; url?: string; label?: string; bodyText?: string; filePath?: string; fileName?: string },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('add_matter_attachment', {
    p_matter_id: matterId,
    p_kind: params.kind ?? (params.url ? 'url' : params.bodyText ? 'text' : 'file'),
    p_url: params.url ?? null,
    p_label: params.label ?? null,
    p_body_text: params.bodyText ?? null,
    p_file_path: params.filePath ?? null,
    p_file_name: params.fileName ?? null,
    p_task_id: taskId,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function proposeMatterResolution(
  input: {
    matterId: string;
    resolutionKind: string;
    summary: string;
    actionsTaken?: string;
    limitations?: string;
    responsiblePartyPosition?: string;
  },
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('propose_matter_resolution', {
    payload: {
      matter_id: input.matterId,
      resolution_kind: input.resolutionKind,
      summary: input.summary,
      actions_taken: input.actionsTaken ?? null,
      limitations: input.limitations ?? null,
      responsible_party_position: input.responsiblePartyPosition ?? null,
    },
  });
  if (error || typeof data !== 'string') throw new Error(rpcErrorMessage(error));
  return data;
}

export async function performResolutionReview(
  actionId: string,
  action: string,
  options?: {
    message?: string;
    followUpChoice?: 'continue' | 'follow_up';
    followUpTitle?: string;
    followUpDescription?: string;
  },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('perform_resolution_review', {
    p_action_id: actionId,
    p_action: action,
    p_message: options?.message ?? null,
    p_follow_up_choice: options?.followUpChoice ?? null,
    p_follow_up_title: options?.followUpTitle ?? null,
    p_follow_up_description: options?.followUpDescription ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function submitMatterEvaluation(
  input: {
    matterId: string;
    resolutionId?: string | null;
    evaluatorRole: string;
    dimension: string;
    rating: string;
    comment?: string;
    visibility?: string;
  },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('submit_matter_evaluation', {
    payload: {
      matter_id: input.matterId,
      resolution_id: input.resolutionId ?? null,
      evaluator_role: input.evaluatorRole,
      dimension: input.dimension,
      rating: input.rating,
      comment: input.comment ?? null,
      visibility: input.visibility ?? 'participants',
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function scheduleMatterOutcomeFollowup(
  input: {
    matterId: string;
    resolutionId?: string | null;
    daysUntilReview?: number;
    outcomeQuestion?: string;
    targetIndicator?: string;
    reviewerKind?: string;
    reviewerProfileId?: string;
  },
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('schedule_matter_outcome_followup', {
    payload: {
      matter_id: input.matterId,
      resolution_id: input.resolutionId ?? null,
      days_until_review: input.daysUntilReview ?? 30,
      outcome_question: input.outcomeQuestion ?? null,
      target_indicator: input.targetIndicator ?? null,
      reviewer_kind: input.reviewerKind ?? 'person',
      reviewer_profile_id: input.reviewerProfileId ?? null,
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function performOutcomeFollowup(
  actionId: string,
  result: string,
  notes?: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('perform_outcome_followup', {
    p_action_id: actionId,
    p_result: result,
    p_notes: notes ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}
