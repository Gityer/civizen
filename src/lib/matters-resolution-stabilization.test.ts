import { describe, expect, it } from 'vitest';

import {
  AUTO_CLOSE_REASON,
  actionContextHeadline,
  actionContextKind,
  deriveMatterStatus,
  resolveEscalationPolicyId,
} from '@/lib/matters';
import { createMatter, createMatterEngineContext, performFormalAction } from '@/lib/matters-workflow';
import { asWorkState, createTask, pendingFor, startCollaborativeWork } from '@/lib/matters-work-workflow';
import {
  createResolutionEngineState,
  performResolutionReview,
  proposeResolution,
  processResolutionTimeouts,
} from '@/lib/matters-resolution-workflow';

const userA = { kind: 'person' as const, profileId: 'a', displayName: 'User A' };
const product = { kind: 'organization' as const, profileId: 'org-product', displayName: 'Civizen Product' };

function startIssue(ctx = createMatterEngineContext(new Date('2026-09-01T12:00:00.000Z'))) {
  const state = createMatter(
    {
      title: 'Contribution assessment workflow is difficult to understand.',
      description: 'Assessment reasoning is unclear.',
      matterType: 'issue',
      initiator: userA,
      addressee: product,
      createdByProfileId: 'a',
    },
    ctx,
  );
  let work = createResolutionEngineState(
    asWorkState(performFormalAction(state, ctx, { actor: product, action: 'accept_responsibility' })),
  );
  work = createResolutionEngineState(startCollaborativeWork(work, ctx, product));
  return { ctx, state: work };
}

function isStalled(state: ReturnType<typeof createResolutionEngineState>): boolean {
  if (!['active', 'submitted'].includes(state.matter.lifecycleStatus)) return false;
  if (state.matter.waitingCondition) return false;
  return !state.actions.some((row) => row.status === 'pending' || row.status === 'overdue');
}

describe('Escalation policy binding (in-memory)', () => {
  it('selects defaults by matter type and action type', () => {
    expect(resolveEscalationPolicyId({ matterType: 'issue', actionType: 'responsibility_response' }))
      .toBe('responsibility_escalation');
    expect(resolveEscalationPolicyId({ matterType: 'question', actionType: 'respond' }))
      .toBe('response_escalation');
    expect(resolveEscalationPolicyId({ matterType: 'issue', actionType: 'review_resolution' })).toBeNull();
  });

  it('allows two responsibility_response actions to bind different explicit policies', () => {
    const explicit = resolveEscalationPolicyId({
      matterType: 'issue',
      actionType: 'responsibility_response',
      explicitPolicyId: 'responsibility_escalation_urgent',
    });
    const defaulted = resolveEscalationPolicyId({ matterType: 'issue', actionType: 'responsibility_response' });
    expect(explicit).toBe('responsibility_escalation_urgent');
    expect(defaulted).toBe('responsibility_escalation');
    expect(explicit).not.toBe(defaulted);
  });
});

describe('Partial resolution semantics', () => {
  it('continue keeps the Matter active and preserves the attempt', () => {
    const { ctx, state: opened } = startIssue();
    let state = proposeResolution(opened, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'First proposal',
    });
    const review = pendingFor(state, userA)[0];
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: review.id,
      action: 'confirm_partially_resolved',
      message: 'Partly fixed',
      continueMatter: true,
    });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.resolutions[0].resolutionStatus).toBe('partially_accepted');
    expect(state.resolutions[0].closureKind).toBeNull();
    expect(deriveMatterStatus(state.matter, state.currentAction, ctx.now)).toBe('partial_resolution');
  });

  it('follow-up path closes with partial closure wording and allows new proposal later on follow-up matter separately', () => {
    const { ctx, state: opened } = startIssue();
    let state = proposeResolution(opened, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Proposal',
    });
    const review = pendingFor(state, userA)[0];
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: review.id,
      action: 'confirm_partially_resolved',
      message: 'Mobile still broken',
      continueMatter: false,
    });
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.matter.closeKind).toBe('partially_resolved');
    expect(state.resolutions[0].resolutionStatus).toBe('partially_accepted');
  });

  it('not resolved assigns follow-up work without mutating prior attempt', () => {
    const { ctx, state: opened } = startIssue();
    let state = proposeResolution(opened, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Attempt 1',
    });
    const attempt1 = { ...state.resolutions[0] };
    const review = pendingFor(state, userA)[0];
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: review.id,
      action: 'confirm_not_resolved',
      message: 'Still broken',
    });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.resolutions[0].resolutionStatus).toBe('rejected');
    expect(state.resolutions[0].summary).toBe(attempt1.summary);
    expect(pendingFor(state, product)[0]?.actionType).toBe('address');
  });
});

describe('Outcome vs Resolution', () => {
  it('keeps Matter closed when outcome is negative', () => {
    const { ctx, state: opened } = startIssue();
    let state = proposeResolution(opened, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Fixed crossing paint',
    });
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: pendingFor(state, userA)[0].id,
      action: 'confirm_resolved',
    });
    expect(state.matter.lifecycleStatus).toBe('closed');
    state.outcomeFollowups.push({
      id: 'of-1',
      matterId: state.matter.id,
      resolutionId: state.resolutions[0].id,
      reviewDueAt: '2026-10-01T12:00:00.000Z',
      outcomeQuestion: 'Did it improve?',
      targetIndicator: null,
      reviewer: userA,
      status: 'completed',
      result: 'no_change',
      notes: 'Still unsafe',
      actionId: null,
      humanOutcomeReviewId: null,
      createdAt: iso(ctx.now),
      completedAt: iso(ctx.now),
    });
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.matter.closeKind).toBe('confirmed_resolution');
    expect(state.outcomeFollowups[0].result).toBe('no_change');
  });
});

function iso(date: Date): string {
  return date.toISOString();
}

describe('Auto-close vs confirmation', () => {
  it('auto-closes without confirmed resolution status', () => {
    const { ctx, state: opened } = startIssue();
    let state = proposeResolution(opened, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'We think it is fixed',
    });
    ctx.now = new Date('2026-09-10T12:00:00.000Z');
    state = processResolutionTimeouts(state, ctx);
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.matter.closeKind).toBe('auto_no_initiator_response');
    expect(state.matter.closeReason).toBe(AUTO_CLOSE_REASON);
    expect(state.resolutions[0].resolutionStatus).toBe('auto_closed');
  });
});

describe('Reopen after confirmed and auto-close', () => {
  it('reopens after confirmed resolution without erasing attempts', () => {
    const { ctx, state: opened } = startIssue();
    let state = proposeResolution(opened, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Done',
    });
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: pendingFor(state, userA)[0].id,
      action: 'confirm_resolved',
    });
    const attempts = state.resolutions.length;
    state = createResolutionEngineState(
      performFormalAction(state, ctx, {
        actor: userA,
        action: 'reopen',
        message: 'Issue returned',
        reopenReason: 'issue_returned',
      }),
    );
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.resolutions).toHaveLength(attempts);
    expect(state.matter.reopenCount).toBeGreaterThan(0);
  });
});

describe('Outstanding work surfaced on proposal', () => {
  it('includes outstanding task titles on resolution record', () => {
    const { ctx, state: opened } = startIssue();
    let state = createResolutionEngineState(
      createTask(opened, ctx, {
        actor: product,
        title: 'Open task remains',
        assignee: { kind: 'person', profileId: 'dev', displayName: 'Dev' },
      }),
    );
    state = proposeResolution(state, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Mostly done',
    });
    expect(state.resolutions[0].outstandingItems).toContain('Open task remains');
  });
});

describe('Action queue context helpers', () => {
  it('labels resolution review distinctly from matter respond', () => {
    const review = {
      actionType: 'review_resolution' as const,
      contextKind: 'resolution' as const,
    };
    const respond = {
      actionType: 'respond' as const,
      contextKind: 'matter' as const,
    };
    expect(actionContextKind(review)).toBe('resolution');
    expect(actionContextKind(respond)).toBe('matter');
    expect(actionContextHeadline(review)).toMatch(/Review proposed resolution/i);
  });
});

describe('Stalled Matter detection', () => {
  it('flags active Matters with no pending action and no waiting condition', () => {
    const { ctx, state: opened } = startIssue();
    const broken = createResolutionEngineState(opened);
    broken.matter.waitingCondition = null;
    broken.currentAction = null;
    broken.matter.currentActionId = null;
    for (const action of broken.actions) {
      if (action.status === 'pending' || action.status === 'overdue') action.status = 'completed';
    }
    expect(isStalled(broken)).toBe(true);
  });
});

describe('Cannot verify path', () => {
  it('returns work to responsible lead', () => {
    const { ctx, state: opened } = startIssue();
    let state = proposeResolution(opened, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Fixed',
    });
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: pendingFor(state, userA)[0].id,
      action: 'cannot_verify',
      message: 'Cannot verify from here',
    });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.resolutions[0].initiatorPosition).toMatch(/Cannot verify/i);
    expect(pendingFor(state, product).length).toBeGreaterThan(0);
  });
});

describe('Three-attempt resolution cycle regression', () => {
  it('preserves three attempts end-to-end', () => {
    const { ctx, state: opened } = startIssue();
    let state = opened;
    state = proposeResolution(state, ctx, { actor: product, resolutionKind: 'resolved', summary: 'A1' });
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: pendingFor(state, userA)[0].id,
      action: 'confirm_not_resolved',
      message: 'No',
    });
    state = proposeResolution(state, ctx, { actor: product, resolutionKind: 'resolved', summary: 'A2' });
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: pendingFor(state, userA)[0].id,
      action: 'confirm_partially_resolved',
      message: 'Partly',
      continueMatter: true,
    });
    state = proposeResolution(state, ctx, { actor: product, resolutionKind: 'resolved', summary: 'A3' });
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: pendingFor(state, userA)[0].id,
      action: 'confirm_resolved',
    });
    expect(state.resolutions).toHaveLength(3);
    expect(state.matter.closeKind).toBe('confirmed_resolution');
  });
});
