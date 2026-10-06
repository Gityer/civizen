import { AUTO_CLOSE_REASON, type Matter } from '@/lib/matters';
import { type MatterEngineContext, type MatterEngineState, logEvent, systemActor } from '@/lib/matters-workflow-core';
import { closeMatter } from '@/lib/matters-workflow-create';

function reminderExists(
  state: MatterEngineState,
  actionId: string,
  kind: 'assigned' | 'approaching' | 'overdue',
): boolean {
  return state.reminders.some((row) => row.actionId === actionId && row.kind === kind);
}

/** Read through a function so TypeScript does not keep an earlier `!== 'closed'` narrowing after mutations. */
function isMatterClosed(matter: Matter): boolean {
  return matter.lifecycleStatus === 'closed';
}

export function processTimeouts(
  state: MatterEngineState,
  ctx: MatterEngineContext,
  claims: Set<string> = new Set(),
): MatterEngineState {
  const next: MatterEngineState = {
    ...state,
    matter: { ...state.matter },
    currentAction: state.currentAction ? { ...state.currentAction } : null,
    actions: state.actions.map((row) => ({ ...row })),
    parties: [...state.parties],
    comments: [...state.comments],
    events: [...state.events],
    attachments: [...state.attachments],
    reminders: [...state.reminders],
  };
  const action = next.currentAction;
  if (!action || next.matter.lifecycleStatus === 'closed') return next;
  if (action.status !== 'pending' && action.status !== 'overdue') return next;

  const now = ctx.now.getTime();
  const reminderAt = new Date(action.reminderAt).getTime();
  const dueAt = new Date(action.dueAt).getTime();

  const claim = (key: string): boolean => {
    if (claims.has(key)) return false;
    claims.add(key);
    return true;
  };

  if (now >= reminderAt && now < dueAt && !reminderExists(next, action.id, 'approaching')) {
    if (claim(`${action.id}:approaching`)) {
      next.reminders.push({ actionId: action.id, kind: 'approaching' });
      logEvent(next, ctx, 'reminder_sent', 'Approaching-deadline reminder sent.', systemActor(), true, {
        reminderKind: 'approaching',
      });
    }
  }

  if (now >= dueAt && action.status === 'pending') {
    if (claim(`${action.id}:overdue`)) {
      const overdue = { ...action, status: 'overdue' as const };
      next.currentAction = overdue;
      const index = next.actions.findIndex((row) => row.id === overdue.id);
      if (index >= 0) next.actions[index] = overdue;
      logEvent(next, ctx, 'action_overdue', 'The required action is overdue.', systemActor(), true);
      if (!reminderExists(next, action.id, 'overdue')) {
        next.reminders.push({ actionId: action.id, kind: 'overdue' });
        logEvent(next, ctx, 'reminder_sent', 'Overdue notification sent.', systemActor(), true, {
          reminderKind: 'overdue',
        });
      }
    }
  }

  const current = next.currentAction;
  if (current && now >= dueAt && current.timeoutAction === 'auto_close') {
    if (claim(`${current.id}:auto_close`) && !isMatterClosed(next.matter)) {
      closeMatter(next, ctx, systemActor(), 'auto_no_initiator_response', AUTO_CLOSE_REASON, true);
    }
  }

  return next;
}

export function eventSummaries(state: MatterEngineState): string[] {
  return state.events.map((event) => event.summary);
}
