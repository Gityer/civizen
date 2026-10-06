import { computeDueAt, getTimingPolicy, resolveEscalationPolicyId, type MatterActionRequirement, type MatterActorRef } from '@/lib/matters';
import { type CollaborationTask, type MatterDecision, type MatterResponsibility, type TaskAssignment } from '@/lib/matters-work';
import { type MatterEngineContext, type MatterEngineState } from '@/lib/matters-workflow';

export type WorkEngineState = MatterEngineState & {
  tasks: CollaborationTask[];
  responsibilities: MatterResponsibility[];
  decisions: MatterDecision[];
};

export function nextId(ctx: MatterEngineContext, prefix: string): string {
  ctx.idSeq += 1;
  return `${prefix}-${ctx.idSeq}`;
}

export function iso(date: Date): string {
  return date.toISOString();
}

function systemActor(): MatterActorRef {
  return { kind: 'system', profileId: null, displayName: 'Civizen' };
}

export function cloneWorkState(state: WorkEngineState): WorkEngineState {
  return {
    ...state,
    matter: { ...state.matter },
    actions: state.actions.map((row) => ({ ...row })),
    parties: [...state.parties],
    comments: [...state.comments],
    events: [...state.events],
    attachments: [...state.attachments],
    reminders: [...state.reminders],
    tasks: state.tasks.map((task) => ({
      ...task,
      assignments: task.assignments.map((row) => ({ ...row })),
      dependencies: [...task.dependencies],
    })),
    responsibilities: [...state.responsibilities],
    decisions: state.decisions.map((row) => ({ ...row, taskIds: [...row.taskIds] })),
  };
}

export function log(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  type: string,
  summary: string,
  actor: MatterActorRef,
  payload: Record<string, unknown> = {},
) {
  state.events.push({
    id: nextId(ctx, 'evt'),
    matterId: state.matter.id,
    eventType: type,
    actor,
    isSystem: actor.kind === 'system',
    summary,
    payload,
    createdAt: iso(ctx.now),
  });
}

export function assignScoped(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  actionType: MatterActionRequirement['actionType'],
  assigned: MatterActorRef,
  policyId: string,
  contextKind: MatterActionRequirement['contextKind'],
  contextId: string | null,
  taskTitle?: string,
): MatterActionRequirement {
  for (const action of state.actions) {
    if (
      (action.status === 'pending' || action.status === 'overdue')
      && action.contextKind === contextKind
      && action.contextId === contextId
    ) {
      action.status = 'superseded';
    }
  }
  const policy = getTimingPolicy(policyId, ctx.policies);
  const { dueAt, reminderAt } = computeDueAt(ctx.now, policy);
  const action: MatterActionRequirement = {
    id: nextId(ctx, 'act'),
    matterId: state.matter.id,
    actionType,
    assignedActor: assigned,
    createdAt: iso(ctx.now),
    dueAt: iso(dueAt),
    reminderAt: iso(reminderAt),
    timingPolicyId: policy.id,
    status: 'pending',
    completedAt: null,
    completedBy: null,
    completionAction: null,
    timeoutAction: 'remind',
    escalationPolicyId: resolveEscalationPolicyId({
      matterType: state.matter.matterType,
      actionType,
    }),
    contextKind,
    contextId,
    taskTitle: taskTitle ?? null,
  };
  state.actions.push(action);
  state.currentAction = action;
  state.matter.currentActionId = action.id;
  state.matter.waitingCondition = null;
  state.matter.lifecycleStatus = 'active';
  state.reminders.push({ actionId: action.id, kind: 'assigned' });
  log(state, ctx, 'action_assigned', `Action assigned to ${assigned.displayName || 'a party'}.`, systemActor(), {
    actionType,
    contextKind,
    contextId,
  });
  return action;
}

export function completeAction(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  actionId: string,
  actor: MatterActorRef,
  completion: string,
) {
  const action = state.actions.find((row) => row.id === actionId);
  if (!action || (action.status !== 'pending' && action.status !== 'overdue')) return;
  action.status = 'completed';
  action.completedAt = iso(ctx.now);
  action.completedBy = actor;
  action.completionAction = completion as MatterActionRequirement['completionAction'];
  if (state.currentAction?.id === actionId) state.currentAction = action;
  log(state, ctx, 'action_completed', `Formal action completed: ${completion.replaceAll('_', ' ')}.`, actor, {
    completionAction: completion,
  });
}

export function isBlocked(state: WorkEngineState, task: CollaborationTask): boolean {
  return task.dependencies.some((dep) => {
    const other = state.tasks.find((row) => row.id === dep.dependsOnTaskId);
    return other ? other.status !== 'completed' : false;
  });
}

export function leadAssignment(task: CollaborationTask): TaskAssignment | undefined {
  return [...task.assignments]
    .reverse()
    .find((row) => row.role === 'lead' && (row.acceptanceStatus === 'pending' || row.acceptanceStatus === 'accepted'));
}

export function activateTask(state: WorkEngineState, ctx: MatterEngineContext, taskId: string) {
  const task = state.tasks.find((row) => row.id === taskId);
  if (!task || task.status === 'completed' || task.status === 'cancelled' || task.status === 'declined') return;
  if (isBlocked(state, task)) {
    task.status = 'blocked';
    task.waitingCondition = 'Waiting on a blocking Task.';
    task.isBlocked = true;
    log(state, ctx, 'task_blocked', `Task "${task.title}" is waiting on a dependency.`, systemActor(), { taskId });
    return;
  }
  task.isBlocked = false;
  const lead = leadAssignment(task);
  if (!lead) {
    task.status = 'proposed';
    return;
  }
  if (lead.acceptanceStatus === 'accepted') {
    task.status = 'in_progress';
    task.startAt = task.startAt ?? iso(ctx.now);
    task.waitingCondition = null;
    const action = assignScoped(state, ctx, 'complete_task', lead.actor, 'task_execution', 'task', task.id, task.title);
    task.currentActionId = action.id;
    log(state, ctx, 'task_started', `Task "${task.title}" is ready to complete.`, systemActor(), { taskId });
  } else {
    task.status = 'awaiting_acceptance';
    const action = assignScoped(state, ctx, 'accept_task', lead.actor, 'task_acceptance', 'task', task.id, task.title);
    task.currentActionId = action.id;
  }
}

export function releaseDependents(state: WorkEngineState, ctx: MatterEngineContext, completedId: string) {
  for (const task of state.tasks) {
    if (!task.dependencies.some((dep) => dep.dependsOnTaskId === completedId)) continue;
    if (!isBlocked(state, task)) {
      log(state, ctx, 'dependency_cleared', 'A blocking Task completed. Downstream work can continue.', systemActor(), {
        completedTaskId: completedId,
        taskId: task.id,
      });
      activateTask(state, ctx, task.id);
    }
  }
}

export function asWorkState(state: MatterEngineState): WorkEngineState {
  if ('tasks' in state && Array.isArray((state as WorkEngineState).tasks)) {
    return state as WorkEngineState;
  }
  return { ...state, tasks: [], responsibilities: [], decisions: [] };
}

export function startCollaborativeWork(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  actor: MatterActorRef,
): WorkEngineState {
  const next = cloneWorkState(asWorkState(state));
  if (next.matter.lifecycleStatus === 'closed') throw new Error('This Matter is closed.');
  if (next.matter.collaborativeWorkStartedAt) return next;
  next.matter.collaborativeWorkStartedAt = iso(ctx.now);
  next.matter.waitingCondition = 'Work in progress';
  next.matter.lifecycleStatus = 'active';
  next.responsibilities.push({
    id: nextId(ctx, 'res'),
    matterId: next.matter.id,
    kind: 'lead',
    actor,
    status: 'accepted',
    assignedAt: iso(ctx.now),
  });
  const current = next.currentAction;
  if (current && (current.status === 'pending' || current.status === 'overdue') && current.contextKind === 'matter') {
    completeAction(next, ctx, current.id, actor, 'start_collaborative_work');
  }
  log(
    next,
    ctx,
    'collaborative_work_started',
    'Collaborative work started. Tasks can be assigned without resolving the Matter.',
    actor,
  );
  return next;
}
