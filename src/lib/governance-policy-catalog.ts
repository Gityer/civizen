import {
  GOVERNANCE_ACTION_THRESHOLD_OVERRIDES,
  GOVERNANCE_DECISION_CLASS_BASELINES,
  type GovernanceThresholdApprovalClass,
} from '@/lib/governance-execution-thresholds';
import { MIN_GOVERNANCE_SCORE } from '@/lib/governance-eligibility';
import { DEFAULT_GOVERNANCE_VOTING_WINDOW_HOURS, type GovernanceDecisionClass } from '@/lib/governance-proposals';

/**
 * Read model of the governance rules that are in force. It reads the same constants the proposal
 * composer and the resolver use, so what the Policies tab shows is what actually decides a vote.
 */

export type GovernanceVotingPolicyRow = {
  key: string;
  scope: 'decision_class' | 'action';
  approvalClass: GovernanceThresholdApprovalClass;
  minApprovalShare: number;
  minQuorum: number;
  minDecisiveVotes: number;
  minApprovalVotes: number;
  requiresWindowClose: boolean;
};

const DECISION_CLASS_ORDER: GovernanceDecisionClass[] = ['ordinary', 'elevated', 'constitutional'];

export function listGovernanceVotingPolicies(): { decisionClasses: GovernanceVotingPolicyRow[]; actionOverrides: GovernanceVotingPolicyRow[] } {
  const decisionClasses = DECISION_CLASS_ORDER.map((key) => ({
    key,
    scope: 'decision_class' as const,
    ...GOVERNANCE_DECISION_CLASS_BASELINES[key],
  }));

  const actionOverrides = Object.entries(GOVERNANCE_ACTION_THRESHOLD_OVERRIDES)
    .map(([key, seed]) => ({ key, scope: 'action' as const, ...seed }))
    .sort((a, b) => a.key.localeCompare(b.key));

  return { decisionClasses, actionOverrides };
}

export type GovernanceEligibilityPolicy = {
  minGovernanceScore: number;
  requiresVerifiedIdentity: true;
  requiresNativeApp: true;
  votingWindowHours: number;
  /** Votes carry weight 1 for eligible members and 0 otherwise. */
  eligibleVoteWeight: 1;
};

export function getGovernanceEligibilityPolicy(): GovernanceEligibilityPolicy {
  return {
    minGovernanceScore: MIN_GOVERNANCE_SCORE,
    requiresVerifiedIdentity: true,
    requiresNativeApp: true,
    votingWindowHours: DEFAULT_GOVERNANCE_VOTING_WINDOW_HOURS,
    eligibleVoteWeight: 1,
  };
}

export function formatApprovalShare(share: number) {
  return `${Math.round(share * 100)}%`;
}
