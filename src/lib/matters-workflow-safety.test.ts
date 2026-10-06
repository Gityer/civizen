import { describe, expect, it } from 'vitest';
import { deriveMatterStatus } from '@/lib/matters';
import { createMatter, performFormalAction, processTimeouts } from '@/lib/matters-workflow';
import { personA, personB, personC, start } from '@/test/matters-workflow-fixtures';

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
