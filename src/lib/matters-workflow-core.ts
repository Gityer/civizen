import { actionExpectedCopy, actorsEqual, computeDueAt, getTimingPolicy, type ActionRequirementType, type FormalActionType, type Matter, type MatterActionRequirement, type MatterActorRef, type MatterAttachment, type MatterComment, type MatterEvent, type MatterParty, type MatterTimingPolicy, type TimeoutBehavior, resolveEscalationPolicyId } from '@/lib/matters';

export type MatterEngineState = {
  matter: Matter;
  currentAction: MatterActionRequirement | null;
  actions: MatterActionRequirement[];
  parties: MatterParty[];
  comments: MatterComment[];
  events: MatterEvent[];
  attachments: MatterAttachment[];
  reminders: Array<{ actionId: string; kind: 'assigned' | 'approaching' | 'overdue' }>;
};

export type MatterEngineContext = {
  now: Date;
  policies: readonly MatterTimingPolicy[];
  idSeq: number;
};

export function nextId(ctx: MatterEngineContext, prefix: string): string {
  ctx.idSeq += 1;
  return `${prefix}-${ctx.idSeq}`;
}

export function iso(date: Date): string {
  return date.toISOString();
}

export function systemActor(): MatterActorRef {
  return { kind: 'system', profileId: null, displayName: 'Civizen' };
}

export function logEvent(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  eventType: string,
  summary: string,
  actor: MatterActorRef,
  isSystem: boolean,
  payload: Record<string, unknown> = {},
): void {
  state.events.push({
    id: nextId(ctx, 'evt'),
    matterId: state.matter.id,
    eventType,
    actor,
    isSystem,
    summary,
    payload,
    createdAt: iso(ctx.now),
  });
}

export function addParty(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  role: MatterParty['role'],
  actor: MatterActorRef,
): void {
  const exists = state.parties.some(
    (party) => party.role === role && actorsEqual(party.actor, actor),
  );
  if (exists) return;
  state.parties.push({
    id: nextId(ctx, 'pty'),
    matterId: state.matter.id,
    role,
    actor,
    addedAt: iso(ctx.now),
  });
}

function supersedeCurrent(state: MatterEngineState, ctx: MatterEngineContext): void {
  if (!state.currentAction) return;
  if (state.currentAction.status === 'pending' || state.currentAction.status === 'overdue') {
    state.currentAction = { ...state.currentAction, status: 'superseded' };
    const index = state.actions.findIndex((row) => row.id === state.currentAction?.id);
    if (index >= 0) state.actions[index] = state.currentAction;
    logEvent(state, ctx, 'action_superseded', 'Previous action was replaced.', systemActor(), true);
  }
}

export function completeCurrent(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  actor: MatterActorRef,
  completionAction: FormalActionType,
): void {
  if (!state.currentAction) return;
  const completed: MatterActionRequirement = {
    ...state.currentAction,
    status: 'completed',
    completedAt: iso(ctx.now),
    completedBy: actor,
    completionAction,
  };
  state.currentAction = completed;
  const index = state.actions.findIndex((row) => row.id === completed.id);
  if (index >= 0) state.actions[index] = completed;
  logEvent(
    state,
    ctx,
    'action_completed',
    `Formal action completed: ${completionAction.replaceAll('_', ' ')}.`,
    actor,
    actor.kind === 'system',
    { completionAction },
  );
}

export function assignAction(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  actionType: ActionRequirementType,
  assignedActor: MatterActorRef,
  timingPolicyId: string,
  timeoutAction: TimeoutBehavior,
  options?: {
    contextKind?: MatterActionRequirement['contextKind'];
    contextId?: string | null;
    escalationPolicyId?: string | null;
  },
): MatterActionRequirement {
  if (state.currentAction && (state.currentAction.status === 'pending' || state.currentAction.status === 'overdue')) {
    supersedeCurrent(state, ctx);
  }
  const policy = getTimingPolicy(timingPolicyId, ctx.policies);
  const { dueAt, reminderAt } = computeDueAt(ctx.now, policy);
  const escalationPolicyId =
    options?.escalationPolicyId
    ?? resolveEscalationPolicyId({ matterType: state.matter.matterType, actionType });
  const action: MatterActionRequirement = {
    id: nextId(ctx, 'act'),
    matterId: state.matter.id,
    actionType,
    assignedActor,
    createdAt: iso(ctx.now),
    dueAt: iso(dueAt),
    reminderAt: iso(reminderAt),
    timingPolicyId: policy.id,
    status: 'pending',
    completedAt: null,
    completedBy: null,
    completionAction: null,
    timeoutAction,
    escalationPolicyId,
    contextKind: options?.contextKind ?? 'matter',
    contextId: options?.contextId ?? null,
  };
  state.actions.push(action);
  state.currentAction = action;
  state.matter = {
    ...state.matter,
    currentActionId: action.id,
    waitingCondition: null,
    lifecycleStatus: state.matter.lifecycleStatus === 'draft' ? 'submitted' : state.matter.lifecycleStatus === 'closed' ? 'active' : 'active',
    updatedAt: iso(ctx.now),
  };
  logEvent(state, ctx, 'action_assigned', `${actionExpectedCopy(actionType)} Assigned to ${assignedActor.displayName || 'a party'}.`, systemActor(), true, {
    actionType,
    timingPolicyId: policy.id,
    dueAt: action.dueAt,
  });
  logEvent(state, ctx, 'timer_started', `Timer started using ${policy.displayName}.`, systemActor(), true, {
    timingPolicyId: policy.id,
    dueAt: action.dueAt,
  });
  state.reminders.push({ actionId: action.id, kind: 'assigned' });
  logEvent(state, ctx, 'reminder_sent', 'Initial assignment notification sent.', systemActor(), true, {
    reminderKind: 'assigned',
  });
  return action;
}
