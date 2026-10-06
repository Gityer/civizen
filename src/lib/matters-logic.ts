import { type ActionRequirementType, DEFAULT_TIMING_POLICIES, type DurationUnit, MATTER_ACTOR_KINDS, MATTER_LIFECYCLES, MATTER_TYPES, MATTER_TYPE_DEFAULTS, MATTER_VISIBILITIES, type MatterActorKind, type MatterActorRef, type MatterLifecycle, type MatterTimingPolicy, type MatterType, type MatterTypeDefault, type MatterVisibility } from '@/lib/matters-constants';
import { type DerivedMatterStatus, type Matter, type MatterActionRequirement } from '@/lib/matters-types';

const TYPE_SET = new Set<string>(MATTER_TYPES);
const LIFECYCLE_SET = new Set<string>(MATTER_LIFECYCLES);
const VISIBILITY_SET = new Set<string>(MATTER_VISIBILITIES);
const ACTOR_KIND_SET = new Set<string>(MATTER_ACTOR_KINDS);

export function isMatterType(value: string): value is MatterType {
  return TYPE_SET.has(value);
}

export function isMatterLifecycle(value: string): value is MatterLifecycle {
  return LIFECYCLE_SET.has(value);
}

export function isMatterVisibility(value: string): value is MatterVisibility {
  return VISIBILITY_SET.has(value);
}

export function isMatterActorKind(value: string): value is MatterActorKind {
  return ACTOR_KIND_SET.has(value);
}

export function getMatterTypeDefault(matterType: MatterType): MatterTypeDefault {
  const row = MATTER_TYPE_DEFAULTS.find((item) => item.matterType === matterType);
  if (!row) return MATTER_TYPE_DEFAULTS[5];
  return row;
}

export function getTimingPolicy(
  policyId: string,
  policies: readonly MatterTimingPolicy[] = DEFAULT_TIMING_POLICIES,
): MatterTimingPolicy {
  return policies.find((policy) => policy.id === policyId) ?? DEFAULT_TIMING_POLICIES[0];
}

export function durationToMs(value: number, unit: DurationUnit): number {
  if (unit === 'hours') return value * 60 * 60 * 1000;
  // calendar_days and reserved business_days both use 24h periods in Phase 1.
  return value * 24 * 60 * 60 * 1000;
}

export function computeDueAt(
  createdAt: Date,
  policy: MatterTimingPolicy,
): { dueAt: Date; reminderAt: Date } {
  const dueAt = new Date(createdAt.getTime() + durationToMs(policy.durationValue, policy.durationUnit));
  const reminderOffset = durationToMs(policy.reminderValue, policy.reminderUnit);
  const reminderAt = new Date(Math.max(createdAt.getTime(), dueAt.getTime() - reminderOffset));
  return { dueAt, reminderAt };
}

export function actorsEqual(a: MatterActorRef, b: MatterActorRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'ai_agent') return a.agentId === b.agentId;
  return a.profileId === b.profileId;
}

export function actorLabel(actor: MatterActorRef, fallback = 'Unknown party'): string {
  if (actor.kind === 'ai_agent') {
    const name = actor.displayName?.trim() || 'AI Agent';
    return `${name} · AI`;
  }
  const name = actor.displayName?.trim();
  if (name) {
    return actor.unitLabel?.trim() ? `${name} (${actor.unitLabel.trim()})` : name;
  }
  if (actor.kind === 'system') return 'Civizen';
  return fallback;
}

export function viewerRepresents(
  viewerProfileId: string,
  actor: MatterActorRef,
  managedOrganizationIds: readonly string[] = [],
): boolean {
  if (!viewerProfileId || actor.kind === 'system' || !actor.profileId) return false;
  if (actor.profileId === viewerProfileId) return true;
  if (actor.kind === 'organization' && managedOrganizationIds.includes(actor.profileId)) {
    return true;
  }
  return false;
}

export function actionIsDisplayOverdue(
  action: Pick<MatterActionRequirement, 'status' | 'dueAt'> | null,
  now: Date = new Date(),
): boolean {
  if (!action) return false;
  if (action.status === 'overdue' || action.status === 'escalated') return true;
  if (action.status === 'pending' && new Date(action.dueAt).getTime() <= now.getTime()) return true;
  return false;
}

export function deriveMatterStatus(
  matter: Pick<Matter, 'lifecycleStatus' | 'closeKind' | 'reopenCount' | 'waitingCondition' | 'resolutionAttemptCount'>,
  action: (Pick<MatterActionRequirement, 'actionType' | 'status' | 'dueAt'> & Partial<Pick<MatterActionRequirement, 'contextKind'>>) | null,
  now: Date = new Date(),
): DerivedMatterStatus {
  if (matter.lifecycleStatus === 'draft') return 'draft';
  if (matter.lifecycleStatus === 'closed') {
    if (matter.closeKind === 'auto_no_initiator_response') return 'automatically_closed';
    if (matter.closeKind === 'confirmed_resolution') return 'resolved_confirmed';
    if (matter.closeKind === 'partially_resolved') return 'partially_resolved';
    if (matter.closeKind === 'no_action_required') return 'no_action_required';
    return 'closed';
  }
  if (matter.reopenCount > 0 && (!action || action.status === 'pending')) {
    if (action?.actionType === 'confirm_resolution' || action?.actionType === 'review_resolution') {
      return 'waiting_for_initiator';
    }
  }
  if (actionIsDisplayOverdue(action, now)) {
    return 'response_overdue';
  }
  if (action?.actionType === 'clarify') return 'clarification_needed';
  if (action?.actionType === 'review_resolution' || action?.actionType === 'confirm_resolution') {
    return 'resolution_proposed';
  }
  if (action?.actionType === 'propose_resolution') return 'waiting_for_response';
  if (action?.actionType === 'outcome_followup') return 'outcome_followup';
  if (action?.actionType === 'choose_next_party') return 'choose_next_party';
  if (matter.reopenCount > 0 && action?.status === 'pending') return 'reopened';
  if (
    action?.actionType === 'address'
    && (action.contextKind === 'resolution' || (matter.resolutionAttemptCount ?? 0) > 0)
  ) {
    return 'partial_resolution';
  }
  if (
    'collaborativeWorkStartedAt' in matter
    && matter.collaborativeWorkStartedAt
    && !('collaborativeWorkCompletedAt' in matter && matter.collaborativeWorkCompletedAt)
    && matter.lifecycleStatus === 'active'
  ) {
    return 'work_in_progress';
  }
  return 'waiting_for_response';
}

function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return count === 1 ? `1 ${singular}` : `${count} ${pluralWord}`;
}

export function formatRemaining(dueAtIso: string, now: Date = new Date()): string {
  const due = new Date(dueAtIso).getTime();
  const diff = due - now.getTime();
  if (diff <= 0) return 'Overdue';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days >= 1 && remHours > 0) return `${plural(days, 'day')} ${plural(remHours, 'hour')} remaining`;
  if (days >= 1) return `${plural(days, 'day')} remaining`;
  if (hours >= 1) return `${plural(hours, 'hour')} remaining`;
  const minutes = Math.max(1, Math.floor(diff / (60 * 1000)));
  return `${plural(minutes, 'minute')} remaining`;
}

export function formatDueIn(dueAtIso: string, now: Date = new Date()): string {
  const due = new Date(dueAtIso).getTime();
  const diff = due - now.getTime();
  if (diff <= 0) return 'Overdue';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days >= 1 && remHours > 0) return `Due in ${plural(days, 'day')} ${plural(remHours, 'hour')}.`;
  if (days >= 1) return `Due in ${plural(days, 'day')}.`;
  if (hours >= 1) return `Due in ${plural(hours, 'hour')}.`;
  return `Due in ${plural(Math.max(1, Math.floor(diff / (60 * 1000))), 'minute')}.`;
}

export function formatDueDate(dueAtIso: string): string {
  return new Date(dueAtIso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
}

export function actionExpectedCopy(actionType: ActionRequirementType): string {
  switch (actionType) {
    case 'respond':
      return 'Provide a final answer when ready. Discussion comments do not complete this action.';
    case 'responsibility_response':
      return 'Accept, redirect, or dispute responsibility.';
    case 'clarify':
      return 'Provide the requested clarification.';
    case 'address':
      return 'Address this Matter and provide a final response.';
    case 'confirm_resolution':
      return 'Confirm whether the proposed response addressed the Matter.';
    case 'review_resolution':
      return 'Review the proposed Resolution and confirm, partially accept, or reject it.';
    case 'propose_resolution':
      return 'Propose Resolution — describe what was done, the outcome claimed, and any limitations.';
    case 'outcome_followup':
      return 'Record whether the situation improved after resolution.';
    case 'manual_review':
      return 'Manual review is required after escalation.';
    case 'choose_next_party':
      return 'Choose who should take this Matter next.';
    case 'accept_task':
      return 'Accept or decline this Task.';
    case 'complete_task':
      return 'Complete the assigned work, or submit it for review.';
    case 'review_task':
      return 'Review the submitted work.';
    case 'reconsider_task':
      return 'Reassign this Task or respond to the request.';
    case 'confirm_decision':
      return 'Confirm or reject the proposed Decision.';
    case 'shared_responsibility_response':
      return 'Respond to this shared responsibility request.';
    default:
      return 'A response is required.';
  }
}

export const ESCALATION_POLICY_IDS = [
  'response_escalation',
  'responsibility_escalation',
  'responsibility_escalation_urgent',
] as const;
export type EscalationPolicyId = (typeof ESCALATION_POLICY_IDS)[number];

export function resolveEscalationPolicyId(params: {
  matterType: MatterType;
  actionType: ActionRequirementType;
  explicitPolicyId?: string | null;
}): string | null {
  if (params.explicitPolicyId) return params.explicitPolicyId;
  const defaults: Partial<Record<MatterType, Partial<Record<ActionRequirementType, string>>>> = {
    question: { respond: 'response_escalation' },
    suggestion: { respond: 'response_escalation' },
    discussion: { respond: 'response_escalation' },
    other: { respond: 'response_escalation', responsibility_response: 'responsibility_escalation' },
    issue: { responsibility_response: 'responsibility_escalation' },
    request: { responsibility_response: 'responsibility_escalation' },
  };
  return defaults[params.matterType]?.[params.actionType] ?? null;
}
