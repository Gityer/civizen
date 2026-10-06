import { type ActionRequirementStatus, type ActionRequirementType, type CloseKind, type FormalActionType, type MatterActorRef, type MatterLifecycle, type MatterScopeKind, type MatterType, type MatterVisibility, type TimeoutBehavior } from '@/lib/matters-constants';

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
