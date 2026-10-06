import type { Database } from '@/integrations/supabase/types';
import {
  readGovernancePublicAuditClientVerifierBundleProductionData,
  type GovernancePublicAuditClientMirrorFailoverTarget,
  type GovernancePublicAuditVerifierMirrorFederationDiversitySummary,
  type GovernancePublicAuditVerifierMirrorDirectoryTrustSummary,
  type GovernancePublicAuditVerifierMirrorDirectorySummaryRow,
  type GovernancePublicAuditVerifierMirrorFailoverPolicySummary,
  type GovernancePublicAuditVerifierMirrorProbeJobBoardRow,
  type GovernancePublicAuditVerifierMirrorProbeJobStatus,
  type GovernancePublicAuditVerifierMirrorProbeJobSummary,
} from '@/lib/governance-public-audit-verifier-mirror-production';
import {
  readGovernancePublicAuditVerifierFederationExchangeAttestationRows,
  readGovernancePublicAuditVerifierFederationExchangeAttestationSummary,
  readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus,
  readGovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary,
  readGovernancePublicAuditVerifierFederationDistributionGateSnapshot,
  readGovernancePublicAuditVerifierFederationPackage,
  readGovernancePublicAuditVerifierFederationPackageDistributionSummary,
  readGovernancePublicAuditVerifierFederationPackageHistoryRows,
  readGovernancePublicAuditVerifierFederationPackageSignatureRows,
  readGovernancePublicAuditVerifierFederationRecentPackageRows,
  type GovernancePublicAuditVerifierFederationDistributionGateSnapshot,
  type GovernancePublicAuditVerifierFederationExchangeAttestationRow,
  type GovernancePublicAuditVerifierFederationExchangeAttestationSummary,
  type GovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus,
  type GovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary,
  type GovernancePublicAuditVerifierFederationPackage,
  type GovernancePublicAuditVerifierFederationPackageDistributionSummary,
  type GovernancePublicAuditVerifierFederationPackageHistoryRow,
  type GovernancePublicAuditVerifierFederationPackageSignatureRow,
  type GovernancePublicAuditVerifierFederationRecentPackageRow,
} from '@/lib/governance-public-audit-verifier-federation-distribution';
import {
  readGovernancePublicAuditVerifierMirrorFederationAlertBoardRows,
  readGovernancePublicAuditVerifierMirrorFederationOnboardingBoardRows,
  readGovernancePublicAuditVerifierMirrorFederationOperationsSummary,
  readGovernancePublicAuditVerifierMirrorFederationWorkerRunRows,
  readGovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRows,
  readGovernancePublicAuditVerifierMirrorDiscoverySourceBoardRows,
  readGovernancePublicAuditVerifierMirrorDiscoverySummary,
  readGovernancePublicAuditVerifierMirrorSignerGovernanceBoardRows,
  readGovernancePublicAuditVerifierMirrorSignerGovernanceSummary,
  readGovernancePublicAuditVerifierMirrorPolicyRatificationSummary,
  type GovernancePublicAuditVerifierMirrorFederationAlertBoardRow,
  type GovernancePublicAuditVerifierMirrorFederationOnboardingBoardRow,
  type GovernancePublicAuditVerifierMirrorFederationOperationsSummary,
  type GovernancePublicAuditVerifierMirrorFederationWorkerRunRow,
  type GovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRow,
  type GovernancePublicAuditVerifierMirrorDiscoverySourceBoardRow,
  type GovernancePublicAuditVerifierMirrorDiscoverySummary,
  type GovernancePublicAuditVerifierMirrorSignerGovernanceBoardRow,
  type GovernancePublicAuditVerifierMirrorSignerGovernanceSummary,
  type GovernancePublicAuditVerifierMirrorPolicyRatificationSummary,
} from '@/lib/governance-public-audit-verifier-federation';

export type { GovernancePublicAuditClientMirrorFailoverTarget };
export type { GovernancePublicAuditVerifierMirrorFederationDiversitySummary };
export type { GovernancePublicAuditVerifierMirrorDirectoryTrustSummary };
export type { GovernancePublicAuditVerifierMirrorDirectorySummaryRow };
export type { GovernancePublicAuditVerifierMirrorFailoverPolicySummary };
export type { GovernancePublicAuditVerifierMirrorFederationOperationsSummary };
export type { GovernancePublicAuditVerifierMirrorFederationWorkerRunRow };
export type { GovernancePublicAuditVerifierMirrorProbeJobBoardRow };
export type { GovernancePublicAuditVerifierMirrorProbeJobStatus };
export type { GovernancePublicAuditVerifierMirrorProbeJobSummary };
export type { GovernancePublicAuditVerifierFederationDistributionGateSnapshot };
export type { GovernancePublicAuditVerifierFederationExchangeAttestationRow };
export type { GovernancePublicAuditVerifierFederationExchangeAttestationSummary };
export type { GovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRow };
export type { GovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRow };
export type { GovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus };
export type { GovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRow };
export type { GovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary };
export type { GovernancePublicAuditVerifierFederationPackage };
export type { GovernancePublicAuditVerifierFederationPackageDistributionSummary };
export type { GovernancePublicAuditVerifierFederationPackageHistoryRow };
export type { GovernancePublicAuditVerifierFederationPackageSignatureRow };
export type { GovernancePublicAuditVerifierFederationRecentPackageRow };
export type { GovernancePublicAuditVerifierMirrorFederationAlertBoardRow };
export type { GovernancePublicAuditVerifierMirrorFederationOnboardingBoardRow };
export type { GovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRow };
export type { GovernancePublicAuditVerifierMirrorDiscoverySourceBoardRow };
export type { GovernancePublicAuditVerifierMirrorDiscoverySummary };
export type { GovernancePublicAuditVerifierMirrorSignerGovernanceBoardRow };
export type { GovernancePublicAuditVerifierMirrorSignerGovernanceSummary };
export type { GovernancePublicAuditVerifierMirrorPolicyRatificationSummary };

export {
  formatGovernancePublicAuditVerifierMirrorProbeJobLifecycleStatusLabel,
  formatGovernancePublicAuditVerifierMirrorTrustTierLabel,
  readGovernancePublicAuditVerifierMirrorDirectorySummaryRows,
  readGovernancePublicAuditVerifierMirrorDirectoryTrustSummary,
  readGovernancePublicAuditVerifierMirrorFailoverPolicySummary,
  readGovernancePublicAuditVerifierMirrorProbeJobBoardRows,
  readGovernancePublicAuditVerifierMirrorProbeJobSummary,
} from '@/lib/governance-public-audit-verifier-mirror-production';
export {
  formatGovernancePublicAuditVerifierFederationDistributionReadinessIssue,
  formatGovernancePublicAuditVerifierFederationOpsReadinessIssue,
  readGovernancePublicAuditVerifierFederationExchangeAttestationRows,
  readGovernancePublicAuditVerifierFederationExchangeAttestationSummary,
  readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus,
  readGovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary,
  readGovernancePublicAuditVerifierFederationDistributionReadinessIssues,
  readGovernancePublicAuditVerifierFederationDistributionGateSnapshot,
  readGovernancePublicAuditVerifierFederationOpsReadinessIssues,
  readGovernancePublicAuditVerifierFederationPackage,
  readGovernancePublicAuditVerifierFederationPackageDistributionSummary,
  readGovernancePublicAuditVerifierFederationPackageHistoryRows,
  readGovernancePublicAuditVerifierFederationPackageSignatureRows,
  readGovernancePublicAuditVerifierFederationRecentPackageRows,
} from '@/lib/governance-public-audit-verifier-federation-distribution';
export {
  formatGovernancePublicAuditVerifierMirrorFederationAlertHeading,
  formatGovernancePublicAuditVerifierMirrorFederationAlertSeverityLabel,
  formatGovernancePublicAuditVerifierMirrorFederationAlertStatusLabel,
  formatGovernancePublicAuditVerifierMirrorFederationCandidateStatusLabel,
  formatGovernancePublicAuditVerifierMirrorFederationOnboardingRequestStatusLabel,
  formatGovernancePublicAuditVerifierMirrorFederationWorkerRunScopeLabel,
  formatGovernancePublicAuditVerifierMirrorFederationWorkerRunStatusLabel,
  formatGovernancePublicAuditVerifierMirrorSignerGovernanceStatusLabel,
  readGovernancePublicAuditVerifierMirrorFederationAlertBoardRows,
  readGovernancePublicAuditVerifierMirrorFederationOnboardingBoardRows,
  readGovernancePublicAuditVerifierMirrorFederationOperationsSummary,
  readGovernancePublicAuditVerifierMirrorFederationWorkerRunRows,
  readGovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRows,
  readGovernancePublicAuditVerifierMirrorDiscoverySourceBoardRows,
  readGovernancePublicAuditVerifierMirrorDiscoverySummary,
  readGovernancePublicAuditVerifierMirrorSignerGovernanceBoardRows,
  readGovernancePublicAuditVerifierMirrorSignerGovernanceSummary,
  readGovernancePublicAuditVerifierMirrorPolicyRatificationSummary,
} from '@/lib/governance-public-audit-verifier-federation';

export type GovernancePublicAuditVerifierNodeRow = Database['public']['Tables']['governance_public_audit_verifier_nodes']['Row'];
export type GovernancePublicAuditBatchVerificationRow = Database['public']['Tables']['governance_public_audit_batch_verifications']['Row'];
export type GovernancePublicAuditNetworkProofRow = Database['public']['Tables']['governance_public_audit_network_proofs']['Row'];
export type GovernancePublicAuditReplicationPolicyRow = Database['public']['Tables']['governance_public_audit_replication_policies']['Row'];

export interface GovernancePublicAuditVerifierMirrorHealthRow {
  mirrorId: string;
  mirrorKey: string;
  mirrorLabel: string | null;
  endpointUrl: string;
  mirrorType: string;
  regionCode: string;
  jurisdictionCountryCode: string;
  operatorLabel: string;
  isActive: boolean;
  lastCheckAt: string | null;
  lastCheckStatus: 'ok' | 'degraded' | 'failed' | 'unknown';
  lastCheckLatencyMs: number | null;
  lastObservedBatchId: string | null;
  lastObservedBatchHash: string | null;
  lastErrorMessage: string | null;
  isStale: boolean;
  healthStatus: 'healthy' | 'degraded' | 'critical' | 'unknown' | 'inactive';
}

export interface GovernancePublicAuditClientVerifierBundle {
  bundleVersion: string;
  bundleHash: string;
  bundlePayload: Record<string, unknown>;
  healthyMirrorCount: number;
  quorumMet: boolean;
  failoverPolicy: GovernancePublicAuditVerifierMirrorFailoverPolicySummary | null;
  failoverOrder: GovernancePublicAuditClientMirrorFailoverTarget[];
  signedDirectoryHash: string | null;
  signedDirectorySignature: string | null;
  signedDirectorySignerKey: string | null;
  signedDirectoryTrust: GovernancePublicAuditVerifierMirrorDirectoryTrustSummary | null;
  federationDiversity: GovernancePublicAuditVerifierMirrorFederationDiversitySummary | null;
  federationOperations: GovernancePublicAuditVerifierMirrorFederationOperationsSummary | null;
  federationDistribution: GovernancePublicAuditVerifierFederationPackageDistributionSummary | null;
  policyRatification: GovernancePublicAuditVerifierMirrorPolicyRatificationSummary | null;
}

export interface GovernancePublicAuditVerifierSummary {
  policyEnabled: boolean;
  requiredVerifiedCount: number;
  requiredNetworkProofCount: number;
  activeVerifierCount: number;
  verifiedCount: number;
  mismatchCount: number;
  unreachableCount: number;
  networkProofCount: number;
  meetsReplicationThreshold: boolean;
}

function asNonNegativeInteger(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return fallback;
}

function asNullableInteger(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  return null;
}

function asString(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value;
}

function asNullableString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asMirrorStatus(value: unknown): GovernancePublicAuditVerifierMirrorHealthRow['lastCheckStatus'] {
  const normalized = asString(value).trim().toLowerCase();
  if (normalized === 'ok' || normalized === 'degraded' || normalized === 'failed') return normalized;
  return 'unknown';
}

function asHealthStatus(value: unknown): GovernancePublicAuditVerifierMirrorHealthRow['healthStatus'] {
  const normalized = asString(value).trim().toLowerCase();
  if (normalized === 'healthy' || normalized === 'degraded' || normalized === 'critical' || normalized === 'inactive') return normalized;
  return 'unknown';
}

export function formatGovernancePublicAuditVerifierMirrorHealthStatusLabel(
  status: GovernancePublicAuditVerifierMirrorHealthRow['healthStatus'],
): string {
  if (status === 'healthy') return 'Healthy';
  if (status === 'degraded') return 'Degraded';
  if (status === 'critical') return 'Critical';
  if (status === 'inactive') return 'Inactive';
  return 'Unknown';
}

export function formatGovernancePublicAuditBatchVerificationResultLabel(status: string): string {
  const key = status.trim().toLowerCase();
  if (key === 'verified') return 'Verified';
  if (key === 'mismatch') return 'Mismatch';
  if (key === 'unreachable') return 'Unreachable';
  return 'Unknown result';
}

export function readGovernancePublicAuditVerifierSummary(
  rows: Database['public']['Functions']['governance_public_audit_batch_verifier_summary']['Returns'] | null,
): GovernancePublicAuditVerifierSummary | null {
  const row = rows?.[0];
  if (!row) return null;

  return {
    policyEnabled: Boolean(row.policy_enabled),
    requiredVerifiedCount: Math.max(1, asNonNegativeInteger(row.required_verified_count, 1)),
    requiredNetworkProofCount: asNonNegativeInteger(row.required_network_proof_count),
    activeVerifierCount: asNonNegativeInteger(row.active_verifier_count),
    verifiedCount: asNonNegativeInteger(row.verified_count),
    mismatchCount: asNonNegativeInteger(row.mismatch_count),
    unreachableCount: asNonNegativeInteger(row.unreachable_count),
    networkProofCount: asNonNegativeInteger(row.network_proof_count),
    meetsReplicationThreshold: Boolean(row.meets_replication_threshold),
  };
}

export function readGovernancePublicAuditVerifierMirrorHealthRows(rows: unknown): GovernancePublicAuditVerifierMirrorHealthRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      mirrorId: asString(entry.mirror_id),
      mirrorKey: asString(entry.mirror_key),
      mirrorLabel: asNullableString(entry.mirror_label),
      endpointUrl: asString(entry.endpoint_url),
      mirrorType: asString(entry.mirror_type),
      regionCode: asString(entry.region_code, 'GLOBAL'),
      jurisdictionCountryCode: asString(entry.jurisdiction_country_code, ''),
      operatorLabel: asString(entry.operator_label, 'unspecified'),
      isActive: Boolean(entry.is_active),
      lastCheckAt: asNullableString(entry.last_check_at),
      lastCheckStatus: asMirrorStatus(entry.last_check_status),
      lastCheckLatencyMs: asNullableInteger(entry.last_check_latency_ms),
      lastObservedBatchId: asNullableString(entry.last_observed_batch_id),
      lastObservedBatchHash: asNullableString(entry.last_observed_batch_hash),
      lastErrorMessage: asNullableString(entry.last_error_message),
      isStale: Boolean(entry.is_stale),
      healthStatus: asHealthStatus(entry.health_status),
    }))
    .filter((entry) => entry.mirrorId.length > 0 && entry.mirrorKey.length > 0 && entry.endpointUrl.length > 0);
}

export function readGovernancePublicAuditClientVerifierBundle(rows: unknown): GovernancePublicAuditClientVerifierBundle | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  const bundleVersion = asString(row.bundle_version);
  const bundleHash = asString(row.bundle_hash);
  const bundlePayload = asRecord(row.bundle_payload);
  if (!bundleVersion || !bundleHash || !bundlePayload) return null;

  const production = readGovernancePublicAuditClientVerifierBundleProductionData(bundlePayload);

  return {
    bundleVersion,
    bundleHash,
    bundlePayload,
    healthyMirrorCount: asNonNegativeInteger(row.healthy_mirror_count),
    quorumMet: Boolean(row.quorum_met),
    failoverPolicy: production.failoverPolicy,
    failoverOrder: production.failoverOrder,
    signedDirectoryHash: production.signedDirectoryHash,
    signedDirectorySignature: production.signedDirectorySignature,
    signedDirectorySignerKey: production.signedDirectorySignerKey,
    signedDirectoryTrust: production.signedDirectoryTrust,
    federationDiversity: production.federationDiversity,
    federationOperations: production.federationOperations,
    federationDistribution: production.federationDistribution,
    policyRatification: production.policyRatification,
  };
}

export function isMissingPublicAuditVerifierBackend(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  if (!error) return false;
  const message = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || error.code === 'PGRST202'
    || message.includes('governance_public_audit_verifier_')
    || message.includes('governance_public_audit_network_proofs')
    || message.includes('governance_public_audit_batch_verifications')
    || message.includes('governance_public_audit_batch_verifier_summary')
    || message.includes('governance_public_audit_verifier_mirrors')
    || message.includes('governance_public_audit_verifier_mirror_checks')
    || message.includes('governance_public_audit_verifier_mirror_health_summary')
    || message.includes('governance_public_audit_client_verifier_bundle')
    || message.includes('governance_public_audit_verifier_mirror_directory_signers')
    || message.includes('governance_public_audit_verifier_mirror_directories')
    || message.includes('governance_public_audit_verifier_mirror_directory_attestations')
    || message.includes('governance_public_audit_verifier_mirror_failover_policies')
    || message.includes('governance_public_audit_verifier_mirror_probe_jobs')
    || message.includes('governance_public_audit_verifier_mirror_discovery_sources')
    || message.includes('governance_public_audit_verifier_mirror_discovery_runs')
    || message.includes('governance_public_audit_verifier_mirror_discovered_candidates')
    || message.includes('governance_public_audit_verifier_mirror_policy_ratifications')
    || message.includes('governance_public_audit_verifier_mirror_signer_governance_attes')
    || message.includes('governance_public_audit_verifier_mirror_failover_policy_summary')
    || message.includes('governance_public_audit_verifier_mirror_directory_summary')
    || message.includes('governance_public_audit_verifier_mirror_directory_trust_summary')
    || message.includes('governance_public_audit_verifier_mirror_probe_job_board')
    || message.includes('governance_public_audit_verifier_mirror_probe_job_summary')
    || message.includes('governance_public_audit_verifier_mirror_discovery_source_board')
    || message.includes('governance_public_audit_verifier_mirror_discovered_candidate_bo')
    || message.includes('governance_public_audit_verifier_mirror_discovery_summary')
    || message.includes('governance_public_audit_verifier_mirror_federation_diversity_su')
    || message.includes('governance_public_audit_verifier_mirror_signer_governance_board')
    || message.includes('governance_public_audit_verifier_mirror_signer_governance_summa')
    || message.includes('governance_public_audit_verifier_mirror_policy_hash')
    || message.includes('governance_public_audit_verifier_mirror_policy_ratification_sum')
    || message.includes('governance_public_audit_verifier_mirror_federation_operators')
    || message.includes('governance_public_audit_verifier_mirror_federation_onboarding_r')
    || message.includes('governance_public_audit_verifier_mirror_federation_worker_runs')
    || message.includes('governance_public_audit_verifier_mirror_federation_alerts')
    || message.includes('governance_public_audit_verifier_federation_packages')
    || message.includes('governance_public_audit_verifier_federation_package_signatures')
    || message.includes('governance_public_audit_verifier_mirror_federation_onboarding_b')
    || message.includes('governance_public_audit_verifier_mirror_federation_alert_board')
    || message.includes('governance_public_audit_verifier_mirror_federation_operations_s')
    || message.includes('governance_public_audit_verifier_federation_package_distributio')
    || message.includes('governance_public_audit_verifier_federation_package_signature_b')
    || message.includes('governance_public_audit_verifier_federation_pkg_digest_text')
    || message.includes('governance_public_audit_verifier_federation_dist_pkg_history')
    || message.includes('governance_public_audit_verifier_federation_distribution_gate')
    || message.includes('gpav_fed_exchange_receipt_automation_status')
    || message.includes('register_governance_public_audit_verifier_node')
    || message.includes('record_governance_public_audit_batch_verification')
    || message.includes('record_governance_public_audit_network_proof')
    || message.includes('register_governance_public_audit_verifier_mirror')
    || message.includes('record_governance_public_audit_verifier_mirror_check')
    || message.includes('register_governance_public_audit_verifier_mirror_directory_sign')
    || message.includes('upsert_governance_public_audit_verifier_mirror_failover_policy')
    || message.includes('set_governance_public_audit_verifier_mirror_min_independent_sig')
    || message.includes('schedule_governance_public_audit_verifier_mirror_probe_jobs')
    || message.includes('complete_governance_public_audit_verifier_mirror_probe_job')
    || message.includes('publish_governance_public_audit_verifier_mirror_directory')
    || message.includes('record_governance_public_audit_verifier_mirror_directory_attest')
    || message.includes('register_governance_public_audit_verifier_mirror_discovery_sour')
    || message.includes('record_governance_public_audit_verifier_mirror_discovery_run')
    || message.includes('upsert_governance_public_audit_verifier_mirror_discovered_candi')
    || message.includes('promote_governance_public_audit_verifier_mirror_discovered_cand')
    || message.includes('set_governance_public_audit_verifier_mirror_policy_ratification')
    || message.includes('record_governance_public_audit_verifier_mirror_policy_ratificat')
    || message.includes('sync_governance_public_audit_verifier_mirror_signer_governance_')
    || message.includes('record_governance_public_audit_verifier_mirror_signer_governanc')
    || message.includes('set_governance_public_audit_verifier_mirror_signer_governance_r')
    || message.includes('register_governance_public_audit_verifier_mirror_federation_ope')
    || message.includes('submit_governance_public_audit_verifier_mirror_federation_onboa')
    || message.includes('review_governance_public_audit_verifier_mirror_federation_onboa')
    || message.includes('onboard_governance_public_audit_verifier_mirror_federation_requ')
    || message.includes('record_governance_public_audit_verifier_mirror_federation_worke')
    || message.includes('open_governance_public_audit_verifier_mirror_federation_alert')
    || message.includes('resolve_governance_public_audit_verifier_mirror_federation_aler')
    || message.includes('set_governance_public_audit_verifier_mirror_federation_ops_requ')
    || message.includes('capture_governance_public_audit_verifier_federation_package')
    || message.includes('sign_governance_public_audit_verifier_federation_package')
    || message.includes('run_governance_public_audit_verifier_federation_distribution_ve')
    || message.includes('governance_proposal_meets_verifier_federation_distribution_gate')
    || message.includes('governance_proposal_is_execution_ready')
  );
}
