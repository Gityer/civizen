import type { Database } from '@/integrations/supabase/types';

export type GovernancePublicAuditAnchorAdapterRow = Database['public']['Tables']['governance_public_audit_anchor_adapters']['Row'];
export type GovernancePublicAuditImmutableAnchorRow = Database['public']['Tables']['governance_public_audit_immutable_anchors']['Row'];
export type GovernancePublicAuditVerifierJobRow = Database['public']['Tables']['governance_public_audit_verifier_jobs']['Row'];
export type GovernancePublicAuditAnchorExecutionJobStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

/** Page size for `governance_public_audit_external_execution_page_board` (automation, federation steward load, Governance hub). */
export const GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES = 120;

/** `page_key` for signed demographic feed worker on-call escalation (`governance_public_audit_external_execution_pages`). */
export const GOVERNANCE_ACTIVATION_DEMOGRAPHIC_FEED_WORKER_ESCALATION_PAGE_KEY =
  'activation_demographic_feed_worker_escalation';

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNullableString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asString(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value;
}

function asNonNegativeInteger(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return fallback;
}

function asNullableNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 't' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === 'f' || normalized === '0' || normalized === 'no') return false;
  }
  return fallback;
}

function asAnchorExecutionJobStatus(value: unknown): GovernancePublicAuditAnchorExecutionJobStatus {
  const status = asString(value).trim().toLowerCase();
  if (status === 'completed' || status === 'failed' || status === 'cancelled') return status;
  return 'pending';
}

function asPageSeverity(value: unknown): GovernancePublicAuditExternalExecutionPageBoardRow['severity'] {
  const severity = asString(value).trim().toLowerCase();
  if (severity === 'info' || severity === 'critical') return severity;
  return 'warning';
}

function asPageStatus(value: unknown): GovernancePublicAuditExternalExecutionPageBoardRow['pageStatus'] {
  const status = asString(value).trim().toLowerCase();
  if (status === 'acknowledged' || status === 'resolved') return status;
  return 'open';
}

export function readGovernancePublicAuditOperationsSlaSummary(rows: unknown): GovernancePublicAuditOperationsSlaSummary | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  const batchId = asNullableString(row.batch_id);
  if (!batchId) return null;

  return {
    batchId,
    pendingSlaHours: Math.max(1, asNonNegativeInteger(row.pending_sla_hours, 4)),
    lookbackHours: Math.max(1, asNonNegativeInteger(row.lookback_hours, 24)),
    activeAnchorAdapterCount: asNonNegativeInteger(row.active_anchor_adapter_count),
    activeVerifierCount: asNonNegativeInteger(row.active_verifier_count),
    anchorPendingCount: asNonNegativeInteger(row.anchor_pending_count),
    anchorStalePendingCount: asNonNegativeInteger(row.anchor_stale_pending_count),
    anchorFailedLookbackCount: asNonNegativeInteger(row.anchor_failed_lookback_count),
    anchorCompletedLookbackCount: asNonNegativeInteger(row.anchor_completed_lookback_count),
    anchorFailureSharePercent: asNullableNumber(row.anchor_failure_share_percent),
    verifierPendingCount: asNonNegativeInteger(row.verifier_pending_count),
    verifierStalePendingCount: asNonNegativeInteger(row.verifier_stale_pending_count),
    verifierFailedLookbackCount: asNonNegativeInteger(row.verifier_failed_lookback_count),
    verifierCompletedLookbackCount: asNonNegativeInteger(row.verifier_completed_lookback_count),
    verifierFailureSharePercent: asNullableNumber(row.verifier_failure_share_percent),
    oldestAnchorPendingAt: asNullableString(row.oldest_anchor_pending_at),
    oldestVerifierPendingAt: asNullableString(row.oldest_verifier_pending_at),
    anchorSlaMet: Boolean(row.anchor_sla_met),
    verifierSlaMet: Boolean(row.verifier_sla_met),
    overallSlaMet: Boolean(row.overall_sla_met),
  };
}

export function readGovernancePublicAuditAnchorExecutionJobBoardRows(rows: unknown): GovernancePublicAuditAnchorExecutionJobBoardRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      jobId: asString(entry.job_id),
      batchId: asString(entry.batch_id),
      adapterId: asString(entry.adapter_id),
      adapterKey: asString(entry.adapter_key),
      adapterName: asString(entry.adapter_name),
      network: asString(entry.network),
      status: asAnchorExecutionJobStatus(entry.status),
      scheduledAt: asString(entry.scheduled_at),
      completedAt: asNullableString(entry.completed_at),
      immutableReference: asNullableString(entry.immutable_reference),
      errorMessage: asNullableString(entry.error_message),
    }))
    .filter((entry) => entry.jobId.length > 0 && entry.batchId.length > 0 && entry.adapterId.length > 0);
}

export function readGovernancePublicAuditExternalExecutionCycleResult(rows: unknown): GovernancePublicAuditExternalExecutionCycleResult | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  return {
    batchId: asNullableString(row.batch_id),
    anchorJobsScheduled: asNonNegativeInteger(row.anchor_jobs_scheduled),
    verifierJobsScheduled: asNonNegativeInteger(row.verifier_jobs_scheduled),
  };
}

export function readGovernancePublicAuditExternalExecutionPolicySummary(rows: unknown): GovernancePublicAuditExternalExecutionPolicySummary | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  const policyKey = asNullableString(row.policy_key);
  if (!policyKey) return null;

  return {
    policyKey,
    policyName: asString(row.policy_name, 'Default external execution policy'),
    isActive: asBoolean(row.is_active, true),
    claimTtlMinutes: Math.max(1, asNonNegativeInteger(row.claim_ttl_minutes, 10)),
    anchorMaxAttempts: Math.max(1, asNonNegativeInteger(row.anchor_max_attempts, 5)),
    verifierMaxAttempts: Math.max(1, asNonNegativeInteger(row.verifier_max_attempts, 5)),
    retryBaseDelayMinutes: Math.max(1, asNonNegativeInteger(row.retry_base_delay_minutes, 5)),
    retryMaxDelayMinutes: Math.max(1, asNonNegativeInteger(row.retry_max_delay_minutes, 120)),
    pagingEnabled: asBoolean(row.paging_enabled, true),
    pagingStalePendingMinutes: Math.max(1, asNonNegativeInteger(row.paging_stale_pending_minutes, 30)),
    pagingFailureSharePercent: Math.max(0, asNullableNumber(row.paging_failure_share_percent) ?? 25),
    oncallChannel: asString(row.oncall_channel, 'public_audit_ops'),
    oncallWebhookUrl: asNullableString(row.oncall_webhook_url),
    updatedAt: asNullableString(row.updated_at),
  };
}

export function readGovernancePublicAuditExternalExecutionPagingSummary(rows: unknown): GovernancePublicAuditExternalExecutionPagingSummary | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  return {
    batchId: asNullableString(row.batch_id),
    pagingEnabled: asBoolean(row.paging_enabled, true),
    oncallChannel: asString(row.oncall_channel, 'public_audit_ops'),
    pagingStalePendingMinutes: Math.max(1, asNonNegativeInteger(row.paging_stale_pending_minutes, 30)),
    pagingFailureSharePercent: Math.max(0, asNullableNumber(row.paging_failure_share_percent) ?? 25),
    anchorStalePendingCount: asNonNegativeInteger(row.anchor_stale_pending_count),
    verifierStalePendingCount: asNonNegativeInteger(row.verifier_stale_pending_count),
    anchorFailureSharePercent: asNullableNumber(row.anchor_failure_share_percent),
    verifierFailureSharePercent: asNullableNumber(row.verifier_failure_share_percent),
    shouldPage: asBoolean(row.should_page, false),
    openPageCount: asNonNegativeInteger(row.open_page_count),
    latestOpenPageAt: asNullableString(row.latest_open_page_at),
  };
}

export function readGovernancePublicAuditExternalExecutionAutomationStatus(rows: unknown): GovernancePublicAuditExternalExecutionAutomationStatus | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  return {
    cronSchemaAvailable: asBoolean(row.cron_schema_available, false),
    cronJobRegistered: asBoolean(row.cron_job_registered, false),
    cronJobActive: asBoolean(row.cron_job_active, false),
    cronJobSchedule: asNullableString(row.cron_job_schedule),
    cronJobCommand: asNullableString(row.cron_job_command),
    latestBatchId: asNullableString(row.latest_batch_id),
    latestCycleAnchorJobsScheduled: asNonNegativeInteger(row.latest_cycle_anchor_jobs_scheduled),
    latestCycleVerifierJobsScheduled: asNonNegativeInteger(row.latest_cycle_verifier_jobs_scheduled),
    latestCycleEvaluatedAt: asNullableString(row.latest_cycle_evaluated_at),
    latestAnchorJobScheduledAt: asNullableString(row.latest_anchor_job_scheduled_at),
    latestVerifierJobScheduledAt: asNullableString(row.latest_verifier_job_scheduled_at),
    latestExternalExecutionPageOpenedAt: asNullableString(row.latest_external_execution_page_opened_at),
  };
}

export function readGovernancePublicAuditExternalExecutionPageBoardRows(rows: unknown): GovernancePublicAuditExternalExecutionPageBoardRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      pageId: asString(entry.page_id),
      batchId: asNullableString(entry.batch_id),
      pageKey: asString(entry.page_key),
      severity: asPageSeverity(entry.severity),
      pageStatus: asPageStatus(entry.page_status),
      pageMessage: asString(entry.page_message),
      oncallChannel: asString(entry.oncall_channel, 'public_audit_ops'),
      openedAt: asString(entry.opened_at),
      resolvedAt: asNullableString(entry.resolved_at),
    }))
    .filter((entry) => entry.pageId.length > 0 && entry.pageKey.length > 0);
}

export function countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring(
  pages: GovernancePublicAuditExternalExecutionPageBoardRow[],
  pageKeySubstring: string,
): number {
  const needle = pageKeySubstring.trim().toLowerCase();
  if (!needle.length) return 0;
  return pages.filter(
    (page) =>
      page.pageKey.toLowerCase().includes(needle)
      && (page.pageStatus === 'open' || page.pageStatus === 'acknowledged'),
  ).length;
}

export function readGovernancePublicAuditClaimedExecutionJobs(rows: unknown): GovernancePublicAuditClaimedExecutionJobRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => {
      const jobType = asString(entry.job_type).trim().toLowerCase() === 'verifier' ? ('verifier' as const) : ('anchor' as const);
      return {
        jobType,
        jobId: asString(entry.job_id),
        batchId: asString(entry.batch_id),
        adapterId: asNullableString(entry.adapter_id),
        verifierId: asNullableString(entry.verifier_id),
        network: asNullableString(entry.network),
        scheduledAt: asString(entry.scheduled_at),
        attemptCount: asNonNegativeInteger(entry.attempt_count),
        maxAttempts: Math.max(1, asNonNegativeInteger(entry.max_attempts, 1)),
        nextAttemptAt: asString(entry.next_attempt_at),
        claimedAt: asNullableString(entry.claimed_at),
        claimExpiresAt: asNullableString(entry.claim_expires_at),
      };
    })
    .filter((entry) => entry.jobId.length > 0 && entry.batchId.length > 0 && entry.scheduledAt.length > 0);
}

const QUEUE_JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function formatGovernancePublicAuditQueueJobStatusLabel(status: string): string {
  const key = status.trim().toLowerCase();
  return QUEUE_JOB_STATUS_LABELS[key] ?? 'Unknown status';
}

export function isMissingPublicAuditAutomationBackend(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  if (!error) return false;
  const message = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || error.code === 'PGRST202'
    || message.includes('governance_public_audit_anchor_adapters')
    || message.includes('governance_public_audit_immutable_anchors')
    || message.includes('governance_public_audit_verifier_jobs')
    || message.includes('governance_public_audit_anchor_execution_jobs')
    || message.includes('governance_public_audit_operations_sla_summary')
    || message.includes('governance_public_audit_anchor_execution_job_board')
    || message.includes('run_governance_public_audit_external_execution_cycle')
    || message.includes('register_governance_public_audit_anchor_adapter')
    || message.includes('record_governance_public_audit_immutable_anchor')
    || message.includes('schedule_governance_public_audit_verifier_jobs')
    || message.includes('complete_governance_public_audit_verifier_job')
    || message.includes('schedule_governance_public_audit_anchor_execution_jobs')
    || message.includes('complete_governance_public_audit_anchor_execution_job')
    || message.includes('governance_public_audit_external_execution_policies')
    || message.includes('governance_public_audit_external_execution_pages')
    || message.includes('governance_public_audit_external_execution_policy_summary')
    || message.includes('set_governance_public_audit_external_execution_policy')
    || message.includes('claim_governance_public_audit_external_execution_jobs')
    || message.includes('governance_public_audit_external_execution_paging_summary')
    || message.includes('governance_public_audit_external_execution_page_board')
    || message.includes('governance_public_audit_external_execution_automation_status')
    || message.includes('resolve_governance_public_audit_external_execution_page')
    || message.includes('current_profile_can_manage_public_audit_verifiers')
  );
}
