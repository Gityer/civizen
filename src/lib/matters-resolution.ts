/**
 * Matter Collaboration Phase 3 — Resolution, evaluation, outcome follow-up types.
 */
import type { MatterActorRef } from '@/lib/matters';

export const RESOLUTION_KINDS = [
  'answered',
  'addressed',
  'resolved',
  'partially_resolved',
  'no_action_required',
  'unable_to_resolve',
  'referred_elsewhere',
  'withdrawn',
  'other',
] as const;
export type ResolutionKind = (typeof RESOLUTION_KINDS)[number];

export const RESOLUTION_STATUSES = [
  'proposed',
  'confirmed',
  'partially_accepted',
  'rejected',
  'auto_closed',
  'superseded',
] as const;
export type ResolutionStatus = (typeof RESOLUTION_STATUSES)[number];

export const RESOLUTION_CLOSURE_KINDS = [
  'confirmed_resolution',
  'auto_closed_no_response',
  'partial_resolution_accepted',
  'no_action_required',
  'withdrawn_by_initiator',
  'unable_to_resolve',
  'referred',
  'administrative_close',
  'other',
] as const;
export type ResolutionClosureKind = (typeof RESOLUTION_CLOSURE_KINDS)[number];

export const INITIATOR_RESOLUTION_RESPONSES = [
  'confirm_resolved',
  'confirm_partially_resolved',
  'confirm_not_resolved',
  'need_clarification',
  'cannot_verify',
] as const;
export type InitiatorResolutionResponse = (typeof INITIATOR_RESOLUTION_RESPONSES)[number];

export const EVALUATION_DIMENSIONS = [
  'resolution_quality',
  'completeness',
  'timeliness',
  'communication',
  'responsiveness',
  'collaboration',
] as const;
export type EvaluationDimension = (typeof EVALUATION_DIMENSIONS)[number];

export const EVALUATION_RATINGS = ['poor', 'limited', 'adequate', 'good', 'excellent'] as const;
export type EvaluationRating = (typeof EVALUATION_RATINGS)[number];

export const EVALUATOR_ROLES = [
  'initiator',
  'responsible_lead',
  'responsible_collaborator',
  'assigned_evaluator',
  'affected_participant',
] as const;
export type EvaluatorRole = (typeof EVALUATOR_ROLES)[number];

export const OUTCOME_RESULTS = [
  'improved',
  'partly_improved',
  'no_change',
  'worsened',
  'unable_to_determine',
] as const;
export type OutcomeResult = (typeof OUTCOME_RESULTS)[number];

export type MatterResolution = {
  id: string;
  matterId: string;
  attemptNumber: number;
  resolutionKind: ResolutionKind;
  summary: string;
  actionsTaken: string | null;
  outstandingItems: string | null;
  limitations: string | null;
  resolutionStatus: ResolutionStatus;
  responsiblePartyPosition: string;
  initiatorPosition: string | null;
  evaluatorPosition: string | null;
  proposedBy: { kind: string; profileId: string; displayName?: string | null };
  proposedAt: string;
  closedAt: string | null;
  closureKind: ResolutionClosureKind | null;
  createdAt: string;
  updatedAt: string;
};

export type MatterEvaluation = {
  id: string;
  matterId: string;
  resolutionId: string | null;
  evaluatorRole: EvaluatorRole;
  evaluator: { kind: string; profileId: string; displayName?: string | null };
  dimension: EvaluationDimension;
  rating: EvaluationRating;
  comment: string | null;
  visibility: 'participants' | 'organization' | 'private';
  createdAt: string;
};

export type MatterOutcomeFollowup = {
  id: string;
  matterId: string;
  resolutionId: string | null;
  reviewDueAt: string;
  outcomeQuestion: string;
  targetIndicator: string | null;
  reviewer: MatterActorRef;
  status: 'scheduled' | 'pending' | 'completed' | 'cancelled';
  result: OutcomeResult | null;
  notes: string | null;
  actionId: string | null;
  humanOutcomeReviewId: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type MatterPatternCounts = {
  redirectCount: number;
  reopenCount: number;
  resolutionRejectionCount: number;
  resolutionAttemptCount: number;
};

export function resolutionKindsForMatterType(matterType: string): ResolutionKind[] {
  switch (matterType) {
    case 'question':
      return ['answered', 'no_action_required', 'unable_to_resolve', 'referred_elsewhere', 'other'];
    case 'issue':
      return ['resolved', 'partially_resolved', 'unable_to_resolve', 'no_action_required', 'other'];
    case 'suggestion':
      return ['resolved', 'partially_resolved', 'addressed', 'other'];
    case 'request':
      return ['resolved', 'partially_resolved', 'unable_to_resolve', 'other'];
    default:
      return ['resolved', 'partially_resolved', 'addressed', 'no_action_required', 'other'];
  }
}

export function resolutionStatusLabel(resolution: Pick<MatterResolution, 'resolutionStatus' | 'responsiblePartyPosition' | 'initiatorPosition'>): string {
  if (resolution.initiatorPosition) {
    return `${resolution.responsiblePartyPosition} · Initiator: ${resolution.initiatorPosition}`;
  }
  return resolution.responsiblePartyPosition;
}

export function patternWarning(counts: MatterPatternCounts): string | null {
  if (counts.redirectCount >= 3) return 'This Matter has been redirected multiple times.';
  if (counts.reopenCount >= 3) return 'This Matter has reopened several times.';
  if (counts.resolutionRejectionCount >= 3) return 'Resolution has been rejected repeatedly.';
  return null;
}
