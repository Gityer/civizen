import { describe, expect, it } from 'vitest';
import { buildBallIsWithCopy, deriveMatterStatus, formalActionsForContext, formatDueIn } from '@/lib/matters';
import { addMatterComment, createMatter, eventSummaries, performFormalAction, processTimeouts } from '@/lib/matters-workflow';
import { orgB, personA, personB, personC, start } from '@/test/matters-workflow-fixtures';

describe('Scenario F — redirect', () => {
  it('keeps the Matter active and assigns the next actor', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Billing question',
      description: 'Who handles invoices?',
      matterType: 'request',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, {
      actor: personB,
      action: 'redirect',
      target: personC,
      message: 'C handles this.',
    });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.matter.responsible.profileId).toBe('c');
    expect(state.currentAction?.assignedActor.profileId).toBe('c');
    expect(eventSummaries(state).some((row) => /redirected/i.test(row))).toBe(true);
  });
});

describe('Scenario G — ordinary comment', () => {
  it('does not complete the pending action requirement', () => {
    const ctx = start();
    let state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain.',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    const actionId = state.currentAction?.id;
    state = addMatterComment(state, ctx, {
      author: personB,
      body: 'We are reviewing this.',
    });
    expect(state.currentAction?.id).toBe(actionId);
    expect(state.currentAction?.status).toBe('pending');
    expect(state.currentAction?.completionAction).toBeNull();
  });
});

describe('Dispute does not close the Matter', () => {
  it('returns a choose-next-party action to the initiator', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Noise complaint',
      description: 'Late events.',
      matterType: 'issue',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, {
      actor: personB,
      action: 'dispute_responsibility',
      message: 'Wrong team.',
    });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.currentAction?.actionType).toBe('choose_next_party');
    expect(state.currentAction?.assignedActor.profileId).toBe('a');
  });
});

describe('Reminders and overdue', () => {
  it('sends approaching and overdue reminders without completing the action', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Question',
      description: 'Hello',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    ctx.now = new Date('2026-09-03T12:00:00.000Z');
    state = processTimeouts(state, ctx);
    expect(state.reminders.some((row) => row.kind === 'approaching')).toBe(true);
    ctx.now = new Date('2026-09-04T12:00:01.000Z');
    state = processTimeouts(state, ctx);
    expect(state.currentAction?.status).toBe('overdue');
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(deriveMatterStatus(state.matter, state.currentAction)).toBe('response_overdue');
    const overdueCount = state.reminders.filter((row) => row.kind === 'overdue').length;
    state = processTimeouts(state, ctx);
    expect(state.reminders.filter((row) => row.kind === 'overdue')).toHaveLength(overdueCount);
  });
});

describe('Ball is with copy', () => {
  it('uses organization name when the viewer is not the assignee', () => {
    const ctx = start();
    const state = createMatter({
      title: 'Question',
      description: 'Hello',
      matterType: 'question',
      initiator: personA,
      addressee: orgB,
      createdByProfileId: 'a',
    }, ctx);
    const ball = buildBallIsWithCopy({
      matter: state.matter,
      action: state.currentAction,
      viewerProfileId: 'a',
      now: ctx.now,
    });
    expect(ball?.headline).toBe('Waiting on Civizen Product Team');
    expect(formatDueIn(state.currentAction!.dueAt, ctx.now)).toMatch(/Due in/);
  });
});

describe('Contextual formal actions', () => {
  it('does not show every action on a Question', () => {
    const ctx = start();
    const state = createMatter({
      title: 'Question',
      description: 'Hello',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    const actions = formalActionsForContext({
      lifecycleStatus: state.matter.lifecycleStatus,
      currentAction: state.currentAction,
      viewerProfileId: 'b',
      viewerIsInitiator: false,
      matterType: 'question',
    }).map((row) => row.action);
    expect(actions).toContain('respond');
    expect(actions).not.toContain('accept_responsibility');
    expect(actions).not.toContain('confirm_resolved');
  });
});

describe('Question workflow — comments are not a final answer', () => {
  it('keeps the response action pending after ordinary discussion', () => {
    const ctx = start();
    let state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain.',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    const actionId = state.currentAction?.id;
    state = addMatterComment(state, ctx, { author: personB, body: 'Looking this up.' });
    state = addMatterComment(state, ctx, { author: personA, body: 'Take your time.' });
    expect(state.currentAction?.id).toBe(actionId);
    expect(state.currentAction?.status).toBe('pending');
    expect(state.currentAction?.actionType).toBe('respond');
    expect(state.matter.lifecycleStatus).toBe('active');
  });

  it('starts the initiator confirmation timer only after an explicit final answer', () => {
    const ctx = start();
    let state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain.',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = addMatterComment(state, ctx, { author: personB, body: 'Interim note.' });
    expect(state.currentAction?.actionType).toBe('respond');
    state = performFormalAction(state, ctx, {
      actor: personB,
      action: 'respond',
      message: 'Areas are where help is needed.',
    });
    expect(state.currentAction?.actionType).toBe('review_resolution');
    expect(state.currentAction?.timeoutAction).toBe('auto_close');
    expect(eventSummaries(state).some((row) => /final answer/i.test(row))).toBe(true);
  });

  it('lets the initiator mark answered from discussion without converting type', () => {
    const ctx = start();
    let state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain.',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = addMatterComment(state, ctx, { author: personB, body: 'Here is a draft explanation.' });
    state = performFormalAction(state, ctx, { actor: personA, action: 'confirm_resolved' });
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.matter.matterType).toBe('question');
    expect(state.matter.closeKind).toBe('confirmed_resolution');
  });

  it('records revealed-issue without converting type or auto-closing', () => {
    const ctx = start();
    let state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain.',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, { actor: personA, action: 'revealed_issue', message: 'This is actually an Issue.' });
    expect(state.matter.matterType).toBe('question');
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.currentAction?.actionType).toBe('respond');
    expect(state.events.some((event) => event.eventType === 'question_revealed_issue')).toBe(true);
  });

  it('continues discussion when the initiator needs more information after a final answer', () => {
    const ctx = start();
    let state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain.',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, { actor: personB, action: 'respond', message: 'Short answer.' });
    state = performFormalAction(state, ctx, { actor: personA, action: 'need_clarification', message: 'Need an example.' });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.currentAction?.assignedActor.profileId).toBe('b');
    expect(state.currentAction?.timeoutAction).toBe('remind');
  });
});
