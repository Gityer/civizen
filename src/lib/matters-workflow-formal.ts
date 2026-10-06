import { actorsEqual, getMatterTypeDefault, type ActionRequirementType, type FormalActionType, type Matter, type MatterActorRef, type ReopenReason } from '@/lib/matters';
import { type MatterEngineContext, type MatterEngineState, addParty, assignAction, completeCurrent, iso, logEvent } from '@/lib/matters-workflow-core';
import { assertFormalActionAllowed, assignConfirmation, closeMatter, requirePendingAction } from '@/lib/matters-workflow-create';

export function performFormalAction<S extends MatterEngineState>(
  state: S,
  ctx: MatterEngineContext,
  input: {
    actor: MatterActorRef;
    action: FormalActionType;
    message?: string;
    target?: MatterActorRef;
    reopenReason?: ReopenReason;
  },
): S {
  const next: S = {
    ...state,
    matter: { ...state.matter },
    currentAction: state.currentAction ? { ...state.currentAction } : null,
    actions: [...state.actions],
    parties: [...state.parties],
    comments: [...state.comments],
    events: [...state.events],
    attachments: [...state.attachments],
    reminders: [...state.reminders],
  };

  assertFormalActionAllowed(next, input.actor, input.action);

  if (input.action === 'reopen') {
    if (next.matter.lifecycleStatus !== 'closed') throw new Error('Only a closed Matter can be reopened.');
    const reason = input.message?.trim() || input.reopenReason || 'other';
    next.matter = {
      ...next.matter,
      lifecycleStatus: 'active',
      lastReopenedAt: iso(ctx.now),
      reopenCount: next.matter.reopenCount + 1,
      updatedAt: iso(ctx.now),
      closeKind: next.matter.closeKind,
      closeReason: next.matter.closeReason,
      closedAt: next.matter.closedAt,
    };
    logEvent(
      next,
      ctx,
      'matter_reopened',
      `Matter reopened. Previous closure remains on the record. Reason: ${String(reason).replaceAll('_', ' ')}.`,
      input.actor,
      false,
      { reopenReason: reason, previousCloseKind: next.matter.closeKind, previousCloseReason: next.matter.closeReason },
    );
    const defaults = getMatterTypeDefault(next.matter.matterType);
    assignAction(
      next,
      ctx,
      defaults.initialActionType,
      next.matter.responsible.profileId ? next.matter.responsible : next.matter.addressee,
      defaults.timingPolicyId,
      defaults.timeoutBehavior,
    );
    return next;
  }

  if (input.action === 'revealed_issue') {
    logEvent(
      next,
      ctx,
      'question_revealed_issue',
      input.message?.trim()
        || 'The initiator recorded that this Question revealed an Issue. The Matter stays a Question; type conversion is not applied.',
      input.actor,
      false,
    );
    if (next.currentAction?.actionType === 'confirm_resolution') {
      completeCurrent(next, ctx, input.actor, 'revealed_issue');
      assignAction(next, ctx, 'respond', next.matter.responsible, 'question_response', 'remind');
    }
    return next;
  }

  if (
    input.action === 'confirm_resolved'
    && actorsEqual(next.matter.initiator, input.actor)
    && next.matter.matterType === 'question'
  ) {
    completeCurrent(next, ctx, input.actor, 'confirm_resolved');
    closeMatter(next, ctx, input.actor, 'confirmed_resolution', 'Initiator confirmed resolution.', false);
    return next;
  }

  if (next.matter.lifecycleStatus === 'closed') {
    throw new Error('This Matter is closed.');
  }

  if (input.action === 'close') {
    completeCurrent(next, ctx, input.actor, 'close');
    closeMatter(next, ctx, input.actor, 'manual', input.message?.trim() || 'Closed by the initiator.', false);
    return next;
  }

  const current = requirePendingAction(next);

  switch (input.action) {
    case 'respond': {
      completeCurrent(next, ctx, input.actor, 'respond');
      logEvent(next, ctx, 'final_answer_provided', input.message?.trim() || 'A final answer was provided.', input.actor, false);
      if (current.actionType === 'clarify') {
        assignAction(next, ctx, 'respond', next.matter.responsible, 'question_response', 'remind');
      } else {
        assignConfirmation(next, ctx);
      }
      break;
    }
    case 'request_clarification': {
      completeCurrent(next, ctx, input.actor, 'request_clarification');
      logEvent(next, ctx, 'clarification_requested', input.message?.trim() || 'Clarification requested.', input.actor, false);
      assignAction(next, ctx, 'clarify', next.matter.initiator, 'clarification_response', 'remind');
      break;
    }
    case 'forward':
    case 'redirect': {
      if (!input.target?.profileId) throw new Error('Choose who should receive this Matter.');
      completeCurrent(next, ctx, input.actor, input.action);
      addParty(next, ctx, input.action === 'forward' ? 'invitee' : 'responsible', input.target);
      if (input.action === 'redirect') {
        next.matter = { ...next.matter, responsible: input.target, updatedAt: iso(ctx.now) };
        addParty(next, ctx, 'responsible', input.target);
      }
      logEvent(
        next,
        ctx,
        input.action === 'forward' ? 'forwarded' : 'redirected',
        input.action === 'redirect'
          ? `Responsibility redirected to ${input.target.displayName || 'another party'}. The Matter remains active.`
          : `Forwarded to ${input.target.displayName || 'another party'}. The Matter remains active.`,
        input.actor,
        false,
        { targetProfileId: input.target.profileId },
      );
      const nextType: ActionRequirementType =
        current.actionType === 'responsibility_response' ? 'responsibility_response' : current.actionType === 'address' ? 'address' : 'respond';
      const policyId =
        nextType === 'responsibility_response' ? 'responsibility_response' : nextType === 'address' ? 'address_work' : 'question_response';
      assignAction(next, ctx, nextType, input.target, policyId, 'remind');
      break;
    }
    case 'invite_party': {
      if (!input.target?.profileId) throw new Error('Choose who to invite.');
      addParty(next, ctx, 'invitee', input.target);
      addParty(next, ctx, 'participant', input.target);
      logEvent(next, ctx, 'party_invited', `Invited ${input.target.displayName || 'another party'}.`, input.actor, false);
      break;
    }
    case 'accept_responsibility':
    case 'accept_jointly':
    case 'partially_accept': {
      completeCurrent(next, ctx, input.actor, input.action);
      next.matter = { ...next.matter, responsible: input.actor, updatedAt: iso(ctx.now) };
      addParty(next, ctx, 'responsible', input.actor);
      logEvent(
        next,
        ctx,
        'responsibility_accepted',
        input.action === 'partially_accept'
          ? input.message?.trim() || 'Responsibility partially accepted.'
          : input.action === 'accept_jointly'
            ? 'Responsibility accepted jointly.'
            : 'Responsibility accepted.',
        input.actor,
        false,
        { action: input.action },
      );
      assignAction(next, ctx, 'address', input.actor, 'address_work', 'remind');
      break;
    }
    case 'dispute_responsibility': {
      completeCurrent(next, ctx, input.actor, 'dispute_responsibility');
      logEvent(
        next,
        ctx,
        'responsibility_disputed',
        input.message?.trim() || 'Responsibility disputed. The Matter stays active.',
        input.actor,
        false,
      );
      assignAction(next, ctx, 'choose_next_party', next.matter.initiator, 'responsibility_response', 'remind');
      break;
    }
    case 'mark_no_action_required': {
      completeCurrent(next, ctx, input.actor, 'mark_no_action_required');
      logEvent(next, ctx, 'no_action_required_marked', input.message?.trim() || 'Marked as no action required.', input.actor, false);
      assignConfirmation(next, ctx);
      break;
    }
    case 'mark_addressed': {
      completeCurrent(next, ctx, input.actor, 'mark_addressed');
      logEvent(next, ctx, 'marked_addressed', input.message?.trim() || 'Marked as addressed with a final response.', input.actor, false);
      assignConfirmation(next, ctx);
      break;
    }
    case 'confirm_resolved': {
      completeCurrent(next, ctx, input.actor, 'confirm_resolved');
      closeMatter(next, ctx, input.actor, 'confirmed_resolution', 'Initiator confirmed resolution.', false);
      break;
    }
    case 'confirm_partially_resolved': {
      completeCurrent(next, ctx, input.actor, 'confirm_partially_resolved');
      logEvent(
        next,
        ctx,
        'resolution_partially_accepted',
        input.message?.trim() || 'Initiator marked this as partially resolved.',
        input.actor,
        false,
      );
      assignAction(next, ctx, 'address', next.matter.responsible, 'resolution_followup', 'remind', {
        contextKind: 'resolution',
        contextId: next.matter.latestResolutionId,
      });
      break;
    }
    case 'confirm_not_resolved': {
      completeCurrent(next, ctx, input.actor, 'confirm_not_resolved');
      logEvent(next, ctx, 'resolution_rejected', input.message?.trim() || 'Initiator reported that this is not resolved.', input.actor, false);
      assignAction(next, ctx, 'address', next.matter.responsible, 'address_work', 'remind');
      break;
    }
    case 'need_clarification': {
      completeCurrent(next, ctx, input.actor, 'need_clarification');
      logEvent(next, ctx, 'clarification_requested', input.message?.trim() || 'Need more information — discussion continues.', input.actor, false);
      assignAction(next, ctx, 'respond', next.matter.responsible, 'clarification_response', 'remind');
      break;
    }
    default:
      throw new Error('That action is not available.');
  }
  return next;
}
