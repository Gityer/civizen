import { describe, expect, it } from 'vitest';
import { completeCollaborativeWork, createTask, pendingFor, performTaskAction, requestSharedResponsibility, startCollaborativeWork } from '@/lib/matters-work-workflow';
import { anna, david, product, startIssue, stranger } from '@/test/matters-work-fixtures';

describe('Phase 2 stabilization: work completion and shared responsibility', () => {
  it('rejects normal completion while a Task is in progress', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    expect(state.tasks[0].status).toBe('in_progress');
    expect(() => completeCollaborativeWork(state, ctx, product)).toThrow(/outstanding Tasks/);
    expect(state.tasks[0].status).toBe('in_progress');
    expect(state.matter.collaborativeWorkCompletedAt).toBeNull();
  });

  it('rejects normal completion while a Task is under review', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna, reviewer: product });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'submit' });
    expect(state.tasks[0].status).toBe('under_review');
    expect(() => completeCollaborativeWork(state, ctx, product)).toThrow(/outstanding Tasks/);
  });

  it('allows normal completion when required Tasks are completed or cancelled', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'complete' });
    state = createTask(state, ctx, { actor: product, title: 'Follow-up check', assignee: david });
    state = performTaskAction(state, ctx, { actor: david, actionId: pendingFor(state, david)[0].id, action: 'decline', message: 'Not needed.' });
    const reconsider = pendingFor(state, product).find((row) => row.actionType === 'reconsider_task');
    expect(reconsider).toBeTruthy();
    state = performTaskAction(state, ctx, { actor: product, actionId: reconsider!.id, action: 'cancel_task' });
    expect(state.tasks.every((task) => task.status === 'completed' || task.status === 'cancelled')).toBe(true);
    state = completeCollaborativeWork(state, ctx, product);
    expect(state.matter.collaborativeWorkCompletionKind).toBe('normal');
    expect(state.currentAction?.actionType).toBe('propose_resolution');
  });

  it('records exceptional completion with outstanding Tasks and leaves Task history unchanged', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    const before = structuredClone(state.tasks[0]);
    state = completeCollaborativeWork(state, ctx, product, {
      allowOutstanding: true,
      reason: 'External inspection is delayed; the Issue can still be answered.',
    });
    expect(state.matter.collaborativeWorkCompletionKind).toBe('with_outstanding_work');
    expect(state.events.some((row) => row.eventType === 'collaborative_work_completed_with_outstanding')).toBe(true);
    expect(state.tasks[0].status).toBe(before.status);
    expect(state.tasks[0].completedAt).toBe(before.completedAt);
    expect(state.currentAction?.actionType).toBe('propose_resolution');
  });

  it('stores Task decline reasons on the assignment and in event payload', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    state = performTaskAction(state, ctx, {
      actor: anna,
      actionId: pendingFor(state, anna)[0].id,
      action: 'decline',
      message: 'Out of scope for me.',
    });
    expect(state.tasks[0].assignments[0].declineReason).toBe('Out of scope for me.');
    const declined = state.events.find((row) => row.eventType === 'task_declined');
    expect(declined?.payload.reason).toBe('Out of scope for me.');
    expect(() => completeCollaborativeWork(state, ctx, product)).toThrow(/outstanding Tasks/);
  });

  it('stores suggested reassignment reasons on the assignment and in event payload', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = createTask(state, ctx, { actor: product, title: 'UX investigation', assignee: anna });
    state = performTaskAction(state, ctx, {
      actor: anna,
      actionId: pendingFor(state, anna)[0].id,
      action: 'suggest_reassignment',
      message: 'David knows this area.',
    });
    expect(state.tasks[0].assignments[0].suggestionReason).toBe('David knows this area.');
    const suggested = state.events.find((row) => row.eventType === 'task_reassignment_suggested');
    expect(suggested?.payload.reason).toBe('David knows this area.');
  });

  it('does not make a requested collaborator responsible until they accept', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = requestSharedResponsibility(state, ctx, { actor: product, target: anna });
    const row = state.responsibilities.find((item) => item.kind === 'collaborator')!;
    expect(row.status).toBe('proposed');
    expect(pendingFor(state, anna)[0].actionType).toBe('shared_responsibility_response');
  });

  it('acceptance creates shared responsibility; decline does not', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = requestSharedResponsibility(state, ctx, { actor: product, target: anna });
    state = performTaskAction(state, ctx, { actor: anna, actionId: pendingFor(state, anna)[0].id, action: 'accept' });
    expect(state.responsibilities.find((row) => row.kind === 'collaborator')?.status).toBe('accepted');

    state = requestSharedResponsibility(state, ctx, { actor: product, target: david });
    state = performTaskAction(state, ctx, {
      actor: david,
      actionId: pendingFor(state, david)[0].id,
      action: 'decline',
      message: 'I cannot take this on.',
    });
    const declined = state.responsibilities.find((row) => row.actor.profileId === 'david')!;
    expect(declined.status).toBe('declined');
    expect(declined.responseReason).toBe('I cannot take this on.');
    expect(state.events.some((row) => row.eventType === 'shared_responsibility_declined')).toBe(true);
  });

  it('clarification moves the shared-responsibility action back to the requester', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = requestSharedResponsibility(state, ctx, { actor: product, target: anna });
    state = performTaskAction(state, ctx, {
      actor: anna,
      actionId: pendingFor(state, anna)[0].id,
      action: 'request_clarification',
      message: 'Which product area?',
    });
    expect(pendingFor(state, product)[0].actionType).toBe('clarify');
    expect(pendingFor(state, product)[0].contextKind).toBe('responsibility');
    state = performTaskAction(state, ctx, { actor: product, actionId: pendingFor(state, product)[0].id, action: 'respond', message: 'Signup assessment.' });
    expect(pendingFor(state, anna)[0].actionType).toBe('shared_responsibility_response');
  });

  it('unauthorized actors cannot accept shared responsibility for someone else', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    state = requestSharedResponsibility(state, ctx, { actor: product, target: anna });
    const actionId = pendingFor(state, anna)[0].id;
    expect(() => performTaskAction(state, ctx, { actor: stranger, actionId, action: 'accept' })).toThrow(/not assigned/);
  });

  it('organization actors can accept shared responsibility assigned to the organization', () => {
    const { ctx, state: opened } = startIssue();
    let state = startCollaborativeWork(opened, ctx, product);
    const partner = { kind: 'organization' as const, profileId: 'partner-org', displayName: 'Partner Org' };
    state = requestSharedResponsibility(state, ctx, { actor: product, target: partner });
    expect(pendingFor(state, partner)[0].actionType).toBe('shared_responsibility_response');
    state = performTaskAction(state, ctx, { actor: partner, actionId: pendingFor(state, partner)[0].id, action: 'accept' });
    expect(state.responsibilities.find((row) => row.actor.profileId === 'partner-org')?.status).toBe('accepted');
    const personWithSameId = { kind: 'person' as const, profileId: 'partner-org', displayName: 'Pat' };
    state = requestSharedResponsibility(state, ctx, { actor: product, target: { kind: 'organization', profileId: 'other-org', displayName: 'Other Org' } });
    const otherAction = pendingFor(state, { kind: 'organization', profileId: 'other-org', displayName: 'Other Org' })[0];
    expect(() => performTaskAction(state, ctx, { actor: personWithSameId, actionId: otherAction.id, action: 'accept' })).toThrow(/not assigned/);
  });
});
