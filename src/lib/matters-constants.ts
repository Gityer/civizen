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
