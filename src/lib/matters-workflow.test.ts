import { describe, expect, it } from 'vitest';

import {
  AUTO_CLOSE_REASON,
  buildBallIsWithCopy,
  commentDoesNotCompleteAction,
  deriveMatterStatus,
  formalActionsForContext,
  formatDueIn,
  getMatterTypeDefault,
  getTimingPolicy,
} from '@/lib/matters';
import {
  addMatterComment,
  createMatter,
  createMatterEngineContext,
  eventSummaries,
  performFormalAction,
  processTimeouts,
} from '@/lib/matters-workflow';

const personA = { kind: 'person' as const, profileId: 'a', displayName: 'User A' };
const personB = { kind: 'person' as const, profileId: 'b', displayName: 'User B' };
const orgB = { kind: 'organization' as const, profileId: 'org-b', displayName: 'Civizen Product Team' };
const personC = { kind: 'person' as const, profileId: 'c', displayName: 'User C' };

function start(now = new Date('2026-09-01T12:00:00.000Z')) {
  return createMatterEngineContext(now);
}

describe('Matter type defaults are policies, not hard-wired workflows', () => {
  it('looks up initial actions from configurable defaults', () => {
    expect(getMatterTypeDefault('question').timingPolicyId).toBe('question_response');
    expect(getMatterTypeDefault('issue').initialActionType).toBe('responsibility_response');
    expect(getTimingPolicy('question_response').durationValue).toBe(3);
    expect(getTimingPolicy('responsibility_response').durationValue).toBe(2);
    expect(getTimingPolicy('clarification_response').durationValue).toBe(5);
    expect(getTimingPolicy('resolution_confirmation').durationValue).toBe(3);
  });
});

describe('Scenario A — simple Question', () => {
  it('assigns a timed response, lets B answer, keeps comments open, and closes cleanly', () => {
    const ctx = start();
    let state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain public Areas.',
      matterType: 'question',
      initiator: personA,
      addressee: orgB,
      createdByProfileId: 'a',
    }, ctx);
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.currentAction?.actionType).toBe('respond');
    expect(state.currentAction?.assignedActor.profileId).toBe('org-b');
    expect(state.currentAction?.timingPolicyId).toBe('question_response');

    const ballB = buildBallIsWithCopy({
      matter: state.matter,
      action: state.currentAction,
      viewerProfileId: 'owner-b',
      managedOrganizationIds: ['org-b'],
      now: ctx.now,
    });
    expect(ballB?.headline).toBe('Action required from you');
    expect(ballB?.requiredFromViewer).toBe(true);

    ctx.now = new Date('2026-09-02T12:00:00.000Z');
    state = performFormalAction(state, ctx, {
      actor: orgB,
      action: 'respond',
      message: 'Areas are where help is needed.',
    });
    expect(state.currentAction?.actionType).toBe('review_resolution');
    expect(state.currentAction?.assignedActor.profileId).toBe('a');

    state = addMatterComment(state, ctx, { author: personA, body: 'Thanks — that helps.' });
    expect(state.currentAction?.status).toBe('pending');
    expect(commentDoesNotCompleteAction()).toBe(true);

    state = performFormalAction(state, ctx, { actor: personA, action: 'confirm_resolved' });
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.matter.closeKind).toBe('confirmed_resolution');
    expect(state.matter.matterType).toBe('question');
  });
});

describe('Scenario B — clarification', () => {
  it('moves the action to the initiator, then back after a formal clarification', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Broken streetlight',
      description: 'The light is out.',
      matterType: 'issue',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, {
      actor: personB,
      action: 'request_clarification',
      message: 'Which corner?',
    });
    expect(state.currentAction?.actionType).toBe('clarify');
    expect(state.currentAction?.assignedActor.profileId).toBe('a');
    expect(state.currentAction?.timingPolicyId).toBe('clarification_response');
    expect(deriveMatterStatus(state.matter, state.currentAction, ctx.now)).toBe('clarification_needed');

    ctx.now = new Date('2026-09-03T12:00:00.000Z');
    state = performFormalAction(state, ctx, {
      actor: personA,
      action: 'respond',
      message: 'North-west corner of Oak and 3rd.',
    });
    expect(state.currentAction?.assignedActor.profileId).toBe('b');
    expect(state.currentAction?.actionType).toBe('respond');
  });
});

describe('Scenario C — Issue accepted and addressed', () => {
  it('confirms resolution only when the initiator says so', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Login lockout',
      description: 'Members cannot sign in after profile miss.',
      matterType: 'issue',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    expect(state.currentAction?.actionType).toBe('responsibility_response');
    const issueActions = formalActionsForContext({
      lifecycleStatus: state.matter.lifecycleStatus,
      currentAction: state.currentAction,
      viewerProfileId: 'b',
      viewerIsInitiator: false,
      matterType: 'issue',
    }).map((row) => row.action);
    expect(issueActions).toContain('accept_responsibility');
    expect(issueActions).not.toContain('mark_addressed');

    state = performFormalAction(state, ctx, { actor: personB, action: 'accept_responsibility' });
    expect(state.currentAction?.actionType).toBe('address');
    state = performFormalAction(state, ctx, {
      actor: personB,
      action: 'mark_addressed',
      message: 'Fixed the wait-for-profile spinner.',
    });
    expect(state.currentAction?.actionType).toBe('review_resolution');
    expect(state.currentAction?.timeoutAction).toBe('auto_close');
    expect(deriveMatterStatus(state.matter, state.currentAction, ctx.now)).toBe('resolution_proposed');

    const ballA = buildBallIsWithCopy({
      matter: state.matter,
      action: state.currentAction,
      viewerProfileId: 'a',
      now: ctx.now,
    });
    expect(ballA?.headline).toBe('Action required from you');
    expect(ballA?.detail).toMatch(/Review the proposed Resolution/);

    state = performFormalAction(state, ctx, { actor: personA, action: 'confirm_resolved' });
    expect(state.matter.closeKind).toBe('confirmed_resolution');
    expect(eventSummaries(state).some((row) => row === 'Initiator confirmed resolution.')).toBe(true);
  });
});

describe('Scenario D — initiator silent', () => {
  it('auto-closes without recording initiator confirmation', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Login lockout',
      description: 'Members cannot sign in.',
      matterType: 'issue',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, { actor: personB, action: 'accept_responsibility' });
    state = performFormalAction(state, ctx, {
      actor: personB,
      action: 'mark_addressed',
      message: 'Fixed.',
    });
    ctx.now = new Date('2026-09-05T12:00:01.000Z');
    state = processTimeouts(state, ctx);
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.matter.closeKind).toBe('auto_no_initiator_response');
    expect(state.matter.closeReason).toBe(AUTO_CLOSE_REASON);
    const summaries = eventSummaries(state);
    expect(summaries).toContain(AUTO_CLOSE_REASON);
    expect(summaries.some((row) => /Initiator confirmed resolution/i.test(row))).toBe(false);
    expect(deriveMatterStatus(state.matter, state.currentAction)).toBe('automatically_closed');
  });
});

describe('Scenario E — reopen', () => {
  it('preserves the previous closure and starts a new action', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Login lockout',
      description: 'Members cannot sign in.',
      matterType: 'issue',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, { actor: personB, action: 'accept_responsibility' });
    state = performFormalAction(state, ctx, { actor: personB, action: 'mark_addressed', message: 'Fixed.' });
    ctx.now = new Date('2026-09-05T12:00:01.000Z');
    state = processTimeouts(state, ctx);
    const previousClose = state.matter.closeReason;
    const eventCount = state.events.length;

    ctx.now = new Date('2026-09-06T12:00:00.000Z');
    state = performFormalAction(state, ctx, {
      actor: personA,
      action: 'reopen',
      reopenReason: 'issue_returned',
      message: 'The lockout came back.',
    });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.matter.closeReason).toBe(previousClose);
    expect(state.matter.reopenCount).toBe(1);
    expect(state.currentAction?.status).toBe('pending');
    expect(state.events.length).toBeGreaterThan(eventCount);
    expect(eventSummaries(state).some((row) => /Previous closure remains/.test(row))).toBe(true);
  });
});

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

describe('Authorization negatives', () => {
  it('rejects impersonation of the assigned actor', () => {
    const ctx = start();
    const state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain.',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    expect(() =>
      performFormalAction(state, ctx, { actor: personC, action: 'respond', message: 'I am not B.' }),
    ).toThrow(/not available/i);
    expect(state.currentAction?.status).toBe('pending');
  });

  it('rejects an unauthorized stranger from closing or reopening', () => {
    const ctx = start();
    let state = createMatter({
      title: 'How do Areas work?',
      description: 'Please explain.',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    expect(() => performFormalAction(state, ctx, { actor: personC, action: 'close' })).toThrow(/not available/i);
    state = performFormalAction(state, ctx, { actor: personA, action: 'close', message: 'Withdrawn.' });
    expect(() =>
      performFormalAction(state, ctx, { actor: personC, action: 'reopen', reopenReason: 'other', message: 'No.' }),
    ).toThrow(/not available/i);
  });
});

describe('Timeout processor idempotency and concurrency', () => {
  it('does not duplicate overdue or auto-close when invoked twice', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Login lockout',
      description: 'Members cannot sign in.',
      matterType: 'issue',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, { actor: personB, action: 'accept_responsibility' });
    state = performFormalAction(state, ctx, { actor: personB, action: 'mark_addressed', message: 'Fixed.' });
    ctx.now = new Date('2026-09-05T12:00:01.000Z');
    state = processTimeouts(state, ctx);
    const overdueEvents = state.events.filter((event) => event.eventType === 'matter_auto_closed').length;
    const reminderCount = state.reminders.length;
    state = processTimeouts(state, ctx);
    expect(state.events.filter((event) => event.eventType === 'matter_auto_closed')).toHaveLength(overdueEvents);
    expect(state.reminders).toHaveLength(reminderCount);
    expect(state.matter.closeKind).toBe('auto_no_initiator_response');
  });

  it('lets only one concurrent worker claim overdue and auto-close', () => {
    const ctx = start();
    let state = createMatter({
      title: 'Login lockout',
      description: 'Members cannot sign in.',
      matterType: 'issue',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    state = performFormalAction(state, ctx, { actor: personB, action: 'accept_responsibility' });
    state = performFormalAction(state, ctx, { actor: personB, action: 'mark_addressed', message: 'Fixed.' });
    ctx.now = new Date('2026-09-05T12:00:01.000Z');
    const claims = new Set<string>();
    const first = processTimeouts(state, ctx, claims);
    const second = processTimeouts(state, ctx, claims);
    expect(first.events.filter((event) => event.eventType === 'matter_auto_closed')).toHaveLength(1);
    expect(second.events.filter((event) => event.eventType === 'matter_auto_closed')).toHaveLength(0);
    expect(first.reminders.filter((row) => row.kind === 'overdue').length + second.reminders.filter((row) => row.kind === 'overdue').length).toBeLessThanOrEqual(1);
  });
});

describe('Display overdue does not require a mutation', () => {
  it('derives response_overdue from due_at while the row is still pending', () => {
    const ctx = start();
    const state = createMatter({
      title: 'Question',
      description: 'Hello',
      matterType: 'question',
      initiator: personA,
      addressee: personB,
      createdByProfileId: 'a',
    }, ctx);
    expect(state.currentAction?.status).toBe('pending');
    expect(deriveMatterStatus(state.matter, state.currentAction, new Date('2026-09-10T12:00:00.000Z'))).toBe('response_overdue');
  });
});
