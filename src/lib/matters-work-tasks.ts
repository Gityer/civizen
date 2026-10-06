import { actorsEqual, type MatterActorRef } from '@/lib/matters';
import { type CollaborationTask, type TaskAssignment, type TaskDependency, taskDoesNotResolveMatter } from '@/lib/matters-work';
import { type MatterEngineContext } from '@/lib/matters-workflow';
import { type WorkEngineState, activateTask, asWorkState, assignScoped, cloneWorkState, completeAction, isBlocked, iso, leadAssignment, log, nextId, releaseDependents, startCollaborativeWork } from '@/lib/matters-work-core';
import { performSharedResponsibilityAction } from '@/lib/matters-work-responsibility';

export function createTask(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: {
    actor: MatterActorRef;
    title: string;
    description?: string;
    assignee?: MatterActorRef;
    reviewer?: MatterActorRef;
    reviewRequired?: boolean;
    parentTaskId?: string | null;
    dependsOn?: string[];
  },
): WorkEngineState {
  const next = !state.matter.collaborativeWorkStartedAt
    ? startCollaborativeWork(state, ctx, input.actor)
    : cloneWorkState(asWorkState(state));
  if (next.matter.lifecycleStatus === 'closed') throw new Error('This Matter is closed.');
  const deps: TaskDependency[] = (input.dependsOn ?? []).map((id) => {
    const other = next.tasks.find((row) => row.id === id);
    return {
      id: nextId(ctx, 'dep'),
      dependsOnTaskId: id,
      kind: 'blocked_by' as const,
      dependsOnTitle: other?.title ?? 'Task',
      dependsOnStatus: other?.status ?? 'proposed',
    };
  });
  const assignments: TaskAssignment[] = [];
  if (input.assignee) {
    assignments.push({
      id: nextId(ctx, 'asg'),
      taskId: '',
      role: 'lead',
      actor: input.assignee,
      assignedBy: input.actor,
      assignedAt: iso(ctx.now),
      acceptanceStatus: 'pending',
      acceptedAt: null,
      declinedAt: null,
      declineReason: null,
      suggestionReason: null,
    });
  }
  if (input.reviewer) {
    assignments.push({
      id: nextId(ctx, 'asg'),
      taskId: '',
      role: 'reviewer',
      actor: input.reviewer,
      assignedBy: input.actor,
      assignedAt: iso(ctx.now),
      acceptanceStatus: 'accepted',
      acceptedAt: iso(ctx.now),
      declinedAt: null,
      declineReason: null,
      suggestionReason: null,
    });
  }
  const task: CollaborationTask = {
    id: nextId(ctx, 'tsk'),
    matterId: next.matter.id,
    parentTaskId: input.parentTaskId ?? null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    priority: 'normal',
    status: input.assignee ? 'assigned' : 'proposed',
    createdBy: input.actor,
    lead: input.assignee ?? null,
    expectedOutcome: null,
    completionCriteria: null,
    reviewRequired: Boolean(input.reviewRequired || input.reviewer),
    currentActionId: null,
    waitingCondition: null,
    startAt: null,
    dueAt: null,
    submittedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: iso(ctx.now),
    updatedAt: iso(ctx.now),
    isBlocked: false,
    assignments,
    dependencies: deps,
  };
  for (const row of task.assignments) row.taskId = task.id;
  next.tasks.push(task);
  log(next, ctx, 'task_created', `Task created: ${task.title}.`, input.actor, { taskId: task.id });
  if (input.assignee) {
    log(next, ctx, 'task_assigned', `Task assigned to ${input.assignee.displayName || 'a party'}.`, input.actor, {
      taskId: task.id,
    });
  }
  activateTask(next, ctx, task.id);
  return next;
}

export function performTaskAction(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: { actor: MatterActorRef; actionId: string; action: string; message?: string; target?: MatterActorRef },
): WorkEngineState {
  const next = cloneWorkState(state);
  const action = next.actions.find((row) => row.id === input.actionId);
  if (!action || (action.status !== 'pending' && action.status !== 'overdue')) {
    throw new Error('No pending action.');
  }
  if (!actorsEqual(action.assignedActor, input.actor)) {
    throw new Error('That action is not assigned to you.');
  }
  if (action.actionType === 'shared_responsibility_response' || (action.contextKind === 'responsibility' && action.actionType === 'clarify')) {
    return performSharedResponsibilityAction(next, ctx, action, input);
  }
  const task = next.tasks.find((row) => row.id === action.contextId);
  if (action.actionType === 'accept_task' && task) {
    if (input.action === 'accept') {
      const lead = leadAssignment(task);
      if (lead) {
        lead.acceptanceStatus = 'accepted';
        lead.acceptedAt = iso(ctx.now);
      }
      completeAction(next, ctx, action.id, input.actor, 'accept');
      task.status = 'in_progress';
      task.startAt = task.startAt ?? iso(ctx.now);
      log(next, ctx, 'task_accepted', `Task "${task.title}" was accepted.`, input.actor, { taskId: task.id });
      const nextAction = assignScoped(
        next,
        ctx,
        'complete_task',
        action.assignedActor,
        'task_execution',
        'task',
        task.id,
        task.title,
      );
      task.currentActionId = nextAction.id;
      return next;
    }
    if (input.action === 'decline') {
      const lead = leadAssignment(task);
      if (lead) {
        lead.acceptanceStatus = 'declined';
        lead.declinedAt = iso(ctx.now);
        lead.declineReason = input.message ?? null;
      }
      completeAction(next, ctx, action.id, input.actor, 'decline');
      task.status = 'declined';
      log(
        next,
        ctx,
        'task_declined',
        `Task "${task.title}" was declined${input.message ? `: ${input.message}` : '.'}`,
        input.actor,
        { taskId: task.id, assignmentRole: 'lead', reason: input.message ?? null },
      );
      const responsible = next.responsibilities.find((row) => row.kind === 'lead' && row.status === 'accepted');
      if (responsible) {
        assignScoped(next, ctx, 'reconsider_task', responsible.actor, 'task_acceptance', 'task', task.id, task.title);
      }
      return next;
    }
    if (input.action === 'request_clarification') {
      completeAction(next, ctx, action.id, input.actor, 'request_clarification');
      task.status = 'waiting';
      task.waitingCondition = 'Clarification requested before acceptance.';
      const responsible = next.responsibilities.find((row) => row.kind === 'lead' && row.status === 'accepted');
      if (responsible) {
        assignScoped(next, ctx, 'reconsider_task', responsible.actor, 'clarification_response', 'task', task.id, task.title);
      }
      return next;
    }
    if (input.action === 'suggest_reassignment') {
      const lead = leadAssignment(task);
      if (lead) {
        lead.acceptanceStatus = 'suggested_reassignment';
        lead.suggestionReason = input.message ?? null;
      }
      completeAction(next, ctx, action.id, input.actor, 'suggest_reassignment');
      log(next, ctx, 'task_reassignment_suggested', input.message?.trim() || 'Reassignment suggested.', input.actor, {
        taskId: task.id,
        assignmentRole: 'lead',
        reason: input.message ?? null,
      });
      const responsible = next.responsibilities.find((row) => row.kind === 'lead' && row.status === 'accepted');
      if (responsible) {
        assignScoped(next, ctx, 'reconsider_task', responsible.actor, 'task_acceptance', 'task', task.id, task.title);
      }
      return next;
    }
  }
  if (action.actionType === 'complete_task' && task) {
    if (input.action === 'submit' || input.action === 'complete') {
      completeAction(next, ctx, action.id, input.actor, input.action);
      if (task.reviewRequired) {
        task.status = 'under_review';
        task.submittedAt = iso(ctx.now);
        log(next, ctx, 'task_submitted', `Work submitted for review: ${task.title}.`, input.actor, { taskId: task.id });
        const reviewer =
          task.assignments.find((row) => row.role === 'reviewer')?.actor
          ?? next.responsibilities.find((row) => row.kind === 'lead')?.actor;
        if (reviewer) {
          const review = assignScoped(next, ctx, 'review_task', reviewer, 'task_review', 'task', task.id, task.title);
          task.currentActionId = review.id;
        }
      } else {
        task.status = 'completed';
        task.submittedAt = iso(ctx.now);
        task.completedAt = iso(ctx.now);
        log(
          next,
          ctx,
          'task_completed',
          `Task completed: ${task.title}. This does not resolve the Matter.`,
          input.actor,
          { taskId: task.id },
        );
        void taskDoesNotResolveMatter();
        releaseDependents(next, ctx, task.id);
      }
      return next;
    }
  }
  if (action.actionType === 'review_task' && task) {
    if (input.action === 'accept_completion') {
      completeAction(next, ctx, action.id, input.actor, 'accept_completion');
      task.status = 'completed';
      task.completedAt = iso(ctx.now);
      log(
        next,
        ctx,
        'task_completed',
        `Reviewed and completed: ${task.title}. This does not resolve the Matter.`,
        input.actor,
        { taskId: task.id },
      );
      releaseDependents(next, ctx, task.id);
      return next;
    }
    if (input.action === 'request_changes') {
      completeAction(next, ctx, action.id, input.actor, 'request_changes');
      task.status = 'in_progress';
      log(next, ctx, 'changes_requested', input.message?.trim() || 'Changes requested on submitted work.', input.actor, {
        taskId: task.id,
      });
      if (task.lead) {
        const redo = assignScoped(next, ctx, 'complete_task', task.lead, 'task_execution', 'task', task.id, task.title);
        task.currentActionId = redo.id;
      }
      return next;
    }
  }
  if (action.actionType === 'reconsider_task' && task) {
    if (input.action === 'reassign' && input.target) {
      completeAction(next, ctx, action.id, input.actor, 'reassign');
      task.assignments.push({
        id: nextId(ctx, 'asg'),
        taskId: task.id,
        role: 'lead',
        actor: input.target,
        assignedBy: input.actor,
        assignedAt: iso(ctx.now),
        acceptanceStatus: 'pending',
        acceptedAt: null,
        declinedAt: null,
        declineReason: null,
        suggestionReason: null,
      });
      task.lead = input.target;
      task.status = 'assigned';
      log(next, ctx, 'task_assigned', `Task reassigned to ${input.target.displayName || 'a party'}.`, input.actor, {
        taskId: task.id,
      });
      activateTask(next, ctx, task.id);
      return next;
    }
    if (input.action === 'respond') {
      completeAction(next, ctx, action.id, input.actor, 'respond');
      activateTask(next, ctx, task.id);
      return next;
    }
    if (input.action === 'cancel_task' || input.action === 'waive') {
      completeAction(next, ctx, action.id, input.actor, input.action);
      task.status = 'cancelled';
      task.cancelledAt = iso(ctx.now);
      log(next, ctx, input.action === 'waive' ? 'task_waived' : 'task_cancelled', `Task ${input.action === 'waive' ? 'waived' : 'cancelled'}: ${task.title}.`, input.actor, {
        taskId: task.id,
        reason: input.message ?? null,
        waived: input.action === 'waive',
      });
      return next;
    }
  }
  if (action.actionType === 'confirm_decision') {
    const decision = next.decisions.find((row) => row.id === action.contextId);
    if (decision && input.action === 'accept') {
      completeAction(next, ctx, action.id, input.actor, 'accept');
      decision.status = 'accepted';
      decision.decidedBy = input.actor;
      decision.decidedAt = iso(ctx.now);
      log(next, ctx, 'decision_accepted', `Decision accepted: ${decision.title}.`, input.actor);
      return next;
    }
  }
  throw new Error('That action is not available.');
}
