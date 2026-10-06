import { describe, expect, it } from 'vitest';

import { AUTO_CLOSE_REASON, deriveMatterStatus } from '@/lib/matters';
import { createMatterEngineContext } from '@/lib/matters-workflow';
import {
  asWorkState,
  completeCollaborativeWork,
  createTask,
  performTaskAction,
  pendingFor,
  startCollaborativeWork,
} from '@/lib/matters-work-workflow';
import { createMatter, performFormalAction } from '@/lib/matters-workflow';
import {
  createResolutionEngineState,
  performResolutionReview,
  proposeResolution,
  processResolutionTimeouts,
} from '@/lib/matters-resolution-workflow';

const userA = { kind: 'person' as const, profileId: 'a', displayName: 'User A' };
const product = { kind: 'organization' as const, profileId: 'org-product', displayName: 'Civizen Product' };

function start(now = new Date('2026-09-01T12:00:00.000Z')) {
  return createMatterEngineContext(now);
}

function startIssue(ctx = start()) {
  const state = createMatter(
    {
      title: 'Contribution assessment workflow is difficult to understand.',
      description: 'The assessment result does not explain capability classification.',
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

describe('Phase 3 — primary acceptance scenario (§34)', () => {
  it('preserves three resolution attempts through confirm, reject, partial, and final confirm', () => {
    const { ctx, state: opened } = startIssue();
    let state = opened;

    const taskIds = ['investigation', 'implementation', 'verification'].map((slug, index) => {
      state = createResolutionEngineState(
        createTask(state, ctx, {
          actor: product,
          title: slug === 'investigation' ? 'UX investigation' : slug === 'implementation' ? 'Implementation' : 'Verification',
          description: `${slug} work`,
          assignee: { kind: 'person', profileId: 'dev-1', displayName: 'Dev' },
        }),
      );
      return state.tasks[index].id;
    });

    for (const taskId of taskIds) {
      const dev = { kind: 'person' as const, profileId: 'dev-1', displayName: 'Dev' };
      const accept = pendingFor(state, dev).find((row) => row.contextId === taskId)!;
      state = createResolutionEngineState(performTaskAction(state, ctx, { actor: dev, actionId: accept.id, action: 'accept' }));
      const complete = pendingFor(state, dev).find((row) => row.contextId === taskId)!;
      state = createResolutionEngineState(performTaskAction(state, ctx, { actor: dev, actionId: complete.id, action: 'complete' }));
    }

    state = createResolutionEngineState(completeCollaborativeWork(state, ctx, product));
    expect(pendingFor(state, product)[0]?.actionType).toBe('propose_resolution');

    state = proposeResolution(state, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Assessment explanation and interaction flow were revised and deployed.',
      actionsTaken: 'Revised copy and deployed.',
    });
    expect(state.resolutions).toHaveLength(1);
    expect(deriveMatterStatus(state.matter, state.currentAction, ctx.now)).toBe('resolution_proposed');

    const review1 = pendingFor(state, userA)[0];
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: review1.id,
      action: 'confirm_not_resolved',
      message: 'The explanation is clearer but the assessment result still does not explain why the capability was classified this way.',
    });
    expect(state.matter.lifecycleStatus).toBe('active');
    expect(state.resolutions[0].resolutionStatus).toBe('rejected');

    state = createResolutionEngineState(
      createTask(state, ctx, {
        actor: product,
        title: 'Add assessment reasoning explanation',
        description: 'Explain classification on results screen',
        assignee: { kind: 'person', profileId: 'dev-1', displayName: 'Dev' },
      }),
    );
    const extraTask = state.tasks.at(-1)!;
    const dev = { kind: 'person' as const, profileId: 'dev-1', displayName: 'Dev' };
    const accept = pendingFor(state, dev).find((row) => row.contextId === extraTask.id)!;
    state = createResolutionEngineState(performTaskAction(state, ctx, { actor: dev, actionId: accept.id, action: 'accept' }));
    const complete = pendingFor(state, dev).find((row) => row.contextId === extraTask.id)!;
    state = createResolutionEngineState(performTaskAction(state, ctx, { actor: dev, actionId: complete.id, action: 'complete' }));

    state = proposeResolution(state, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Assessment reasoning explanation added.',
    });
    expect(state.resolutions).toHaveLength(2);

    const review2 = pendingFor(state, userA)[0];
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: review2.id,
      action: 'confirm_partially_resolved',
      message: 'Explanation works, but mobile layout still hides part of the reasoning.',
      continueMatter: true,
    });
    expect(state.resolutions[1].resolutionStatus).toBe('partially_accepted');
    expect(deriveMatterStatus(state.matter, state.currentAction, ctx.now)).toBe('partial_resolution');

    state = proposeResolution(state, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'Mobile layout shows full reasoning.',
    });
    expect(state.resolutions).toHaveLength(3);

    const review3 = pendingFor(state, userA)[0];
    state = performResolutionReview(state, ctx, {
      actor: userA,
      actionId: review3.id,
      action: 'confirm_resolved',
      message: 'Resolved / satisfied',
    });
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.matter.closeKind).toBe('confirmed_resolution');
    expect(state.resolutions.filter((row) => row.resolutionStatus === 'confirmed')).toHaveLength(1);
    expect(state.resolutions.map((row) => row.attemptNumber)).toEqual([1, 2, 3]);
    expect(state.events.some((event) => event.eventType === 'resolution_rejected')).toBe(true);
    expect(state.events.some((event) => event.eventType === 'resolution_partially_accepted')).toBe(true);
    expect(state.events.some((event) => event.eventType === 'resolution_confirmed')).toBe(true);
  });
});

describe('Phase 3 — auto-close acceptance (§35)', () => {
  it('closes with auto_no_initiator_response without claiming initiator confirmation', () => {
    const { ctx, state: opened } = startIssue();
    let state = proposeResolution(opened, ctx, {
      actor: product,
      resolutionKind: 'resolved',
      summary: 'We believe this is fixed.',
    });
    ctx.now = new Date('2026-09-10T12:00:00.000Z');
    state = processResolutionTimeouts(state, ctx);
    expect(state.matter.lifecycleStatus).toBe('closed');
    expect(state.matter.closeKind).toBe('auto_no_initiator_response');
    expect(state.matter.closeReason).toBe(AUTO_CLOSE_REASON);
    expect(state.resolutions[0].resolutionStatus).toBe('auto_closed');
  });
});
