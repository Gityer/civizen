import { buildBallIsWithCopy, deriveMatterStatus, isMatterLifecycle, isMatterType, isMatterVisibility, type ActionRequirementStatus, type ActionRequirementType, type CloseKind, type FormalActionType, type Matter, type MatterActionRequirement, type MatterAttachment, type MatterComment, type MatterEvent, type MatterListRow, type MatterParty, type MatterType, type MatterVisibility, type TimeoutBehavior } from '@/lib/matters';
import type { AiAgent, AiAgentRun, MatterAgentArtifact, MatterAgentAssignment } from '@/lib/matters-ai';
import type { MatterEvaluation, MatterOutcomeFollowup, MatterPatternCounts, MatterResolution } from '@/lib/matters-resolution';
import type { CollaborationTask, MatterDecision, MatterResponsibility } from '@/lib/matters-work';
import { actorFrom, asRecord, asRows, str, strOrNull } from '@/lib/matters-api-core';

export function mapMatter(row: Record<string, unknown>): Matter {
  const matterType = isMatterType(str(row.matter_type)) ? (row.matter_type as MatterType) : 'other';
  const lifecycle = isMatterLifecycle(str(row.lifecycle_status))
    ? (row.lifecycle_status as Matter['lifecycleStatus'])
    : 'draft';
  const visibility = isMatterVisibility(str(row.visibility))
    ? (row.visibility as MatterVisibility)
    : 'participants';
  const scopeRaw = str(row.scope_kind).toLowerCase();
  const scopeKind: Matter['scopeKind'] =
    scopeRaw === 'country' || scopeRaw === 'region' || scopeRaw === 'locality' ? scopeRaw : 'global';
  return {
    id: str(row.id),
    title: str(row.title),
    description: str(row.description),
    matterType,
    lifecycleStatus: lifecycle,
    visibility,
    areaNodeId: strOrNull(row.area_node_id),
    scopeKind,
    scopeCountryCode: strOrNull(row.scope_country_code),
    scopeRegionCode: strOrNull(row.scope_region_code),
    scopeLocalityCode: strOrNull(row.scope_locality_code),
    initiator: actorFrom(
      row.initiator_kind,
      row.initiator_profile_id,
      row.initiator_unit_label,
      row.initiator_display_name,
    ),
    addressee: actorFrom(
      row.addressee_kind,
      row.addressee_profile_id,
      row.addressee_unit_label,
      row.addressee_display_name,
    ),
    responsible: actorFrom(
      row.responsible_kind,
      row.responsible_profile_id,
      row.responsible_unit_label,
      row.responsible_display_name,
    ),
    currentActionId: strOrNull(row.current_action_id),
    waitingCondition: strOrNull(row.waiting_condition),
    closeKind: strOrNull(row.close_kind) as CloseKind | null,
    closeReason: strOrNull(row.close_reason),
    createdByProfileId: str(row.created_by_profile_id),
    createdAt: str(row.created_at),
    submittedAt: strOrNull(row.submitted_at),
    closedAt: strOrNull(row.closed_at),
    lastReopenedAt: strOrNull(row.last_reopened_at),
    reopenCount: Number(row.reopen_count) || 0,
    updatedAt: str(row.updated_at),
    collaborativeWorkStartedAt: strOrNull(row.collaborative_work_started_at),
    collaborativeWorkCompletedAt: strOrNull(row.collaborative_work_completed_at),
    collaborativeWorkCompletionKind:
      str(row.collaborative_work_completion_kind) === 'with_outstanding_work' ? 'with_outstanding_work'
        : str(row.collaborative_work_completion_kind) === 'normal' ? 'normal'
          : null,
    collaborativeWorkCompletionReason: strOrNull(row.collaborative_work_completion_reason),
    latestResolutionId: strOrNull(row.latest_resolution_id),
    resolutionAttemptCount: Number(row.resolution_attempt_count) || 0,
  };
}

export function mapAction(row: Record<string, unknown> | null): MatterActionRequirement | null {
  if (!row) return null;
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    actionType: str(row.action_type) as ActionRequirementType,
    assignedActor: actorFrom(
      row.assigned_kind,
      row.assigned_profile_id,
      row.assigned_unit_label,
      row.assigned_display_name ?? row.agent_display_name,
      row.assigned_agent_id,
    ),
    createdAt: str(row.created_at),
    dueAt: str(row.due_at),
    reminderAt: str(row.reminder_at),
    timingPolicyId: str(row.timing_policy_id),
    status: str(row.status) as ActionRequirementStatus,
    completedAt: strOrNull(row.completed_at),
    completedBy: row.completed_by_profile_id
      ? actorFrom(row.completed_by_kind, row.completed_by_profile_id, null, null)
      : null,
    completionAction: strOrNull(row.completion_action) as FormalActionType | null,
    timeoutAction: str(row.timeout_action) as TimeoutBehavior,
    escalationPolicyId: strOrNull(row.escalation_policy_id),
    contextKind:
      str(row.context_kind) === 'task' || str(row.context_kind) === 'decision' || str(row.context_kind) === 'responsibility'
        || str(row.context_kind) === 'resolution' || str(row.context_kind) === 'outcome'
        ? (str(row.context_kind) as MatterActionRequirement['contextKind'])
        : 'matter',
    contextId: strOrNull(row.context_id),
    taskTitle: strOrNull(row.task_title),
    resolutionId: strOrNull(row.resolution_id),
  };
}

export function mapListBundle(
  value: unknown,
  viewerProfileId: string,
  managedOrganizationIds: readonly string[],
): MatterListRow | null {
  const record = asRecord(value);
  if (!record) return null;
  const matterRow = asRecord(record.matter);
  if (!matterRow) return null;
  const matter = mapMatter(matterRow);
  const currentAction = mapAction(asRecord(record.current_action));
  const pendingActions = asRows(record.pending_actions).map((row) => mapAction(row)).filter((row): row is NonNullable<typeof row> => Boolean(row));
  const workRow = asRecord(record.work_summary);
  const workSummary: MatterListRow['workSummary'] = workRow
    ? {
        started: Boolean(workRow.started),
        completed: Boolean(workRow.completed),
        completionKind:
          str(workRow.completion_kind) === 'with_outstanding_work' ? 'with_outstanding_work'
            : str(workRow.completion_kind) === 'normal' ? 'normal'
              : null,
        total: Number(workRow.total) || 0,
        completedTasks: Number(workRow.completed_tasks) || 0,
        blocked: Number(workRow.blocked) || 0,
        open: Number(workRow.open) || 0,
        outstanding: Number(workRow.outstanding) || Number(workRow.open) || 0,
        outstandingTasks: asRows(workRow.outstanding_tasks).map((row) => ({
          id: str(row.id),
          title: str(row.title),
          status: str(row.status),
        })),
      }
    : null;
  return {
    matter,
    currentAction,
    pendingActions,
    derivedStatus: deriveMatterStatus(matter, currentAction),
    ball: buildBallIsWithCopy({
      matter,
      action: currentAction,
      viewerProfileId,
      managedOrganizationIds,
    }),
    workSummary,
  };
}

export type MatterDetailBundle = {
  matter: Matter;
  currentAction: MatterActionRequirement | null;
  pendingActions: MatterActionRequirement[];
  comments: MatterComment[];
  events: MatterEvent[];
  parties: MatterParty[];
  attachments: MatterAttachment[];
  tasks: CollaborationTask[];
  decisions: MatterDecision[];
  responsibilities: MatterResponsibility[];
  workSummary: MatterListRow['workSummary'];
  resolutions: MatterResolution[];
  evaluations: MatterEvaluation[];
  outcomeFollowups: MatterOutcomeFollowup[];
  patternCounts: MatterPatternCounts | null;
  agentAssignments: MatterAgentAssignment[];
  agentRuns: AiAgentRun[];
  agentArtifacts: MatterAgentArtifact[];
  aiAgents: AiAgent[];
  codingWorkspaces: MatterCodingWorkspace[];
};

export type MatterCodingWorkspace = {
  id: string;
  assignmentId: string;
  runId: string;
  baseCommitSha: string;
  workspaceRef: string;
  primaryDirtySummary: string | null;
  status: string;
};

export function mapComment(row: Record<string, unknown>): MatterComment {
  const mentioned = Array.isArray(row.mentioned_profile_ids)
    ? row.mentioned_profile_ids.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    parentId: strOrNull(row.parent_id),
    author: actorFrom(
      row.author_kind,
      row.author_profile_id,
      null,
      row.author_display_name ?? row.agent_display_name,
      row.agent_id,
    ),
    body: str(row.body),
    mentionedProfileIds: mentioned,
    visibility: strOrNull(row.visibility) as MatterVisibility | null,
    createdAt: str(row.created_at),
    taskId: strOrNull(row.task_id),
  };
}

export function mapEvent(row: Record<string, unknown>): MatterEvent {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    eventType: str(row.event_type),
    actor: actorFrom(
      row.actor_kind,
      row.actor_profile_id,
      null,
      row.actor_display_name ?? row.agent_display_name,
      row.actor_agent_id ?? row.agent_id,
    ),
    isSystem: Boolean(row.is_system) || str(row.actor_kind) === 'system',
    summary: str(row.summary),
    payload: asRecord(row.payload) ?? {},
    createdAt: str(row.created_at),
  };
}

export function mapParty(row: Record<string, unknown>): MatterParty {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    role: str(row.role) as MatterParty['role'],
    actor: actorFrom(
      row.actor_kind,
      row.actor_profile_id,
      row.actor_unit_label,
      row.actor_display_name ?? row.agent_display_name,
      row.actor_agent_id ?? row.agent_id,
    ),
    addedAt: str(row.added_at),
  };
}

export function mapAttachment(row: Record<string, unknown>): MatterAttachment {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    commentId: strOrNull(row.comment_id),
    kind: str(row.kind) === 'url' ? 'url' : str(row.kind) === 'text' ? 'text' : str(row.kind) === 'image' ? 'image' : str(row.kind) === 'system_record' ? 'system_record' : 'file',
    filePath: strOrNull(row.file_path),
    fileName: strOrNull(row.file_name),
    url: strOrNull(row.url),
    label: strOrNull(row.label),
    bodyText: strOrNull(row.body_text),
    visibility: strOrNull(row.visibility) as MatterVisibility | null,
    uploadedByProfileId: str(row.uploaded_by_profile_id),
    createdAt: str(row.created_at),
    taskId: strOrNull(row.task_id),
    decisionId: strOrNull(row.decision_id),
  };
}
