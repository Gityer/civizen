import type { Json } from '@/integrations/supabase/types';
import type { GovernanceExecutionActionType } from '@/lib/governance-execution';
import type { GovernanceDecisionClass, GovernanceProposalResolutionThresholds } from '@/lib/governance-proposals';

export const GOVERNANCE_THRESHOLD_APPROVAL_CLASSES = [
  'ordinary_majority',
  'supermajority',
  'guardian_threshold',
] as const;

export type GovernanceThresholdApprovalClass = (typeof GOVERNANCE_THRESHOLD_APPROVAL_CLASSES)[number];

export type GovernanceExecutionThresholdRule = {
  actionType: GovernanceExecutionActionType;
  decisionClass: GovernanceDecisionClass;
  approvalClass: GovernanceThresholdApprovalClass;
  minApprovalShare: number;
  minDecisiveVotes: number;
  minApprovalVotes: number;
  minQuorum: number;
  requiresWindowClose: boolean;
};

type GovernanceExecutionThresholdRuleSeed = {
  approvalClass: GovernanceThresholdApprovalClass;
  minApprovalShare: number;
  minDecisiveVotes: number;
  minApprovalVotes: number;
  minQuorum: number;
  requiresWindowClose: boolean;
};

export const GOVERNANCE_DECISION_CLASS_BASELINES: Record<GovernanceDecisionClass, GovernanceExecutionThresholdRuleSeed> = {
  ordinary: {
    approvalClass: 'ordinary_majority',
    minApprovalShare: 0.5,
    minDecisiveVotes: 1,
    minApprovalVotes: 1,
    minQuorum: 1,
    requiresWindowClose: false,
  },
  elevated: {
    approvalClass: 'supermajority',
    minApprovalShare: 0.6,
    minDecisiveVotes: 2,
    minApprovalVotes: 2,
    minQuorum: 2,
    requiresWindowClose: true,
  },
  constitutional: {
    approvalClass: 'guardian_threshold',
    minApprovalShare: 0.67,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
};

export const GOVERNANCE_ACTION_THRESHOLD_OVERRIDES: Partial<Record<GovernanceExecutionActionType, GovernanceExecutionThresholdRuleSeed>> = {
  manual_follow_through: {
    approvalClass: 'ordinary_majority',
    minApprovalShare: 0.5,
    minDecisiveVotes: 1,
    minApprovalVotes: 1,
    minQuorum: 1,
    requiresWindowClose: false,
  },
  grant_role_permission: {
    approvalClass: 'guardian_threshold',
    minApprovalShare: 0.67,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  revoke_role_permission: {
    approvalClass: 'guardian_threshold',
    minApprovalShare: 0.67,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  assign_unit_member: {
    approvalClass: 'supermajority',
    minApprovalShare: 0.6,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  deactivate_unit_member: {
    approvalClass: 'supermajority',
    minApprovalShare: 0.6,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  approve_identity_verification: {
    approvalClass: 'supermajority',
    minApprovalShare: 0.6,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  revoke_identity_verification: {
    approvalClass: 'supermajority',
    minApprovalShare: 0.6,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  activate_citizen_scope: {
    approvalClass: 'guardian_threshold',
    minApprovalShare: 0.67,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  deactivate_citizen_scope: {
    approvalClass: 'guardian_threshold',
    minApprovalShare: 0.67,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  activate_monetary_policy: {
    approvalClass: 'guardian_threshold',
    minApprovalShare: 0.67,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  deactivate_monetary_policy: {
    approvalClass: 'guardian_threshold',
    minApprovalShare: 0.67,
    minDecisiveVotes: 3,
    minApprovalVotes: 2,
    minQuorum: 3,
    requiresWindowClose: true,
  },
  award_study_certification: {
    approvalClass: 'ordinary_majority',
    minApprovalShare: 0.5,
    minDecisiveVotes: 1,
    minApprovalVotes: 1,
    minQuorum: 1,
    requiresWindowClose: false,
  },
  revoke_study_certification: {
    approvalClass: 'ordinary_majority',
    minApprovalShare: 0.5,
    minDecisiveVotes: 1,
    minApprovalVotes: 1,
    minQuorum: 1,
    requiresWindowClose: false,
  },
  approve_content_item: {
    approvalClass: 'ordinary_majority',
    minApprovalShare: 0.5,
    minDecisiveVotes: 1,
    minApprovalVotes: 1,
    minQuorum: 1,
    requiresWindowClose: false,
  },
  reject_content_item: {
    approvalClass: 'ordinary_majority',
    minApprovalShare: 0.5,
    minDecisiveVotes: 1,
    minApprovalVotes: 1,
    minQuorum: 1,
    requiresWindowClose: false,
  },
  archive_content_item: {
    approvalClass: 'ordinary_majority',
    minApprovalShare: 0.5,
    minDecisiveVotes: 1,
    minApprovalVotes: 1,
    minQuorum: 1,
    requiresWindowClose: false,
  },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asNonNegativeInteger(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const next = Math.max(1, Math.floor(value));
  return next;
}

function asShare(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (value <= 0 || value > 1) return null;
  return value;
}

function asApprovalClass(value: unknown): GovernanceThresholdApprovalClass | null {
  if (typeof value !== 'string') return null;
  if (!GOVERNANCE_THRESHOLD_APPROVAL_CLASSES.includes(value as GovernanceThresholdApprovalClass)) {
    return null;
  }
  return value as GovernanceThresholdApprovalClass;
}

export function resolveGovernanceExecutionThresholdRule(args: {
  actionType: GovernanceExecutionActionType;
  decisionClass: GovernanceDecisionClass;
}): GovernanceExecutionThresholdRule {
  const baseline = GOVERNANCE_DECISION_CLASS_BASELINES[args.decisionClass];
  const override = GOVERNANCE_ACTION_THRESHOLD_OVERRIDES[args.actionType];

  return {
    actionType: args.actionType,
    decisionClass: args.decisionClass,
    approvalClass: override?.approvalClass || baseline.approvalClass,
    minApprovalShare: override?.minApprovalShare ?? baseline.minApprovalShare,
    minDecisiveVotes: override?.minDecisiveVotes ?? baseline.minDecisiveVotes,
    minApprovalVotes: override?.minApprovalVotes ?? baseline.minApprovalVotes,
    minQuorum: override?.minQuorum ?? baseline.minQuorum,
    requiresWindowClose: override?.requiresWindowClose ?? baseline.requiresWindowClose,
  };
}

export function serializeGovernanceExecutionThresholdRule(rule: GovernanceExecutionThresholdRule) {
  return {
    action_type: rule.actionType,
    decision_class: rule.decisionClass,
    approval_class: rule.approvalClass,
    min_approval_share: rule.minApprovalShare,
    min_decisive_votes: rule.minDecisiveVotes,
    min_approval_votes: rule.minApprovalVotes,
    min_quorum: rule.minQuorum,
    requires_window_close: rule.requiresWindowClose,
  };
}

export function readGovernanceExecutionThresholdRuleFromMetadata(
  metadata: Json | null | undefined,
): GovernanceExecutionThresholdRule | null {
  if (!isObject(metadata)) return null;
  if (!isObject(metadata.execution_threshold)) return null;

  const threshold = metadata.execution_threshold;
  if (typeof threshold.action_type !== 'string' || typeof threshold.decision_class !== 'string') {
    return null;
  }

  const approvalClass = asApprovalClass(threshold.approval_class);
  const minApprovalShare = asShare(threshold.min_approval_share);
  const minDecisiveVotes = asNonNegativeInteger(threshold.min_decisive_votes);
  const minApprovalVotes = asNonNegativeInteger(threshold.min_approval_votes);
  const minQuorum = asNonNegativeInteger(threshold.min_quorum);

  if (!approvalClass || !minApprovalShare || !minDecisiveVotes || !minApprovalVotes || !minQuorum) {
    return null;
  }

  if (typeof threshold.requires_window_close !== 'boolean') {
    return null;
  }

  return {
    actionType: threshold.action_type as GovernanceExecutionActionType,
    decisionClass: threshold.decision_class as GovernanceDecisionClass,
    approvalClass,
    minApprovalShare,
    minDecisiveVotes,
    minApprovalVotes,
    minQuorum,
    requiresWindowClose: threshold.requires_window_close,
  };
}

export function toGovernanceProposalResolutionThresholds(
  rule: GovernanceExecutionThresholdRule,
): GovernanceProposalResolutionThresholds {
  return {
    minApprovalShare: rule.minApprovalShare,
    minDecisiveVotes: rule.minDecisiveVotes,
    minApprovalVotes: rule.minApprovalVotes,
    minQuorum: rule.minQuorum,
    requiresWindowClose: rule.requiresWindowClose,
  };
}
