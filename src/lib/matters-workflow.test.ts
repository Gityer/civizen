import { describe, expect, it } from 'vitest';
import { AUTO_CLOSE_REASON, buildBallIsWithCopy, commentDoesNotCompleteAction, deriveMatterStatus, formalActionsForContext, getMatterTypeDefault, getTimingPolicy } from '@/lib/matters';
import { addMatterComment, createMatter, eventSummaries, performFormalAction, processTimeouts } from '@/lib/matters-workflow';
import { orgB, personA, personB, start } from '@/test/matters-workflow-fixtures';



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
