import { describe, expect, it } from 'vitest';
import { deriveMatterStatus } from '@/lib/matters';
import { taskDoesNotResolveMatter } from '@/lib/matters-work';
import { addTaskComment, completeCollaborativeWork, createTask, pendingFor, performTaskAction, proposeDecision, startCollaborativeWork } from '@/lib/matters-work-workflow';
import { performFormalAction } from '@/lib/matters-workflow';
import { createResolutionEngineState, performResolutionReview, proposeResolution } from '@/lib/matters-resolution-workflow';
import { anna, david, developer, initiator, product, startIssue, stranger, tester } from '@/test/matters-work-fixtures';



describe('Phase 2 primary collaborative work scenario', () => {
  it('runs concurrent Tasks, a Decision, dependent implementation, then Phase 1 confirmation', () => {
    const { ctx, state: opened } = startIssue();
    let state = performFormalAction(opened, ctx, { actor: product, action: 'accept_responsibility' });
    expect(state.matter.lifecycleStatus).toBe('active');
    state = startCollaborativeWork(state, ctx, product);

    state = createTask(state, ctx, {
      actor: product,
      title: 'UX investigation',
      assignee: anna,
      reviewer: product,
    });
    const taskA = state.tasks.find((row) => row.title === 'UX investigation')!;
    state = createTask(state, ctx, {
      actor: product,
      title: 'Technical investigation',
      assignee: david,
      reviewer: product,
    });
    const taskB = state.tasks.find((row) => row.title === 'Technical investigation')!;
    expect(taskA.status).toBe('awaiting_acceptance');
    expect(taskB.status).toBe('awaiting_acceptance');
    expect(pendingFor(state, anna)).toHaveLength(1);
    expect(pendingFor(state, david)).toHaveLength(1);

    const acceptA = pendingFor(state, anna)[0];
    const acceptB = pendingFor(state, david)[0];
    state = performTaskAction(state, ctx, { actor: anna, actionId: acceptA.id, action: 'accept' });
    state = performTaskAction(state, ctx, { actor: david, actionId: acceptB.id, action: 'accept' });
    expect(state.tasks.find((row) => row.id === taskA.id)?.status).toBe('in_progress');
    expect(state.tasks.find((row) => row.id === taskB.id)?.status).toBe('in_progress');
    expect(pendingFor(state, anna)[0].actionType).toBe('complete_task');
    expect(pendingFor(state, david)[0].actionType).toBe('complete_task');

    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'submit' });
    state = performTaskAction(state, ctx, { actor: david, actionId: pendingFor(state, david)[0].id, action: 'submit' });
    expect(state.tasks.find((row) => row.id === taskA.id)?.status).toBe('under_review');
    const reviews = pendingFor(state, product).filter((row) => row.actionType === 'review_task');
    expect(reviews).toHaveLength(2);
    state = performTaskAction(state, ctx, { actor: product, actionId: reviews[0].id, action: 'accept_completion' });
    state = performTaskAction(state, ctx, { actor: product, actionId: reviews[1].id, action: 'accept_completion' });
    expect(state.tasks.filter((row) => row.status === 'completed')).toHaveLength(2);
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(taskDoesNotResolveMatter()).toBe(true);

    state = proposeDecision(state, ctx, {
      actor: product,
      title: 'Assessment explanation',
      statement: 'Implement revised assessment explanation and interaction flow.',
      rationale: 'Findings from UX and technical investigation agree on a simpler flow.',
      taskIds: [taskA.id, taskB.id],
      actorIsLead: true,
    });
    expect(state.decisions[0].status).toBe('accepted');

    state = createTask(state, ctx, {
      actor: product,
      title: 'Implement revised assessment flow',
      assignee: developer,
      dependsOn: [taskA.id, taskB.id],
    });
    const taskC = state.tasks.find((row) => row.title.startsWith('Implement'))!;
    expect(taskC.status).not.toBe('blocked');
    state = performTaskAction(state, ctx, { actor: developer, actionId: pendingFor(state, developer)[0].id, action: 'accept' });
    state = performTaskAction(state, ctx, {
      actor: developer,
      actionId: pendingFor(state, developer)[0].id,
      action: 'complete',
    });
    expect(state.tasks.find((row) => row.id === taskC.id)?.status).toBe('completed');

    state = createTask(state, ctx, {
      actor: product,
      title: 'Verify corrected behavior',
      assignee: tester,
      dependsOn: [taskC.id],
    });
    const taskD = state.tasks.find((row) => row.title.startsWith('Verify'))!;
    state = performTaskAction(state, ctx, { actor: tester, actionId: pendingFor(state, tester)[0].id, action: 'accept' });
    state = performTaskAction(state, ctx, { actor: tester, actionId: pendingFor(state, tester)[0].id, action: 'complete' });
    expect(state.tasks.find((row) => row.id === taskD.id)?.status).toBe('completed');

    state = completeCollaborativeWork(state, ctx, product);
    expect(state.currentAction?.actionType).toBe('propose_resolution');
    state = proposeResolution(createResolutionEngineState(state), ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'The assessment flow is clearer.',
    });
    expect(state.currentAction?.actionType).toBe('review_resolution');
    state = performResolutionReview(createResolutionEngineState(state), ctx, {
      actor: initiator,
      actionId: pendingFor(state, initiator)[0].id,
      action: 'confirm_resolved',
    });
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.tasks.every((row) => row.status === 'completed' || row.status === 'declined')).toBe(true);
    const types = state.events.map((row) => row.eventType);
    expect(types).toEqual(expect.arrayContaining([
      'collaborative_work_started',
      'task_created',
      'task_assigned',
      'task_accepted',
      'task_submitted',
      'task_completed',
      'decision_accepted',
      'collaborative_work_completed',
    ]));
  });
});

describe('Phase 2 additional scenarios', () => {
  it('A. decline leaves the Matter active and returns action to the lead', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    const accept = pendingFor(state, anna)[0];
    state = performTaskAction(state, ctx, { actor: anna, actionId: accept.id, action: 'decline', message: 'Out of scope for me.' });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.tasks[0].status).toBe('declined');
    expect(pendingFor(state, product)[0].actionType).toBe('reconsider_task');
  });

  it('B. clarification before acceptance moves action to the lead', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    state = performTaskAction(state, ctx, {
      actor: anna,
      actionId: pendingFor(state, anna)[0].id,
      action: 'request_clarification',
      message: 'Which screens?',
    });
    expect(state.tasks[0].status).toBe('waiting');
    expect(pendingFor(state, product)[0].actionType).toBe('reconsider_task');
  });

  it('C. overdue Task action does not close the Matter', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    const accept = pendingFor(state, anna)[0];
    expect(new Date(accept.dueAt).getTime()).toBeGreaterThan(ctx.now.getTime());
    ctx.now = new Date(accept.dueAt);
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.tasks[0].status).not.toBe('completed');
  });

  it('D. a dependent Task stays blocked until the blocker completes', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    const taskA = state.tasks[0];
    state = createTask(state, ctx, {
      actor: product,
      title: 'Implementation',
      assignee: developer,
      dependsOn: [taskA.id],
    });
    const taskC = state.tasks.find((row) => row.title === 'Implementation')!;
    expect(taskC.status).toBe('blocked');
    expect(pendingFor(state, developer)).toHaveLength(0);
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'complete' });
    expect(state.tasks.find((row) => row.id === taskC.id)?.status).toBe('awaiting_acceptance');
    expect(pendingFor(state, developer)[0].actionType).toBe('accept_task');
  });

  it('E. requested changes return execution to the assignee and keep history', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna, reviewer: product });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'submit' });
    state = performTaskAction(state, ctx, {
      actor: product,
      actionId: pendingFor(state, product)[0].id,
      action: 'request_changes',
      message: 'Please include mobile.',
    });
    expect(state.tasks[0].status).toBe('in_progress');
    expect(pendingFor(state, anna)[0].actionType).toBe('complete_task');
    expect(state.events.some((row) => row.eventType === 'changes_requested')).toBe(true);
    expect(state.events.some((row) => row.eventType === 'task_submitted')).toBe(true);
  });

  it('F. parallel assignees do not complete each other', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    state = createTask(state, ctx, { actor: product, title: 'Technical investigation', assignee: david });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    expect(pendingFor(state, david)[0].actionType).toBe('accept_task');
    expect(state.tasks.find((row) => row.title.startsWith('Technical'))?.status).toBe('awaiting_acceptance');
  });

  it('G. reopened Matters keep completed Tasks and Decisions', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'complete' });
    state = proposeDecision(state, ctx, {
      actor: product,
      title: 'Keep copy',
      statement: 'Keep the current heading.',
      actorIsLead: true,
    });
    state = completeCollaborativeWork(state, ctx, product);
    state = proposeResolution(createResolutionEngineState(state), ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Addressed.',
    });
    state = performResolutionReview(createResolutionEngineState(state), ctx, {
      actor: initiator,
      actionId: pendingFor(state, initiator)[0].id,
      action: 'confirm_resolved',
    });
    expect(state.matter.lifecycleStatus).toBe('closed');
    const completedId = state.tasks[0].id;
    const decisionId = state.decisions[0].id;
    state = performFormalAction(state, ctx, { actor: initiator, action: 'reopen', message: 'The issue returned.', reopenReason: 'issue_returned' });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.tasks.find((row) => row.id === completedId)?.status).toBe('completed');
    expect(state.decisions.find((row) => row.id === decisionId)?.status).toBe('accepted');
    state = createTask(state, ctx, { actor: product, title: 'Follow-up check', assignee: tester });
    expect(state.tasks).toHaveLength(2);
  });

  it('H. unauthorized actors cannot complete another assignee action', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    const actionId = pendingFor(state, anna)[0].id;
    expect(() => performTaskAction(state, ctx, { actor: stranger, actionId, action: 'accept' })).toThrow(
      /not assigned/,
    );
  });

  it('Task comments do not complete acceptance', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    const before = pendingFor(state, anna)[0];
    state = addTaskComment(state, ctx, { author: anna, body: 'I will look this afternoon.', taskId: state.tasks[0].id });
    expect(pendingFor(state, anna)[0].id).toBe(before.id);
    expect(pendingFor(state, anna)[0].status).toBe('pending');
    expect(state.comments[0].taskId).toBe(state.tasks[0].id);
  });

  it('derived status becomes work in progress without claiming the Matter is resolved', () => {
    const { ctx, state: opened } = startIssue();
    const state = startCollaborativeWork(opened, ctx, product);
    expect(deriveMatterStatus(state.matter, state.currentAction, ctx.now)).toBe('work_in_progress');
  });
});
