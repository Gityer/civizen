/**
 * Matter Collaboration System (Phase 1).
 * Generic Matter under Contribute — not an Issues module.
 */

export const MATTER_TYPES = [
  'question',
  'issue',
  'suggestion',
  'request',
  'discussion',
  'other',
] as const;
export type MatterType = (typeof MATTER_TYPES)[number];

export const MATTER_LIFECYCLES = ['draft', 'submitted', 'active', 'closed'] as const;
export type MatterLifecycle = (typeof MATTER_LIFECYCLES)[number];

export const MATTER_VISIBILITIES = [
  'private',
  'participants',
  'organization',
  'group',
  'public',
] as const;
export type MatterVisibility = (typeof MATTER_VISIBILITIES)[number];

/** Geographic scope — distinct from subject Area (`areaNodeId`). */
export const MATTER_SCOPE_KINDS = ['global', 'country', 'region', 'locality'] as const;
export type MatterScopeKind = (typeof MATTER_SCOPE_KINDS)[number];

export const MATTER_ACTOR_KINDS = ['person', 'organization', 'group', 'system', 'ai_agent'] as const;
export type MatterActorKind = (typeof MATTER_ACTOR_KINDS)[number];

export const ACTION_REQUIREMENT_TYPES = [
  'respond',
  'responsibility_response',
  'clarify',
  'address',
  'confirm_resolution',
  'review_resolution',
  'choose_next_party',
  'accept_task',
  'complete_task',
  'review_task',
  'reconsider_task',
  'confirm_decision',
  'shared_responsibility_response',
  'propose_resolution',
  'outcome_followup',
  'manual_review',
] as const;
export type ActionRequirementType = (typeof ACTION_REQUIREMENT_TYPES)[number];

export const ACTION_REQUIREMENT_STATUSES = [
  'pending',
  'completed',
  'overdue',
  'escalated',
  'expired',
  'cancelled',
  'superseded',
] as const;
export type ActionRequirementStatus = (typeof ACTION_REQUIREMENT_STATUSES)[number];

export const TIMEOUT_BEHAVIORS = [
  'remind',
  'escalate',
  'forward',
  'involve_additional_party',
  'continue_without_response',
  'return_to_initiator',
  'auto_close',
  'mark_unresponsive',
  'require_manual_review',
] as const;
export type TimeoutBehavior = (typeof TIMEOUT_BEHAVIORS)[number];

export const FORMAL_ACTIONS = [
  'respond',
  'request_clarification',
  'forward',
  'invite_party',
  'redirect',
  'accept_responsibility',
  'accept_jointly',
  'partially_accept',
  'dispute_responsibility',
  'mark_no_action_required',
  'mark_addressed',
  'confirm_resolved',
  'confirm_partially_resolved',
  'confirm_not_resolved',
  'need_clarification',
  'cannot_verify',
  'revealed_issue',
  'close',
  'reopen',
] as const;
export type FormalActionType = (typeof FORMAL_ACTIONS)[number];

export const REOPEN_REASONS = [
  'not_actually_resolved',
  'issue_returned',
  'new_facts',
  'new_evidence',
  'resolution_failed',
  'related_problem_emerged',
  'other',
] as const;
export type ReopenReason = (typeof REOPEN_REASONS)[number];

export const CLOSE_KINDS = [
  'confirmed_resolution',
  'partially_resolved',
  'auto_no_initiator_response',
  'no_action_required',
  'withdrawn',
  'manual',
  'unable_to_resolve',
  'referred',
  'administrative_close',
] as const;
export type CloseKind = (typeof CLOSE_KINDS)[number];

export const AUTO_CLOSE_REASON =
  'Closed automatically after no response from the initiator within the resolution-review period.';

export const TIMING_POLICY_IDS = [
  'question_response',
  'responsibility_response',
  'clarification_response',
  'resolution_confirmation',
  'suggestion_response',
  'request_response',
  'discussion_response',
  'address_work',
  'task_acceptance',
  'task_execution',
  'task_review',
  'decision_confirmation',
  'final_work_response',
  'resolution_review',
  'resolution_followup',
  'outcome_followup',
] as const;
export type TimingPolicyId = (typeof TIMING_POLICY_IDS)[number];

export const DURATION_UNITS = ['calendar_days', 'business_days', 'hours'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

export type MatterActorRef = {
  kind: MatterActorKind;
  profileId: string | null;
  agentId?: string | null;
  unitLabel?: string | null;
  displayName?: string | null;
};

export type MatterTimingPolicy = {
  id: string;
  displayName: string;
  durationValue: number;
  durationUnit: DurationUnit;
  reminderValue: number;
  reminderUnit: DurationUnit;
};

export const DEFAULT_TIMING_POLICIES: readonly MatterTimingPolicy[] = [
  {
    id: 'question_response',
    displayName: 'Question response',
    durationValue: 3,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'responsibility_response',
    displayName: 'Responsibility response',
    durationValue: 2,
    durationUnit: 'calendar_days',
    reminderValue: 12,
    reminderUnit: 'hours',
  },
  {
    id: 'clarification_response',
    displayName: 'Clarification response',
    durationValue: 5,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'resolution_confirmation',
    displayName: 'Resolution confirmation',
    durationValue: 3,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'suggestion_response',
    displayName: 'Suggestion response',
    durationValue: 3,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'request_response',
    displayName: 'Request response',
    durationValue: 3,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'discussion_response',
    displayName: 'Discussion response',
    durationValue: 5,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'address_work',
    displayName: 'Address work',
    durationValue: 5,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'task_acceptance',
    displayName: 'Task acceptance',
    durationValue: 1,
    durationUnit: 'calendar_days',
    reminderValue: 8,
    reminderUnit: 'hours',
  },
  {
    id: 'task_execution',
    displayName: 'Task execution',
    durationValue: 5,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'task_review',
    displayName: 'Task review',
    durationValue: 2,
    durationUnit: 'calendar_days',
    reminderValue: 12,
    reminderUnit: 'hours',
  },
  {
    id: 'decision_confirmation',
    displayName: 'Decision confirmation',
    durationValue: 2,
    durationUnit: 'calendar_days',
    reminderValue: 12,
    reminderUnit: 'hours',
  },
  {
    id: 'final_work_response',
    displayName: 'Final work response',
    durationValue: 3,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'resolution_review',
    displayName: 'Resolution review',
    durationValue: 3,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'resolution_followup',
    displayName: 'Resolution follow-up work',
    durationValue: 5,
    durationUnit: 'calendar_days',
    reminderValue: 1,
    reminderUnit: 'calendar_days',
  },
  {
    id: 'outcome_followup',
    displayName: 'Outcome follow-up',
    durationValue: 30,
    durationUnit: 'calendar_days',
    reminderValue: 7,
    reminderUnit: 'calendar_days',
  },
];

export type MatterTypeDefault = {
  matterType: MatterType;
  initialActionType: ActionRequirementType;
  timingPolicyId: TimingPolicyId;
  timeoutBehavior: TimeoutBehavior;
};

export const MATTER_TYPE_DEFAULTS: readonly MatterTypeDefault[] = [
  {
    matterType: 'question',
    initialActionType: 'respond',
    timingPolicyId: 'question_response',
    timeoutBehavior: 'remind',
  },
  {
    matterType: 'issue',
    initialActionType: 'responsibility_response',
    timingPolicyId: 'responsibility_response',
    timeoutBehavior: 'remind',
  },
  {
    matterType: 'suggestion',
    initialActionType: 'respond',
    timingPolicyId: 'suggestion_response',
    timeoutBehavior: 'remind',
  },
  {
    matterType: 'request',
    initialActionType: 'responsibility_response',
    timingPolicyId: 'responsibility_response',
    timeoutBehavior: 'remind',
  },
  {
    matterType: 'discussion',
    initialActionType: 'respond',
    timingPolicyId: 'discussion_response',
    timeoutBehavior: 'remind',
  },
  {
    matterType: 'other',
    initialActionType: 'respond',
    timingPolicyId: 'question_response',
    timeoutBehavior: 'remind',
  },
];

export type Matter = {
  id: string;
  title: string;
  description: string;
  matterType: MatterType;
  lifecycleStatus: MatterLifecycle;
  visibility: MatterVisibility;
  areaNodeId: string | null;
  scopeKind: MatterScopeKind;
  scopeCountryCode: string | null;
  scopeRegionCode: string | null;
  scopeLocalityCode: string | null;
  initiator: MatterActorRef;
  addressee: MatterActorRef;
  responsible: MatterActorRef;
  currentActionId: string | null;
  waitingCondition: string | null;
  closeKind: CloseKind | null;
  closeReason: string | null;
  createdByProfileId: string;
  createdAt: string;
  submittedAt: string | null;
  closedAt: string | null;
  lastReopenedAt: string | null;
  reopenCount: number;
  updatedAt: string;
  collaborativeWorkStartedAt: string | null;
  collaborativeWorkCompletedAt: string | null;
  collaborativeWorkCompletionKind: 'normal' | 'with_outstanding_work' | null;
  collaborativeWorkCompletionReason: string | null;
  latestResolutionId?: string | null;
  resolutionAttemptCount?: number;
};

export type MatterActionRequirement = {
  id: string;
  matterId: string;
  actionType: ActionRequirementType;
  assignedActor: MatterActorRef;
  createdAt: string;
  dueAt: string;
  reminderAt: string;
  timingPolicyId: string;
  status: ActionRequirementStatus;
  completedAt: string | null;
  completedBy: MatterActorRef | null;
  completionAction: FormalActionType | null;
  timeoutAction: TimeoutBehavior;
  escalationPolicyId: string | null;
  contextKind: 'matter' | 'task' | 'decision' | 'responsibility' | 'resolution' | 'outcome';
  contextId: string | null;
  taskTitle?: string | null;
  resolutionId?: string | null;
};

export type MatterComment = {
  id: string;
  matterId: string;
  parentId: string | null;
  author: MatterActorRef;
  body: string;
  mentionedProfileIds: string[];
  visibility: MatterVisibility | null;
  createdAt: string;
  taskId: string | null;
};

export type MatterEvent = {
  id: string;
  matterId: string;
  eventType: string;
  actor: MatterActorRef;
  isSystem: boolean;
  summary: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type MatterParty = {
  id: string;
  matterId: string;
  role:
    | 'initiator'
    | 'addressee'
    | 'responsible'
    | 'responsible_lead'
    | 'responsible_collaborator'
    | 'contributor'
    | 'specialist'
    | 'contractor'
    | 'observer'
    | 'evaluator'
    | 'invitee'
    | 'follower'
    | 'participant';
  actor: MatterActorRef;
  addedAt: string;
};

export type MatterAttachment = {
  id: string;
  matterId: string;
  commentId: string | null;
  kind: 'file' | 'url' | 'text' | 'image' | 'system_record';
  filePath: string | null;
  fileName: string | null;
  url: string | null;
  label: string | null;
  bodyText: string | null;
  visibility: MatterVisibility | null;
  uploadedByProfileId: string;
  createdAt: string;
  taskId: string | null;
  decisionId: string | null;
  resolutionId?: string | null;
};

export type DerivedMatterStatus =
  | 'draft'
  | 'waiting_for_response'
  | 'clarification_needed'
  | 'waiting_for_initiator'
  | 'choose_next_party'
  | 'response_overdue'
  | 'addressed'
  | 'partially_resolved'
  | 'automatically_closed'
  | 'closed'
  | 'reopened'
  | 'no_action_required'
  | 'work_in_progress'
  | 'resolution_proposed'
  | 'partial_resolution'
  | 'resolved_confirmed'
  | 'outcome_followup';

export type BallIsWithCopy = {
  headline: string;
  detail: string;
  dueLine: string;
  requiredFromViewer: boolean;
};

const TYPE_SET = new Set<string>(MATTER_TYPES);
const LIFECYCLE_SET = new Set<string>(MATTER_LIFECYCLES);
const VISIBILITY_SET = new Set<string>(MATTER_VISIBILITIES);
const ACTOR_KIND_SET = new Set<string>(MATTER_ACTOR_KINDS);

export function isMatterType(value: string): value is MatterType {
  return TYPE_SET.has(value);
}

export function isMatterLifecycle(value: string): value is MatterLifecycle {
  return LIFECYCLE_SET.has(value);
}

export function isMatterVisibility(value: string): value is MatterVisibility {
  return VISIBILITY_SET.has(value);
}

export function isMatterActorKind(value: string): value is MatterActorKind {
  return ACTOR_KIND_SET.has(value);
}

export function getMatterTypeDefault(matterType: MatterType): MatterTypeDefault {
  const row = MATTER_TYPE_DEFAULTS.find((item) => item.matterType === matterType);
  if (!row) return MATTER_TYPE_DEFAULTS[5];
  return row;
}

export function getTimingPolicy(
  policyId: string,
  policies: readonly MatterTimingPolicy[] = DEFAULT_TIMING_POLICIES,
): MatterTimingPolicy {
  return policies.find((policy) => policy.id === policyId) ?? DEFAULT_TIMING_POLICIES[0];
}

export function durationToMs(value: number, unit: DurationUnit): number {
  if (unit === 'hours') return value * 60 * 60 * 1000;
  // calendar_days and reserved business_days both use 24h periods in Phase 1.
  return value * 24 * 60 * 60 * 1000;
}

export function computeDueAt(
  createdAt: Date,
  policy: MatterTimingPolicy,
): { dueAt: Date; reminderAt: Date } {
  const dueAt = new Date(createdAt.getTime() + durationToMs(policy.durationValue, policy.durationUnit));
  const reminderOffset = durationToMs(policy.reminderValue, policy.reminderUnit);
  const reminderAt = new Date(Math.max(createdAt.getTime(), dueAt.getTime() - reminderOffset));
  return { dueAt, reminderAt };
}

export function actorsEqual(a: MatterActorRef, b: MatterActorRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'ai_agent') return a.agentId === b.agentId;
  return a.profileId === b.profileId;
}

export function actorLabel(actor: MatterActorRef, fallback = 'Unknown party'): string {
  if (actor.kind === 'ai_agent') {
    const name = actor.displayName?.trim() || 'AI Agent';
    return `${name} · AI`;
  }
  const name = actor.displayName?.trim();
  if (name) {
    return actor.unitLabel?.trim() ? `${name} (${actor.unitLabel.trim()})` : name;
  }
  if (actor.kind === 'system') return 'Civizen';
  return fallback;
}

export function viewerRepresents(
  viewerProfileId: string,
  actor: MatterActorRef,
  managedOrganizationIds: readonly string[] = [],
): boolean {
  if (!viewerProfileId || actor.kind === 'system' || !actor.profileId) return false;
  if (actor.profileId === viewerProfileId) return true;
  if (actor.kind === 'organization' && managedOrganizationIds.includes(actor.profileId)) {
    return true;
  }
  return false;
}

export function actionIsDisplayOverdue(
  action: Pick<MatterActionRequirement, 'status' | 'dueAt'> | null,
  now: Date = new Date(),
): boolean {
  if (!action) return false;
  if (action.status === 'overdue' || action.status === 'escalated') return true;
  if (action.status === 'pending' && new Date(action.dueAt).getTime() <= now.getTime()) return true;
  return false;
}

export function deriveMatterStatus(
  matter: Pick<Matter, 'lifecycleStatus' | 'closeKind' | 'reopenCount' | 'waitingCondition'>,
  action: Pick<MatterActionRequirement, 'actionType' | 'status' | 'dueAt'> | null,
  now: Date = new Date(),
): DerivedMatterStatus {
  if (matter.lifecycleStatus === 'draft') return 'draft';
  if (matter.lifecycleStatus === 'closed') {
    if (matter.closeKind === 'auto_no_initiator_response') return 'automatically_closed';
    if (matter.closeKind === 'confirmed_resolution') return 'resolved_confirmed';
    if (matter.closeKind === 'partially_resolved') return 'partially_resolved';
    if (matter.closeKind === 'no_action_required') return 'no_action_required';
    return 'closed';
  }
  if (matter.reopenCount > 0 && (!action || action.status === 'pending')) {
    if (action?.actionType === 'confirm_resolution' || action?.actionType === 'review_resolution') {
      return 'waiting_for_initiator';
    }
  }
  if (actionIsDisplayOverdue(action, now)) {
    return 'response_overdue';
  }
  if (action?.actionType === 'clarify') return 'clarification_needed';
  if (action?.actionType === 'review_resolution' || action?.actionType === 'confirm_resolution') {
    return 'resolution_proposed';
  }
  if (action?.actionType === 'propose_resolution') return 'waiting_for_response';
  if (action?.actionType === 'outcome_followup') return 'outcome_followup';
  if (action?.actionType === 'choose_next_party') return 'choose_next_party';
  if (matter.reopenCount > 0 && action?.status === 'pending') return 'reopened';
  if (
    action?.actionType === 'address'
    && (action.contextKind === 'resolution' || ('resolutionAttemptCount' in matter && (matter.resolutionAttemptCount ?? 0) > 0))
  ) {
    return 'partial_resolution';
  }
  if (
    'collaborativeWorkStartedAt' in matter
    && matter.collaborativeWorkStartedAt
    && !('collaborativeWorkCompletedAt' in matter && matter.collaborativeWorkCompletedAt)
    && matter.lifecycleStatus === 'active'
  ) {
    return 'work_in_progress';
  }
  return 'waiting_for_response';
}

function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return count === 1 ? `1 ${singular}` : `${count} ${pluralWord}`;
}

export function formatRemaining(dueAtIso: string, now: Date = new Date()): string {
  const due = new Date(dueAtIso).getTime();
  const diff = due - now.getTime();
  if (diff <= 0) return 'Overdue';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days >= 1 && remHours > 0) return `${plural(days, 'day')} ${plural(remHours, 'hour')} remaining`;
  if (days >= 1) return `${plural(days, 'day')} remaining`;
  if (hours >= 1) return `${plural(hours, 'hour')} remaining`;
  const minutes = Math.max(1, Math.floor(diff / (60 * 1000)));
  return `${plural(minutes, 'minute')} remaining`;
}

export function formatDueIn(dueAtIso: string, now: Date = new Date()): string {
  const due = new Date(dueAtIso).getTime();
  const diff = due - now.getTime();
  if (diff <= 0) return 'Overdue';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days >= 1 && remHours > 0) return `Due in ${plural(days, 'day')} ${plural(remHours, 'hour')}.`;
  if (days >= 1) return `Due in ${plural(days, 'day')}.`;
  if (hours >= 1) return `Due in ${plural(hours, 'hour')}.`;
  return `Due in ${plural(Math.max(1, Math.floor(diff / (60 * 1000))), 'minute')}.`;
}

export function formatDueDate(dueAtIso: string): string {
  return new Date(dueAtIso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
}

export function actionExpectedCopy(actionType: ActionRequirementType): string {
  switch (actionType) {
    case 'respond':
      return 'Provide a final answer when ready. Discussion comments do not complete this action.';
    case 'responsibility_response':
      return 'Accept, redirect, or dispute responsibility.';
    case 'clarify':
      return 'Provide the requested clarification.';
    case 'address':
      return 'Address this Matter and provide a final response.';
    case 'confirm_resolution':
      return 'Confirm whether the proposed response addressed the Matter.';
    case 'review_resolution':
      return 'Review the proposed Resolution and confirm, partially accept, or reject it.';
    case 'propose_resolution':
      return 'Propose Resolution — describe what was done, the outcome claimed, and any limitations.';
    case 'outcome_followup':
      return 'Record whether the situation improved after resolution.';
    case 'manual_review':
      return 'Manual review is required after escalation.';
    case 'choose_next_party':
      return 'Choose who should take this Matter next.';
    case 'accept_task':
      return 'Accept or decline this Task.';
    case 'complete_task':
      return 'Complete the assigned work, or submit it for review.';
    case 'review_task':
      return 'Review the submitted work.';
    case 'reconsider_task':
      return 'Reassign this Task or respond to the request.';
    case 'confirm_decision':
      return 'Confirm or reject the proposed Decision.';
    case 'shared_responsibility_response':
      return 'Respond to this shared responsibility request.';
    default:
      return 'A response is required.';
  }
}

export const ESCALATION_POLICY_IDS = [
  'response_escalation',
  'responsibility_escalation',
  'responsibility_escalation_urgent',
] as const;
export type EscalationPolicyId = (typeof ESCALATION_POLICY_IDS)[number];

export function resolveEscalationPolicyId(params: {
  matterType: MatterType;
  actionType: ActionRequirementType;
  explicitPolicyId?: string | null;
}): string | null {
  if (params.explicitPolicyId) return params.explicitPolicyId;
  const defaults: Partial<Record<MatterType, Partial<Record<ActionRequirementType, string>>>> = {
    question: { respond: 'response_escalation' },
    suggestion: { respond: 'response_escalation' },
    discussion: { respond: 'response_escalation' },
    other: { respond: 'response_escalation', responsibility_response: 'responsibility_escalation' },
    issue: { responsibility_response: 'responsibility_escalation' },
    request: { responsibility_response: 'responsibility_escalation' },
  };
  return defaults[params.matterType]?.[params.actionType] ?? null;
}

export type ActionContextKind = 'matter' | 'task' | 'decision' | 'resolution' | 'outcome';

export function actionContextKind(
  action: Pick<MatterActionRequirement, 'actionType' | 'contextKind'> | null,
): ActionContextKind {
  if (!action) return 'matter';
  if (action.actionType === 'outcome_followup' || action.contextKind === 'outcome') return 'outcome';
  if (
    action.actionType === 'review_resolution'
    || action.actionType === 'propose_resolution'
    || action.contextKind === 'resolution'
  ) {
    return 'resolution';
  }
  if (
    action.actionType === 'confirm_decision'
    || action.contextKind === 'decision'
  ) {
    return 'decision';
  }
  if (
    action.actionType === 'accept_task'
    || action.actionType === 'complete_task'
    || action.actionType === 'review_task'
    || action.actionType === 'reconsider_task'
    || action.contextKind === 'task'
  ) {
    return 'task';
  }
  return 'matter';
}

export function actionContextHeadline(
  action: Pick<MatterActionRequirement, 'actionType' | 'contextKind'> | null,
): string {
  const kind = actionContextKind(action);
  switch (kind) {
    case 'resolution':
      if (action?.actionType === 'propose_resolution') return 'Propose Resolution';
      if (action?.actionType === 'review_resolution') return 'Review proposed resolution';
      return 'Resolution';
    case 'outcome':
      return 'Record outcome follow-up';
    case 'decision':
      return 'Confirm Decision';
    case 'task':
      if (action?.actionType === 'review_task') return 'Review Task';
      if (action?.actionType === 'accept_task') return 'Accept Task';
      return 'Task';
    default:
      return 'Matter';
  }
}

export function buildBallIsWithCopy(params: {
  matter: Pick<Matter, 'lifecycleStatus' | 'waitingCondition' | 'responsible' | 'initiator'>;
  action: MatterActionRequirement | null;
  viewerProfileId: string;
  managedOrganizationIds?: readonly string[];
  now?: Date;
}): BallIsWithCopy | null {
  const { matter, action, viewerProfileId, managedOrganizationIds = [], now = new Date() } = params;
  if (matter.lifecycleStatus === 'closed' || matter.lifecycleStatus === 'draft') return null;
  if (!action || (action.status !== 'pending' && action.status !== 'overdue' && action.status !== 'escalated')) {
    return {
      headline: matter.waitingCondition || 'Waiting',
      detail: matter.waitingCondition || 'This Matter is waiting without a timed action.',
      dueLine: '',
      requiredFromViewer: false,
    };
  }
  const requiredFromViewer = viewerRepresents(viewerProfileId, action.assignedActor, managedOrganizationIds);
  const pastDue = new Date(action.dueAt).getTime() <= now.getTime();
  const expected = actionExpectedCopy(action.actionType);
  const detail = action.taskTitle ? `Task: ${action.taskTitle}. ${expected}` : expected;
  const dueLine =
    action.status === 'overdue' || pastDue
      ? 'Overdue.'
      : requiredFromViewer
        ? formatDueIn(action.dueAt, now)
        : `Response due ${formatDueDate(action.dueAt)}. ${formatRemaining(action.dueAt, now)}.`;
  if (requiredFromViewer) {
    return {
      headline: 'Action required from you',
      detail,
      dueLine,
      requiredFromViewer: true,
    };
  }
  const waitingOn = actorLabel(action.assignedActor, 'the other party');
  const headline =
    action.actionType === 'confirm_resolution'
    || action.actionType === 'review_resolution'
    || action.actionType === 'clarify'
      ? `Waiting for ${waitingOn}`
      : `Waiting on ${waitingOn}`;
  return {
    headline,
    detail,
    dueLine,
    requiredFromViewer: false,
  };
}

export type FormalActionOption = {
  action: FormalActionType;
  needsTarget: boolean;
  needsMessage: boolean;
};

const ACTION_SETS: Record<ActionRequirementType, FormalActionType[]> = {
  respond: [
    'respond',
    'request_clarification',
    'forward',
    'invite_party',
    'redirect',
    'mark_no_action_required',
  ],
  responsibility_response: [
    'accept_responsibility',
    'accept_jointly',
    'partially_accept',
    'dispute_responsibility',
    'redirect',
    'request_clarification',
    'forward',
    'invite_party',
  ],
  clarify: ['respond'],
  address: [
    'mark_addressed',
    'request_clarification',
    'forward',
    'invite_party',
    'redirect',
  ],
  confirm_resolution: [
    'confirm_resolved',
    'confirm_partially_resolved',
    'confirm_not_resolved',
    'need_clarification',
    'revealed_issue',
    'cannot_verify',
  ],
  review_resolution: [
    'confirm_resolved',
    'confirm_partially_resolved',
    'confirm_not_resolved',
    'need_clarification',
    'cannot_verify',
  ],
  choose_next_party: ['redirect', 'invite_party'],
  accept_task: [],
  complete_task: [],
  review_task: [],
  reconsider_task: [],
  confirm_decision: [],
  shared_responsibility_response: [],
  propose_resolution: [],
  outcome_followup: [],
  manual_review: [],
};

const TARGET_ACTIONS = new Set<FormalActionType>(['forward', 'invite_party', 'redirect']);
const MESSAGE_ACTIONS = new Set<FormalActionType>([
  'respond',
  'request_clarification',
  'mark_addressed',
  'partially_accept',
  'dispute_responsibility',
  'mark_no_action_required',
  'confirm_not_resolved',
  'need_clarification',
  'confirm_partially_resolved',
  'cannot_verify',
  'revealed_issue',
]);

export function formalActionsForContext(params: {
  lifecycleStatus: MatterLifecycle;
  currentAction: MatterActionRequirement | null;
  viewerProfileId: string;
  managedOrganizationIds?: readonly string[];
  viewerIsInitiator: boolean;
  matterType: MatterType;
}): FormalActionOption[] {
  const {
    lifecycleStatus,
    currentAction,
    viewerProfileId,
    managedOrganizationIds = [],
    viewerIsInitiator,
  } = params;
  if (lifecycleStatus === 'closed') {
    if (viewerIsInitiator || (currentAction && viewerRepresents(viewerProfileId, currentAction.assignedActor, managedOrganizationIds))) {
      return [{ action: 'reopen', needsTarget: false, needsMessage: true }];
    }
    return viewerIsInitiator ? [{ action: 'reopen', needsTarget: false, needsMessage: true }] : [];
  }
  if (lifecycleStatus === 'draft') return [];
  if (!currentAction) {
    return viewerIsInitiator ? [{ action: 'close', needsTarget: false, needsMessage: true }] : [];
  }
  const assigned = viewerRepresents(viewerProfileId, currentAction.assignedActor, managedOrganizationIds);
  const options: FormalActionOption[] = [];
  const matterClock =
    currentAction.contextKind === 'matter'
    || currentAction.contextKind === 'resolution'
    || currentAction.actionType === 'review_resolution';
  if (assigned && matterClock && (currentAction.status === 'pending' || currentAction.status === 'overdue')) {
    for (const action of ACTION_SETS[currentAction.actionType]) {
      if (action === 'revealed_issue' && params.matterType !== 'question') continue;
      options.push({
        action,
        needsTarget: TARGET_ACTIONS.has(action),
        needsMessage: MESSAGE_ACTIONS.has(action),
      });
    }
  }
  if (viewerIsInitiator && lifecycleStatus !== 'closed') {
    if (params.matterType === 'question') {
      if (!options.some((item) => item.action === 'confirm_resolved')) {
        options.push({ action: 'confirm_resolved', needsTarget: false, needsMessage: false });
      }
      if (!options.some((item) => item.action === 'revealed_issue')) {
        options.push({ action: 'revealed_issue', needsTarget: false, needsMessage: true });
      }
    }
    if (!options.some((item) => item.action === 'close')) {
      options.push({ action: 'close', needsTarget: false, needsMessage: true });
    }
  }
  return options;
}

export function commentDoesNotCompleteAction(): true {
  return true;
}

export const MATTER_QUEUES = ['needs_action', 'mine', 'participating', 'organization'] as const;
export type MatterQueue = (typeof MATTER_QUEUES)[number];

export type MatterListRow = {
  matter: Matter;
  currentAction: MatterActionRequirement | null;
  pendingActions: MatterActionRequirement[];
  derivedStatus: DerivedMatterStatus;
  ball: BallIsWithCopy | null;
  workSummary: MatterWorkSummary | null;
};

export type MatterWorkSummary = {
  started: boolean;
  completed: boolean;
  completionKind: 'normal' | 'with_outstanding_work' | null;
  total: number;
  completedTasks: number;
  blocked: number;
  open: number;
  outstanding: number;
  outstandingTasks: { id: string; title: string; status: string }[];
};

export function workProgressLine(summary: MatterWorkSummary | null): string | null {
  if (!summary?.started) return null;
  if (summary.completed && summary.completionKind === 'with_outstanding_work') {
    return 'Work complete with outstanding Tasks — awaiting final response';
  }
  if (summary.completed && summary.outstanding === 0) return 'Work complete — awaiting final response';
  if (!summary.completed && summary.outstanding > 0) {
    return `Collaborative work has outstanding Tasks · ${summary.outstanding} still open`;
  }
  if (summary.total === 0) return 'Work in progress';
  const blocked = summary.blocked > 0 ? ` · ${summary.blocked} blocked` : '';
  return `Work in progress · ${summary.completedTasks} of ${summary.total} Tasks completed${blocked}`;
}
