import { type ActionRequirementType, type FormalActionType, type MatterLifecycle, type MatterType } from '@/lib/matters-constants';
import { type BallIsWithCopy, type DerivedMatterStatus, type Matter, type MatterActionRequirement } from '@/lib/matters-types';
import { actionExpectedCopy, actorLabel, formatDueDate, formatDueIn, formatRemaining, viewerRepresents } from '@/lib/matters-logic';

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
  if (viewerIsInitiator) {
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

/** `public` is the browsable list of public Matters (step 2.1); the others are the member's own queues. */
export const MATTER_QUEUES = ['public', 'needs_action', 'mine', 'participating', 'organization'] as const;
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
