import { actorsEqual, formalActionsForContext, getMatterTypeDefault, type CloseKind, type FormalActionType, type Matter, type MatterActionRequirement, type MatterActorRef, type MatterTimingPolicy, type MatterType, type MatterVisibility, DEFAULT_TIMING_POLICIES } from '@/lib/matters';
import { type MatterEngineContext, type MatterEngineState, addParty, assignAction, iso, logEvent, nextId } from '@/lib/matters-workflow-core';

export function createMatterEngineContext(
  now: Date = new Date(),
  policies: readonly MatterTimingPolicy[] = DEFAULT_TIMING_POLICIES,
): MatterEngineContext {
  return { now, policies, idSeq: 0 };
}

export type CreateMatterInput = {
  title: string;
  description: string;
  matterType: MatterType;
  initiator: MatterActorRef;
  addressee: MatterActorRef;
  visibility?: MatterVisibility;
  areaNodeId?: string | null;
  createdByProfileId: string;
  evidenceUrl?: string | null;
  evidenceLabel?: string | null;
  submit?: boolean;
};

export function createMatter(input: CreateMatterInput, ctx: MatterEngineContext): MatterEngineState {
  const id = nextId(ctx, 'mat');
  const createdAt = iso(ctx.now);
  const submit = input.submit !== false;
  const matter: Matter = {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    matterType: input.matterType,
    lifecycleStatus: submit ? 'submitted' : 'draft',
    visibility: input.visibility ?? 'participants',
    areaNodeId: input.areaNodeId ?? null,
    scopeKind: 'global',
    scopeCountryCode: null,
    scopeRegionCode: null,
    scopeLocalityCode: null,
    initiator: input.initiator,
    addressee: input.addressee,
    responsible: input.addressee,
    currentActionId: null,
    waitingCondition: null,
    closeKind: null,
    closeReason: null,
    createdByProfileId: input.createdByProfileId,
    createdAt,
    submittedAt: submit ? createdAt : null,
    closedAt: null,
    lastReopenedAt: null,
    reopenCount: 0,
    updatedAt: createdAt,
    collaborativeWorkStartedAt: null,
    collaborativeWorkCompletedAt: null,
    collaborativeWorkCompletionKind: null,
    collaborativeWorkCompletionReason: null,
  };
  const state: MatterEngineState = {
    matter,
    currentAction: null,
    actions: [],
    parties: [],
    comments: [],
    events: [],
    attachments: [],
    reminders: [],
  };
  addParty(state, ctx, 'initiator', input.initiator);
  addParty(state, ctx, 'addressee', input.addressee);
  addParty(state, ctx, 'responsible', input.addressee);
  logEvent(state, ctx, 'matter_created', 'Matter created.', input.initiator, false);
  if (input.evidenceUrl?.trim()) {
    state.attachments.push({
      id: nextId(ctx, 'att'),
      matterId: id,
      commentId: null,
      kind: 'url',
      filePath: null,
      fileName: null,
      url: input.evidenceUrl.trim(),
      label: input.evidenceLabel?.trim() || null,
      bodyText: null,
      visibility: null,
      uploadedByProfileId: input.createdByProfileId,
      createdAt,
      taskId: null,
      decisionId: null,
    });
  }
  if (submit) {
    logEvent(state, ctx, 'matter_submitted', 'Matter submitted.', input.initiator, false);
    logEvent(state, ctx, 'recipient_assigned', `Addressed to ${input.addressee.displayName || 'the intended party'}.`, input.initiator, false);
    const defaults = getMatterTypeDefault(input.matterType);
    assignAction(state, ctx, defaults.initialActionType, input.addressee, defaults.timingPolicyId, defaults.timeoutBehavior);
  }
  return state;
}

export function addMatterComment(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  input: {
    author: MatterActorRef;
    body: string;
    parentId?: string | null;
    mentionedProfileIds?: string[];
  },
): MatterEngineState {
  const next: MatterEngineState = {
    ...state,
    comments: [...state.comments],
    events: [...state.events],
  };
  next.comments.push({
    id: nextId(ctx, 'cmt'),
    matterId: state.matter.id,
    parentId: input.parentId ?? null,
    author: input.author,
    body: input.body.trim(),
    mentionedProfileIds: input.mentionedProfileIds ?? [],
    visibility: null,
    createdAt: iso(ctx.now),
    taskId: null,
  });
  logEvent(next, ctx, 'comment_added', 'Comment posted. This did not complete the required action.', input.author, false);
  return next;
}

export function requirePendingAction(state: MatterEngineState): MatterActionRequirement {
  const action = state.currentAction;
  if (!action || (action.status !== 'pending' && action.status !== 'overdue')) {
    throw new Error('No pending action on this Matter.');
  }
  return action;
}

export function closeMatter(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  actor: MatterActorRef,
  closeKind: CloseKind,
  reason: string,
  isSystem: boolean,
): void {
  if (state.currentAction && (state.currentAction.status === 'pending' || state.currentAction.status === 'overdue')) {
    state.currentAction = {
      ...state.currentAction,
      status: isSystem ? 'expired' : 'cancelled',
      completedAt: iso(ctx.now),
      completedBy: actor,
    };
    const index = state.actions.findIndex((row) => row.id === state.currentAction?.id);
    if (index >= 0) state.actions[index] = state.currentAction;
  }
  state.matter = {
    ...state.matter,
    lifecycleStatus: 'closed',
    closeKind,
    closeReason: reason,
    closedAt: iso(ctx.now),
    currentActionId: state.currentAction?.id ?? null,
    waitingCondition: null,
    updatedAt: iso(ctx.now),
  };
  const eventType = isSystem ? 'matter_auto_closed' : 'matter_manually_closed';
  logEvent(state, ctx, eventType, reason, actor, isSystem, { closeKind });
}

export function assignConfirmation(state: MatterEngineState, ctx: MatterEngineContext): void {
  assignAction(
    state,
    ctx,
    'review_resolution',
    state.matter.initiator,
    'resolution_review',
    'auto_close',
  );
}

export function assertFormalActionAllowed(
  state: MatterEngineState,
  actor: MatterActorRef,
  action: FormalActionType,
): void {
  const options = formalActionsForContext({
    lifecycleStatus: state.matter.lifecycleStatus,
    currentAction: state.currentAction,
    viewerProfileId: actor.profileId || '',
    viewerIsInitiator: actorsEqual(state.matter.initiator, actor),
    matterType: state.matter.matterType,
  });
  if (!options.some((option) => option.action === action)) {
    throw new Error('That action is not available.');
  }
}

/** Generic over the state so callers holding a richer state (work, resolution) keep its type. */
