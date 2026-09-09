import { supabase } from '@/integrations/supabase/client';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';
import { parseSearchDirectoryPayload } from '@/lib/search-directory';
import {
  buildBallIsWithCopy,
  deriveMatterStatus,
  isMatterActorKind,
  isMatterLifecycle,
  isMatterType,
  isMatterVisibility,
  type ActionRequirementStatus,
  type ActionRequirementType,
  type CloseKind,
  type FormalActionType,
  type Matter,
  type MatterActionRequirement,
  type MatterActorKind,
  type MatterActorRef,
  type MatterAttachment,
  type MatterComment,
  type MatterEvent,
  type MatterListRow,
  type MatterParty,
  type MatterQueue,
  type MatterType,
  type MatterVisibility,
  type ReopenReason,
  type TimeoutBehavior,
} from '@/lib/matters';
import type {
  AiAgent,
  AiAgentRun,
  AiAgentRoleType,
  AiContextScope,
  MatterAgentArtifact,
  MatterAgentAssignment,
} from '@/lib/matters-ai';
import type {
  MatterEvaluation,
  MatterOutcomeFollowup,
  MatterPatternCounts,
  MatterResolution,
} from '@/lib/matters-resolution';
import type {
  CollaborationTask,
  MatterDecision,
  MatterResponsibility,
  TaskAssignment,
  TaskDependency,
  TaskStatus,
} from '@/lib/matters-work';

type DbClient = typeof supabase;
type QueryError = { message?: string } | null;
type ProfileQuery = {
  select: (columns: string) => ProfileQuery;
  in: (column: string, values: readonly unknown[]) => Promise<{ data: unknown; error: QueryError }>;
};
type MattersClient = {
  from: (table: string) => ProfileQuery;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: QueryError }>;
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        options?: { upsert?: boolean; contentType?: string },
      ) => Promise<{ error: QueryError }>;
    };
  };
};

function db(client: DbClient): MattersClient {
  return client as unknown as MattersClient;
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

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function strOrNull(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text : null;
}

function rpcErrorMessage(error: { message?: string } | null): string {
  const message = error?.message?.trim() || 'request_failed';
  const marker = message.split('\n')[0]?.trim() || message;
  return marker.replace(/^.*ERROR:\s*/i, '').split('CONTEXT:')[0].trim();
}

function actorFrom(
  kindValue: unknown,
  profileId: unknown,
  unitLabel: unknown,
  displayName: unknown,
  agentId?: unknown,
): MatterActorRef {
  const kind = isMatterActorKind(str(kindValue)) ? (kindValue as MatterActorKind) : 'person';
  return {
    kind,
    profileId: kind === 'ai_agent' ? null : strOrNull(profileId),
    agentId: kind === 'ai_agent' ? strOrNull(agentId ?? profileId) : strOrNull(agentId),
    unitLabel: strOrNull(unitLabel),
    displayName: strOrNull(displayName),
  };
}

function mapMatter(row: Record<string, unknown>): Matter {
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

function mapAction(row: Record<string, unknown> | null): MatterActionRequirement | null {
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

function mapListBundle(
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
  const workSummary = workRow
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

function mapComment(row: Record<string, unknown>): MatterComment {
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

function mapEvent(row: Record<string, unknown>): MatterEvent {
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

function mapParty(row: Record<string, unknown>): MatterParty {
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

function mapAttachment(row: Record<string, unknown>): MatterAttachment {
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

function mapAssignment(row: Record<string, unknown>): TaskAssignment {
  return {
    id: str(row.id),
    taskId: str(row.task_id),
    role: str(row.role) as TaskAssignment['role'],
    actor: actorFrom(
      row.actor_kind,
      row.actor_profile_id,
      row.actor_unit_label,
      row.actor_display_name ?? row.agent_display_name,
      row.actor_agent_id ?? row.agent_id,
    ),
    assignedBy: actorFrom(row.assigned_by_kind, row.assigned_by_profile_id, null, null),
    assignedAt: str(row.assigned_at),
    acceptanceStatus: str(row.acceptance_status) as TaskAssignment['acceptanceStatus'],
    acceptedAt: strOrNull(row.accepted_at),
    declinedAt: strOrNull(row.declined_at),
    declineReason: strOrNull(row.decline_reason),
    suggestionReason: strOrNull(row.suggestion_reason),
  };
}

function mapTask(row: Record<string, unknown>): CollaborationTask {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    parentTaskId: strOrNull(row.parent_task_id),
    title: str(row.title),
    description: strOrNull(row.description),
    priority: str(row.priority) === 'high' || str(row.priority) === 'low' ? str(row.priority) as 'high' | 'low' : 'normal',
    status: str(row.status) as TaskStatus,
    createdBy: actorFrom(row.created_by_kind, row.created_by_profile_id, null, row.created_by_display_name),
    lead: str(row.lead_kind) === 'ai_agent'
      ? actorFrom('ai_agent', null, null, row.lead_display_name, row.lead_agent_id)
      : row.lead_profile_id
        ? actorFrom(row.lead_kind, row.lead_profile_id, row.lead_unit_label, row.lead_display_name)
        : null,
    expectedOutcome: strOrNull(row.expected_outcome),
    completionCriteria: strOrNull(row.completion_criteria),
    reviewRequired: Boolean(row.review_required),
    currentActionId: strOrNull(row.current_action_id),
    waitingCondition: strOrNull(row.waiting_condition),
    startAt: strOrNull(row.start_at),
    dueAt: strOrNull(row.due_at),
    submittedAt: strOrNull(row.submitted_at),
    completedAt: strOrNull(row.completed_at),
    cancelledAt: strOrNull(row.cancelled_at),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    isBlocked: Boolean(row.is_blocked),
    assignments: asRows(row.assignments).map(mapAssignment),
    dependencies: asRows(row.dependencies).map((dep) => ({
      id: str(dep.id),
      dependsOnTaskId: str(dep.depends_on_task_id),
      kind: 'blocked_by' as const,
      dependsOnTitle: str(dep.depends_on_title),
      dependsOnStatus: str(dep.depends_on_status) as TaskStatus,
    } satisfies TaskDependency)),
  };
}

function mapDecision(row: Record<string, unknown>): MatterDecision {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    title: str(row.title),
    statement: str(row.statement),
    rationale: strOrNull(row.rationale),
    status: str(row.status) as MatterDecision['status'],
    proposedBy: actorFrom(row.proposed_by_kind, row.proposed_by_profile_id, null, row.proposed_by_display_name),
    decidedBy: row.decided_by_profile_id
      ? actorFrom(row.decided_by_kind, row.decided_by_profile_id, null, row.decided_by_display_name)
      : null,
    createdAt: str(row.created_at),
    decidedAt: strOrNull(row.decided_at),
    taskIds: Array.isArray(row.task_ids) ? row.task_ids.filter((id): id is string => typeof id === 'string') : [],
  };
}

function mapResponsibility(row: Record<string, unknown>): MatterResponsibility {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    kind: str(row.kind) === 'collaborator' ? 'collaborator' : 'lead',
    actor: actorFrom(
      row.actor_kind,
      row.actor_profile_id,
      row.actor_unit_label,
      row.actor_display_name ?? row.agent_display_name,
      row.actor_agent_id ?? row.agent_id,
    ),
    status: str(row.status) as MatterResponsibility['status'],
    assignedAt: str(row.assigned_at),
    assignedBy: row.assigned_by_profile_id
      ? actorFrom(row.assigned_by_kind, row.assigned_by_profile_id, null, null)
      : null,
    acceptedAt: strOrNull(row.accepted_at),
    declinedAt: strOrNull(row.declined_at),
    responseAction: strOrNull(row.response_action),
    responseReason: strOrNull(row.response_reason),
    suggestedActor: row.suggested_actor_profile_id
      ? actorFrom(row.suggested_actor_kind, row.suggested_actor_profile_id, null, row.suggested_actor_display_name)
      : null,
  };
}

function mapResolution(row: Record<string, unknown>): MatterResolution {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    attemptNumber: Number(row.attempt_number) || 0,
    resolutionKind: str(row.resolution_kind) as MatterResolution['resolutionKind'],
    summary: str(row.summary),
    actionsTaken: strOrNull(row.actions_taken),
    outstandingItems: strOrNull(row.outstanding_items),
    limitations: strOrNull(row.limitations),
    resolutionStatus: str(row.resolution_status) as MatterResolution['resolutionStatus'],
    responsiblePartyPosition: str(row.responsible_party_position),
    initiatorPosition: strOrNull(row.initiator_position),
    evaluatorPosition: strOrNull(row.evaluator_position),
    proposedBy: actorFrom(row.proposed_by_kind, row.proposed_by_profile_id, null, row.proposed_by_display_name),
    proposedAt: str(row.proposed_at),
    closedAt: strOrNull(row.closed_at),
    closureKind: strOrNull(row.closure_kind) as MatterResolution['closureKind'],
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function mapEvaluation(row: Record<string, unknown>): MatterEvaluation {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    resolutionId: strOrNull(row.resolution_id),
    evaluatorRole: str(row.evaluator_role) as MatterEvaluation['evaluatorRole'],
    evaluator: actorFrom(row.evaluator_kind, row.evaluator_profile_id, null, row.evaluator_display_name),
    dimension: str(row.dimension) as MatterEvaluation['dimension'],
    rating: str(row.rating) as MatterEvaluation['rating'],
    comment: strOrNull(row.comment),
    visibility: str(row.visibility) as MatterEvaluation['visibility'],
    createdAt: str(row.created_at),
  };
}

function mapOutcomeFollowup(row: Record<string, unknown>): MatterOutcomeFollowup {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    resolutionId: strOrNull(row.resolution_id),
    reviewDueAt: str(row.review_due_at),
    outcomeQuestion: str(row.outcome_question),
    targetIndicator: strOrNull(row.target_indicator),
    reviewer: actorFrom(row.reviewer_kind, row.reviewer_profile_id, null, row.reviewer_display_name),
    status: str(row.status) as MatterOutcomeFollowup['status'],
    result: strOrNull(row.result) as MatterOutcomeFollowup['result'],
    notes: strOrNull(row.notes),
    actionId: strOrNull(row.action_id),
    humanOutcomeReviewId: strOrNull(row.human_outcome_review_id),
    createdAt: str(row.created_at),
    completedAt: strOrNull(row.completed_at),
  };
}

function mapPatternCounts(value: unknown): MatterPatternCounts | null {
  const row = asRecord(value);
  if (!row) return null;
  return {
    redirectCount: Number(row.redirectCount) || 0,
    reopenCount: Number(row.reopenCount) || 0,
    resolutionRejectionCount: Number(row.resolutionRejectionCount) || 0,
    resolutionAttemptCount: Number(row.resolutionAttemptCount) || 0,
  };
}

function mapAiAgent(row: Record<string, unknown>): AiAgent {
  return {
    id: str(row.id),
    slug: str(row.slug),
    displayName: str(row.display_name),
    description: str(row.description),
    roleType: str(row.role_type) as AiAgent['roleType'],
    status: str(row.status) as AiAgent['status'],
    providerRef: strOrNull(row.provider_ref),
    modelRef: strOrNull(row.model_ref),
    capabilityProfile: asRecord(row.capability_profile) ?? {},
  };
}

function mapAgentAssignment(row: Record<string, unknown>): MatterAgentAssignment {
  return {
    id: str(row.id),
    matterId: str(row.matter_id),
    taskId: strOrNull(row.task_id),
    agentId: str(row.agent_id),
    agentDisplayName: strOrNull(row.agent_display_name) ?? undefined,
    agentRoleType: strOrNull(row.agent_role_type) as MatterAgentAssignment['agentRoleType'],
    assignedBy: {
      kind: str(row.assigned_by_kind) === 'organization' ? 'organization' : 'person',
      profileId: str(row.assigned_by_profile_id),
    },
    supervisor: {
      kind: str(row.supervising_kind) === 'organization' ? 'organization' : 'person',
      profileId: str(row.supervising_profile_id),
    },
    rolePurpose: str(row.role_purpose),
    instructions: str(row.instructions),
    allowedContext: (Array.isArray(row.allowed_context) ? row.allowed_context : []).map(String) as AiContextScope[],
    allowedCapabilities: (Array.isArray(row.allowed_capabilities) ? row.allowed_capabilities : []).map(String) as MatterAgentAssignment['allowedCapabilities'],
    status: str(row.status) as MatterAgentAssignment['status'],
    maxRunAttempts: Number(row.max_run_attempts) || 3,
    assignedAt: str(row.assigned_at),
    startedAt: strOrNull(row.started_at),
    completedAt: strOrNull(row.completed_at),
    cancelledAt: strOrNull(row.cancelled_at),
    codingPolicy: asRecord(row.coding_policy) ?? undefined,
  };
}

function mapAgentRun(row: Record<string, unknown>): AiAgentRun {
  return {
    id: str(row.id),
    assignmentId: str(row.assignment_id),
    taskId: strOrNull(row.task_id),
    triggeredBy: str(row.triggered_by),
    status: str(row.status) as AiAgentRun['status'],
    revisionNumber: Number(row.revision_number) || 1,
    startedAt: strOrNull(row.started_at),
    finishedAt: strOrNull(row.finished_at),
    inputContext: asRecord(row.input_context),
    outputSummary: strOrNull(row.output_summary),
    failureReason: strOrNull(row.failure_reason),
    usageMetadata: asRecord(row.usage_metadata),
    createdAt: str(row.created_at),
  };
}

function mapAgentArtifact(row: Record<string, unknown>): MatterAgentArtifact {
  return {
    id: str(row.id),
    runId: str(row.run_id),
    assignmentId: str(row.assignment_id),
    matterId: str(row.matter_id),
    artifactType: str(row.artifact_type) as MatterAgentArtifact['artifactType'],
    title: str(row.title),
    body: str(row.body),
    sourceReferences: Array.isArray(row.source_references)
      ? row.source_references.map((item) => {
          const ref = asRecord(item) ?? {};
          return { kind: str(ref.kind), label: str(ref.label), ref: strOrNull(ref.ref) ?? undefined };
        })
      : [],
    reviewStatus: str(row.review_status) as MatterAgentArtifact['reviewStatus'],
    generatedByAgentId: str(row.generated_by_agent_id),
    agentDisplayName: strOrNull(row.agent_display_name) ?? undefined,
    verificationState: str(row.verification_state),
    createdAt: str(row.created_at),
  };
}

function mapCodingWorkspace(row: Record<string, unknown>): MatterCodingWorkspace {
  return {
    id: str(row.id),
    assignmentId: str(row.assignment_id),
    runId: str(row.run_id),
    baseCommitSha: str(row.base_commit_sha),
    workspaceRef: str(row.workspace_ref),
    primaryDirtySummary: strOrNull(row.primary_dirty_summary),
    status: str(row.status),
  };
}

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

export async function listAiAgents(client: DbClient = supabase): Promise<AiAgent[]> {
  const { data, error } = await db(client).rpc('list_ai_agents');
  if (error) throw new Error(rpcErrorMessage(error));
  return asRows(data).map(mapAiAgent);
}

export async function assignMatterAiAgent(
  input: {
    matterId: string;
    agentRoleType: AiAgentRoleType;
    instructions: string;
    supervisingProfileId: string;
    taskTitle?: string;
    allowedContext?: AiContextScope[];
  },
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('assign_matter_ai_agent', {
    payload: {
      matter_id: input.matterId,
      agent_role_type: input.agentRoleType,
      instructions: input.instructions,
      supervising_profile_id: input.supervisingProfileId,
      task_title: input.taskTitle ?? null,
      allowed_context: input.allowedContext ?? null,
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not assign AI assistance.');
  return data;
}

export async function assignMatterCodingAgent(
  input: {
    matterId: string;
    instructions: string;
    supervisingProfileId: string;
    allowedPaths: string[];
    repositorySlug?: string;
    taskTitle?: string;
    requiredGates?: string[];
  },
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('assign_matter_coding_agent', {
    payload: {
      matter_id: input.matterId,
      instructions: input.instructions,
      supervising_profile_id: input.supervisingProfileId,
      allowed_paths: input.allowedPaths,
      repository_slug: input.repositorySlug ?? 'maturehumanity/civizen',
      task_title: input.taskTitle ?? 'Implement authorized code change',
      required_gates: input.requiredGates ?? [],
    },
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not assign Coding Agent.');
  return data;
}

export async function approveMatterCodingPlan(
  artifactId: string,
  note?: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('approve_matter_coding_plan', {
    p_artifact_id: artifactId,
    p_note: note ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not approve coding plan.');
  return data;
}

export async function approveMatterCodingScopeExpansion(
  artifactId: string,
  path: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('approve_matter_coding_scope_expansion', {
    p_artifact_id: artifactId,
    p_path: path,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function reviewMatterAgentWork(
  actionId: string,
  action: 'accept' | 'request_changes' | 'reject',
  message?: string,
  client: DbClient = supabase,
): Promise<void> {
  const { error } = await db(client).rpc('review_matter_agent_work', {
    p_action_id: actionId,
    p_action: action,
    p_message: message ?? null,
  });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function retryMatterAgentRun(assignmentId: string, client: DbClient = supabase): Promise<string> {
  const { data, error } = await db(client).rpc('retry_matter_agent_run', { p_assignment_id: assignmentId });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not retry agent run.');
  return data;
}

export async function cancelMatterAgentAssignment(assignmentId: string, client: DbClient = supabase): Promise<void> {
  const { error } = await db(client).rpc('cancel_matter_agent_assignment', { p_assignment_id: assignmentId });
  if (error) throw new Error(rpcErrorMessage(error));
}

export async function adoptMatterAgentPlanTask(
  artifactId: string,
  title: string,
  description?: string,
  dependsOnTitles?: string[],
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('adopt_matter_agent_plan_task', {
    p_artifact_id: artifactId,
    p_title: title,
    p_description: description ?? null,
    p_depends_on_titles: dependsOnTitles ?? [],
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not adopt proposed Task.');
  return data;
}

export async function promoteAgentDecisionSuggestion(
  artifactId: string,
  title: string,
  statement: string,
  client: DbClient = supabase,
): Promise<string> {
  const { data, error } = await db(client).rpc('promote_agent_decision_suggestion', {
    p_artifact_id: artifactId,
    p_title: title,
    p_statement: statement,
  });
  if (error) throw new Error(rpcErrorMessage(error));
  if (typeof data !== 'string') throw new Error('Could not promote Decision suggestion.');
  return data;
}

export async function invokeMatterAgentRun(runId: string, client: DbClient = supabase): Promise<void> {
  const { error } = await client.functions.invoke('matter-agent-execute', { body: { run_id: runId } });
  if (error) throw new Error(error.message || 'Agent execution failed.');
}

