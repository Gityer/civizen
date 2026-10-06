import { actorsEqual, type MatterActionRequirement, type MatterActorRef } from '@/lib/matters';
import { type MatterDecision, outstandingWorkTasks } from '@/lib/matters-work';
import { type MatterEngineContext, addMatterComment } from '@/lib/matters-workflow';
import { type WorkEngineState, asWorkState, assignScoped, cloneWorkState, iso, log, nextId } from '@/lib/matters-work-core';

export function proposeDecision(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: {
    actor: MatterActorRef;
    title: string;
    statement: string;
    rationale?: string;
    taskIds?: string[];
    actorIsLead?: boolean;
  },
): WorkEngineState {
  const next = cloneWorkState(state);
  const decision: MatterDecision = {
    id: nextId(ctx, 'dec'),
    matterId: next.matter.id,
    title: input.title.trim(),
    statement: input.statement.trim(),
    rationale: input.rationale?.trim() || null,
    status: input.actorIsLead ? 'accepted' : 'proposed',
    proposedBy: input.actor,
    decidedBy: input.actorIsLead ? input.actor : null,
    createdAt: iso(ctx.now),
    decidedAt: input.actorIsLead ? iso(ctx.now) : null,
    taskIds: input.taskIds ?? [],
  };
  next.decisions.push(decision);
  log(next, ctx, 'decision_proposed', `Decision proposed: ${decision.title}.`, input.actor, { decisionId: decision.id });
  if (input.actorIsLead) {
    log(next, ctx, 'decision_accepted', `Decision accepted: ${decision.title}.`, input.actor, { decisionId: decision.id });
  } else {
    const lead = next.responsibilities.find((row) => row.kind === 'lead');
    if (lead) {
      assignScoped(next, ctx, 'confirm_decision', lead.actor, 'decision_confirmation', 'decision', decision.id);
    }
  }
  return next;
}


export function completeCollaborativeWork(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  actor: MatterActorRef,
  options?: { allowOutstanding?: boolean; reason?: string },
): WorkEngineState {
  const next = cloneWorkState(state);
  const outstanding = outstandingWorkTasks(next.tasks);
  if (outstanding.length > 0 && !options?.allowOutstanding) {
    throw new Error('Collaborative work still has outstanding Tasks. Cancel, reassign, replace, or waive them, or complete with outstanding work.');
  }
  if (outstanding.length > 0 && (options?.reason || '').trim().length < 3) {
    throw new Error('Explain why collaborative work is ending with outstanding Tasks.');
  }
  const snapshot = outstanding.map((task) => ({ id: task.id, title: task.title, status: task.status }));
  next.matter.collaborativeWorkCompletedAt = iso(ctx.now);
  next.matter.collaborativeWorkCompletionKind = outstanding.length > 0 ? 'with_outstanding_work' : 'normal';
  next.matter.collaborativeWorkCompletionReason = outstanding.length > 0 ? (options?.reason ?? null) : null;
  next.matter.waitingCondition = outstanding.length > 0
    ? 'Work complete with outstanding Tasks. The final response should explain what remained.'
    : 'Work complete — awaiting final response';
  if (outstanding.length > 0) {
    log(
      next,
      ctx,
      'collaborative_work_completed_with_outstanding',
      `Collaborative work completed with outstanding Tasks. Those Tasks were not marked completed. ${options?.reason}`,
      actor,
      { reason: options?.reason, outstandingTasks: snapshot, outstandingCount: outstanding.length },
    );
  } else {
    log(
      next,
      ctx,
      'collaborative_work_completed',
      'Collaborative work completed. A final Matter response is still required.',
      actor,
    );
  }
  assignScoped(next, ctx, 'propose_resolution', actor, 'final_work_response', 'matter', null);
  return next;
}

export function addTaskComment(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: { author: MatterActorRef; body: string; taskId: string },
): WorkEngineState {
  const next = asWorkState(addMatterComment(state, ctx, { author: input.author, body: input.body }));
  const comment = next.comments[next.comments.length - 1];
  if (comment) comment.taskId = input.taskId;
  return next;
}

export function pendingFor(state: WorkEngineState, actor: MatterActorRef): MatterActionRequirement[] {
  return state.actions.filter(
    (row) => (row.status === 'pending' || row.status === 'overdue') && actorsEqual(row.assignedActor, actor),
  );
}
