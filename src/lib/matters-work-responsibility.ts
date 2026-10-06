import { actorsEqual, type MatterActionRequirement, type MatterActorRef } from '@/lib/matters';
import { type MatterResponsibility } from '@/lib/matters-work';
import { type MatterEngineContext } from '@/lib/matters-workflow';
import { type WorkEngineState, assignScoped, cloneWorkState, completeAction, iso, log, nextId } from '@/lib/matters-work-core';

export function requestSharedResponsibility(
  state: WorkEngineState,
  ctx: MatterEngineContext,
  input: { actor: MatterActorRef; target: MatterActorRef },
): WorkEngineState {
  const next = cloneWorkState(state);
  const existing = next.responsibilities.find(
    (row) => row.kind === 'collaborator' && actorsEqual(row.actor, input.target),
  );
  const row: MatterResponsibility = existing ?? {
    id: nextId(ctx, 'res'),
    matterId: next.matter.id,
    kind: 'collaborator',
    actor: input.target,
    status: 'proposed',
    assignedAt: iso(ctx.now),
    assignedBy: input.actor,
    acceptedAt: null,
    declinedAt: null,
    responseAction: null,
    responseReason: null,
    suggestedActor: null,
  };
  row.status = 'proposed';
  row.assignedBy = input.actor;
  row.assignedAt = iso(ctx.now);
  row.acceptedAt = null;
  row.declinedAt = null;
  if (!existing) next.responsibilities.push(row);
  log(next, ctx, 'shared_responsibility_requested', `Shared responsibility requested from ${input.target.displayName || 'a party'}.`, input.actor, {
    responsibilityId: row.id,
  });
  assignScoped(next, ctx, 'shared_responsibility_response', input.target, 'responsibility_response', 'responsibility', row.id);
  return next;
}

export function performSharedResponsibilityAction(
  next: WorkEngineState,
  ctx: MatterEngineContext,
  action: MatterActionRequirement,
  input: { actor: MatterActorRef; action: string; message?: string; target?: MatterActorRef },
): WorkEngineState {
  const resp = next.responsibilities.find((row) => row.id === action.contextId);
  if (action.actionType === 'clarify') {
    completeAction(next, ctx, action.id, input.actor, 'respond');
    if (resp && resp.status === 'proposed') {
      assignScoped(next, ctx, 'shared_responsibility_response', resp.actor, 'responsibility_response', 'responsibility', resp.id);
      log(next, ctx, 'shared_responsibility_clarified', input.message?.trim() || 'Clarification provided on the shared-responsibility request.', input.actor, {
        responsibilityId: resp.id,
        reason: input.message ?? null,
      });
    }
    return next;
  }
  if (!resp) throw new Error('Shared responsibility request not found.');
  if (input.action === 'accept' || input.action === 'accept_partially') {
    resp.status = 'accepted';
    resp.acceptedAt = iso(ctx.now);
    resp.responseAction = input.action === 'accept_partially' ? 'accept_partially' : 'accept';
    resp.responseReason = input.message ?? null;
    completeAction(next, ctx, action.id, input.actor, input.action);
    log(next, ctx, 'shared_responsibility_accepted', `${resp.actor.displayName || 'A party'} accepted shared responsibility.`, input.actor, {
      responsibilityId: resp.id,
      response: input.action,
      reason: input.message ?? null,
    });
    return next;
  }
  if (input.action === 'decline' || input.action === 'dispute') {
    resp.status = 'declined';
    resp.declinedAt = iso(ctx.now);
    resp.responseAction = 'decline';
    resp.responseReason = input.message ?? null;
    completeAction(next, ctx, action.id, input.actor, 'decline');
    log(next, ctx, 'shared_responsibility_declined', `${resp.actor.displayName || 'A party'} declined shared responsibility${input.message ? `: ${input.message}` : '.'}`, input.actor, {
      responsibilityId: resp.id,
      response: 'decline',
      reason: input.message ?? null,
    });
    return next;
  }
  if (input.action === 'request_clarification') {
    completeAction(next, ctx, action.id, input.actor, 'request_clarification');
    log(next, ctx, 'shared_responsibility_clarification_requested', input.message?.trim() || 'Clarification requested before accepting shared responsibility.', input.actor, {
      responsibilityId: resp.id,
      reason: input.message ?? null,
    });
    if (resp.assignedBy) {
      assignScoped(next, ctx, 'clarify', resp.assignedBy, 'clarification_response', 'responsibility', resp.id);
    }
    return next;
  }
  if (input.action === 'suggest_actor' || input.action === 'suggest_another') {
    if (!input.target) throw new Error('Choose who should share responsibility instead.');
    resp.status = 'declined';
    resp.declinedAt = iso(ctx.now);
    resp.responseAction = 'suggest_actor';
    resp.responseReason = input.message ?? null;
    resp.suggestedActor = input.target;
    completeAction(next, ctx, action.id, input.actor, 'suggest_actor');
    log(next, ctx, 'shared_responsibility_declined', `${resp.actor.displayName || 'A party'} suggested ${input.target.displayName || 'another actor'} instead${input.message ? `: ${input.message}` : '.'}`, input.actor, {
      responsibilityId: resp.id,
      response: 'suggest_actor',
      reason: input.message ?? null,
      suggestedProfileId: input.target.profileId,
    });
    return requestSharedResponsibility(next, ctx, { actor: input.actor, target: input.target });
  }
  throw new Error('That action is not available.');
}
