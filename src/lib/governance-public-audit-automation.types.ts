import type { Database } from '@/integrations/supabase/types';

/** Row and summary shapes for public-audit automation; the readers live in governance-public-audit-automation.ts. */
export type GovernancePublicAuditAnchorAdapterRow = Database['public']['Tables']['governance_public_audit_anchor_adapters']['Row'];

export type GovernancePublicAuditImmutableAnchorRow = Database['public']['Tables']['governance_public_audit_immutable_anchors']['Row'];

export type GovernancePublicAuditVerifierJobRow = Database['public']['Tables']['governance_public_audit_verifier_jobs']['Row'];

export type GovernancePublicAuditAnchorExecutionJobStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface GovernancePublicAuditOperationsSlaSummary {
  batchId: string;
  pendingSlaHours: number;
  lookbackHours: number;
  activeAnchorAdapterCount: number;
  activeVerifierCount: number;
  anchorPendingCount: number;
  anchorStalePendingCount: number;
  anchorFailedLookbackCount: number;
  anchorCompletedLookbackCount: number;
  anchorFailureSharePercent: number | null;
  verifierPendingCount: number;
  verifierStalePendingCount: number;
  verifierFailedLookbackCount: number;
  verifierCompletedLookbackCount: number;
  verifierFailureSharePercent: number | null;
  oldestAnchorPendingAt: string | null;
  oldestVerifierPendingAt: string | null;
  anchorSlaMet: boolean;
  verifierSlaMet: boolean;
  overallSlaMet: boolean;
}

export interface GovernancePublicAuditAnchorExecutionJobBoardRow {
  jobId: string;
  batchId: string;
  adapterId: string;
  adapterKey: string;
  adapterName: string;
  network: string;
  status: GovernancePublicAuditAnchorExecutionJobStatus;
  scheduledAt: string;
  completedAt: string | null;
  immutableReference: string | null;
  errorMessage: string | null;
}

export interface GovernancePublicAuditExternalExecutionCycleResult {
  batchId: string | null;
  anchorJobsScheduled: number;
  verifierJobsScheduled: number;
}

export interface GovernancePublicAuditExternalExecutionPolicySummary {
  policyKey: string;
  policyName: string;
  isActive: boolean;
  claimTtlMinutes: number;
  anchorMaxAttempts: number;
  verifierMaxAttempts: number;
  retryBaseDelayMinutes: number;
  retryMaxDelayMinutes: number;
  pagingEnabled: boolean;
  pagingStalePendingMinutes: number;
  pagingFailureSharePercent: number;
  oncallChannel: string;
  /** HTTPS URL from policy metadata `oncall_webhook_url` when set (optional paging dispatch). */
  oncallWebhookUrl: string | null;
  updatedAt: string | null;
}

export interface GovernancePublicAuditExternalExecutionPagingSummary {
  batchId: string | null;
  pagingEnabled: boolean;
  oncallChannel: string;
  pagingStalePendingMinutes: number;
  pagingFailureSharePercent: number;
  anchorStalePendingCount: number;
  verifierStalePendingCount: number;
  anchorFailureSharePercent: number | null;
  verifierFailureSharePercent: number | null;
  shouldPage: boolean;
  openPageCount: number;
  latestOpenPageAt: string | null;
}

export interface GovernancePublicAuditExternalExecutionAutomationStatus {
  cronSchemaAvailable: boolean;
  cronJobRegistered: boolean;
  cronJobActive: boolean;
  cronJobSchedule: string | null;
  cronJobCommand: string | null;
  latestBatchId: string | null;
  latestCycleAnchorJobsScheduled: number;
  latestCycleVerifierJobsScheduled: number;
  latestCycleEvaluatedAt: string | null;
  latestAnchorJobScheduledAt: string | null;
  latestVerifierJobScheduledAt: string | null;
  latestExternalExecutionPageOpenedAt: string | null;
}

export interface GovernancePublicAuditExternalExecutionPageBoardRow {
  pageId: string;
  batchId: string | null;
  pageKey: string;
  severity: 'info' | 'warning' | 'critical';
  pageStatus: 'open' | 'acknowledged' | 'resolved';
  pageMessage: string;
  oncallChannel: string;
  openedAt: string;
  resolvedAt: string | null;
}

export interface GovernancePublicAuditClaimedExecutionJobRow {
  jobType: 'anchor' | 'verifier';
  jobId: string;
  batchId: string;
  adapterId: string | null;
  verifierId: string | null;
  network: string | null;
  scheduledAt: string;
  attemptCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  claimedAt: string | null;
  claimExpiresAt: string | null;
}
