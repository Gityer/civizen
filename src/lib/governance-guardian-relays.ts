import type { Database } from '@/integrations/supabase/types';
import type {
  GovernanceProposalGuardianRelayAlertBoardRow,
  GovernanceProposalGuardianRelayAttestationAuditRow,
  GovernanceProposalGuardianRelayClientProofManifest,
  GovernanceProposalGuardianRelayClientVerificationDistributionSummary,
  GovernanceProposalGuardianRelayClientVerificationPackage,
  GovernanceProposalGuardianRelayClientVerificationSignatureRow,
  GovernanceProposalGuardianRelayDiversityAudit,
  GovernanceProposalGuardianRelayOperationsSummary,
  GovernanceProposalGuardianRelayRecentAuditRow,
  GovernanceProposalGuardianRelayRecentClientManifestRow,
  GovernanceProposalGuardianRelayRecentClientVerificationPackageRow,
  GovernanceProposalGuardianRelaySummary,
  GovernanceProposalGuardianRelayTrustMinimizedSummary,
  GovernanceProposalGuardianRelayWorkerRunBoardRow,
  GuardianRelayAttestationRow,
  GuardianRelayNodeRow,
  GuardianRelayPolicyRow,
} from '@/lib/governance-guardian-relays.types';

export type {
  GovernanceProposalGuardianRelayAlertBoardRow,
  GovernanceProposalGuardianRelayAttestationAuditRow,
  GovernanceProposalGuardianRelayClientProofManifest,
  GovernanceProposalGuardianRelayClientVerificationDistributionSummary,
  GovernanceProposalGuardianRelayClientVerificationPackage,
  GovernanceProposalGuardianRelayClientVerificationSignatureRow,
  GovernanceProposalGuardianRelayDiversityAudit,
  GovernanceProposalGuardianRelayOperationsSummary,
  GovernanceProposalGuardianRelayRecentAuditRow,
  GovernanceProposalGuardianRelayRecentClientManifestRow,
  GovernanceProposalGuardianRelayRecentClientVerificationPackageRow,
  GovernanceProposalGuardianRelaySummary,
  GovernanceProposalGuardianRelayTrustMinimizedSummary,
  GovernanceProposalGuardianRelayWorkerRunBoardRow,
  GuardianRelayAttestationRow,
  GuardianRelayNodeRow,
  GuardianRelayPolicyRow,
} from '@/lib/governance-guardian-relays.types';

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

function asNullableString(value: unknown) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function asString(value: unknown, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asRunStatus(value: unknown): GovernanceProposalGuardianRelayOperationsSummary['lastWorkerRunStatus'] {
  const normalized = asString(value).trim().toLowerCase();
  if (normalized === 'ok' || normalized === 'degraded' || normalized === 'failed') return normalized;
  return 'unknown';
}

function asWorkerRunScope(value: unknown): GovernanceProposalGuardianRelayWorkerRunBoardRow['runScope'] {
  const normalized = asString(value).trim().toLowerCase();
  if (normalized === 'attestation_sweep' || normalized === 'diversity_audit' || normalized === 'manifest_capture' || normalized === 'manual') return normalized;
  return 'unknown';
}

function asAlertSeverity(value: unknown): GovernanceProposalGuardianRelayAlertBoardRow['severity'] {
  const normalized = asString(value).trim().toLowerCase();
  if (normalized === 'info' || normalized === 'warning' || normalized === 'critical') return normalized;
  return 'unknown';
}

function asAlertStatus(value: unknown): GovernanceProposalGuardianRelayAlertBoardRow['alertStatus'] {
  const normalized = asString(value).trim().toLowerCase();
  if (normalized === 'open' || normalized === 'acknowledged' || normalized === 'resolved') return normalized;
  return 'unknown';
}

export function readGovernanceProposalGuardianRelaySummary(
  rows: Database['public']['Functions']['governance_proposal_guardian_relay_summary']['Returns'] | null,
): GovernanceProposalGuardianRelaySummary | null {
  const row = rows?.[0];
  if (!row) return null;

  return {
    policyEnabled: Boolean(row.policy_enabled),
    requiredRelayAttestations: Math.max(1, asNonNegativeInteger(row.required_relay_attestations, 1)),
    requireChainProofMatch: Boolean(row.require_chain_proof_match),
    activeRelayCount: asNonNegativeInteger(row.active_relay_count),
    relayVerifiedCount: asNonNegativeInteger(row.relay_verified_count),
    relayMismatchCount: asNonNegativeInteger(row.relay_mismatch_count),
    relayUnreachableCount: asNonNegativeInteger(row.relay_unreachable_count),
    signersWithRelayQuorumCount: asNonNegativeInteger(row.signers_with_relay_quorum_count),
    signersWithChainProofCount: asNonNegativeInteger(row.signers_with_chain_proof_count),
    externalApprovalCount: asNonNegativeInteger(row.external_approval_count),
    relayQuorumMet: Boolean(row.relay_quorum_met),
    chainProofMatchMet: Boolean(row.chain_proof_match_met),
  };
}

export function readGovernanceProposalGuardianRelayDiversityAudit(rows: unknown): GovernanceProposalGuardianRelayDiversityAudit | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const row = asRecord(rows[0]);
  if (!row) return null;

  return {
    policyEnabled: Boolean(row.policy_enabled),
    requiredRelayAttestations: Math.max(1, asNonNegativeInteger(row.required_relay_attestations, 1)),
    minDistinctRelayRegions: Math.max(1, asNonNegativeInteger(row.min_distinct_relay_regions, 1)),
    minDistinctRelayProviders: Math.max(1, asNonNegativeInteger(row.min_distinct_relay_providers, 1)),
    minDistinctRelayOperators: Math.max(1, asNonNegativeInteger(row.min_distinct_relay_operators, 1)),
    verifiedRelayCount: asNonNegativeInteger(row.verified_relay_count),
    distinctRegionsCount: asNonNegativeInteger(row.distinct_regions_count),
    distinctProvidersCount: asNonNegativeInteger(row.distinct_providers_count),
    distinctOperatorsCount: asNonNegativeInteger(row.distinct_operators_count),
    dominantRegionSharePercent: asNullableNumber(row.dominant_region_share_percent),
    dominantProviderSharePercent: asNullableNumber(row.dominant_provider_share_percent),
    dominantOperatorSharePercent: asNullableNumber(row.dominant_operator_share_percent),
    regionDiversityMet: Boolean(row.region_diversity_met),
    providerDiversityMet: Boolean(row.provider_diversity_met),
    operatorDiversityMet: Boolean(row.operator_diversity_met),
    overallDiversityMet: Boolean(row.overall_diversity_met),
  };
}

export function readGovernanceProposalGuardianRelayAttestationAuditRows(rows: unknown): GovernanceProposalGuardianRelayAttestationAuditRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => {
      const status = asString(entry.recent_health_status, 'unknown');
      const normalizedStatus =
        status === 'healthy' || status === 'degraded' || status === 'critical' || status === 'unknown'
          ? (status as 'healthy' | 'degraded' | 'critical' | 'unknown')
          : 'unknown';

      return {
        relayId: asString(entry.relay_id),
        relayKey: asString(entry.relay_key),
        relayLabel: asNullableString(entry.relay_label),
        relayRegionCode: asString(entry.relay_region_code, 'GLOBAL'),
        relayInfrastructureProvider: asString(entry.relay_infrastructure_provider, 'unspecified'),
        relayOperatorLabel: asString(entry.relay_operator_label, 'unspecified'),
        relayTrustDomain: asString(entry.relay_trust_domain, 'public'),
        totalAttestationCount: asNonNegativeInteger(entry.total_attestation_count),
        verifiedCount: asNonNegativeInteger(entry.verified_count),
        mismatchCount: asNonNegativeInteger(entry.mismatch_count),
        unreachableCount: asNonNegativeInteger(entry.unreachable_count),
        lastAttestedAt: asNullableString(entry.last_attested_at),
        recentAttestationCount: asNonNegativeInteger(entry.recent_attestation_count),
        recentFailureCount: asNonNegativeInteger(entry.recent_failure_count),
        recentHealthScore: asNullableNumber(entry.recent_health_score),
        recentHealthStatus: normalizedStatus,
      };
    })
    .filter((entry) => entry.relayId.length > 0 && entry.relayKey.length > 0);
}

export function readGovernanceProposalGuardianRelayRecentAuditRows(rows: unknown): GovernanceProposalGuardianRelayRecentAuditRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      reportId: asString(entry.report_id),
      capturedAt: asString(entry.captured_at),
      overallDiversityMet: Boolean(entry.overall_diversity_met),
      relayQuorumMet: Boolean(entry.relay_quorum_met),
      chainProofMatchMet: Boolean(entry.chain_proof_match_met),
      verifiedRelayCount: asNonNegativeInteger(entry.verified_relay_count),
      distinctRegionsCount: asNonNegativeInteger(entry.distinct_regions_count),
      distinctProvidersCount: asNonNegativeInteger(entry.distinct_providers_count),
      distinctOperatorsCount: asNonNegativeInteger(entry.distinct_operators_count),
      auditNotes: asNullableString(entry.audit_notes),
    }))
    .filter((entry) => entry.reportId.length > 0 && entry.capturedAt.length > 0);
}

export function readGovernanceProposalGuardianRelayTrustMinimizedSummary(rows: unknown): GovernanceProposalGuardianRelayTrustMinimizedSummary | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  return {
    policyEnabled: Boolean(row.policy_enabled),
    requiredRelayAttestations: Math.max(1, asNonNegativeInteger(row.required_relay_attestations, 1)),
    minDistinctRelayRegions: Math.max(1, asNonNegativeInteger(row.min_distinct_relay_regions, 1)),
    minDistinctRelayProviders: Math.max(1, asNonNegativeInteger(row.min_distinct_relay_providers, 1)),
    minDistinctRelayOperators: Math.max(1, asNonNegativeInteger(row.min_distinct_relay_operators, 1)),
    minDistinctRelayJurisdictions: Math.max(1, asNonNegativeInteger(row.min_distinct_relay_jurisdictions, 1)),
    minDistinctRelayTrustDomains: Math.max(1, asNonNegativeInteger(row.min_distinct_relay_trust_domains, 1)),
    maxDominantRelayRegionSharePercent: Math.max(1, asNullableNumber(row.max_dominant_relay_region_share_percent) ?? 80),
    maxDominantRelayProviderSharePercent: Math.max(1, asNullableNumber(row.max_dominant_relay_provider_share_percent) ?? 80),
    maxDominantRelayOperatorSharePercent: Math.max(1, asNullableNumber(row.max_dominant_relay_operator_share_percent) ?? 80),
    maxDominantRelayJurisdictionSharePercent: Math.max(1, asNullableNumber(row.max_dominant_relay_jurisdiction_share_percent) ?? 80),
    maxDominantRelayTrustDomainSharePercent: Math.max(1, asNullableNumber(row.max_dominant_relay_trust_domain_share_percent) ?? 80),
    externalApprovalCount: asNonNegativeInteger(row.external_approval_count),
    signersWithRelayQuorumCount: asNonNegativeInteger(row.signers_with_relay_quorum_count),
    signersWithChainProofCount: asNonNegativeInteger(row.signers_with_chain_proof_count),
    verifiedRelayCount: asNonNegativeInteger(row.verified_relay_count),
    distinctRegionsCount: asNonNegativeInteger(row.distinct_regions_count),
    distinctProvidersCount: asNonNegativeInteger(row.distinct_providers_count),
    distinctOperatorsCount: asNonNegativeInteger(row.distinct_operators_count),
    distinctJurisdictionsCount: asNonNegativeInteger(row.distinct_jurisdictions_count),
    distinctTrustDomainsCount: asNonNegativeInteger(row.distinct_trust_domains_count),
    dominantRegionSharePercent: asNullableNumber(row.dominant_region_share_percent),
    dominantProviderSharePercent: asNullableNumber(row.dominant_provider_share_percent),
    dominantOperatorSharePercent: asNullableNumber(row.dominant_operator_share_percent),
    dominantJurisdictionSharePercent: asNullableNumber(row.dominant_jurisdiction_share_percent),
    dominantTrustDomainSharePercent: asNullableNumber(row.dominant_trust_domain_share_percent),
    relayQuorumMet: Boolean(row.relay_quorum_met),
    chainProofMatchMet: Boolean(row.chain_proof_match_met),
    regionDiversityMet: Boolean(row.region_diversity_met),
    providerDiversityMet: Boolean(row.provider_diversity_met),
    operatorDiversityMet: Boolean(row.operator_diversity_met),
    jurisdictionDiversityMet: Boolean(row.jurisdiction_diversity_met),
    trustDomainDiversityMet: Boolean(row.trust_domain_diversity_met),
    concentrationLimitsMet: Boolean(row.concentration_limits_met),
    trustMinimizedQuorumMet: Boolean(row.trust_minimized_quorum_met),
  };
}

export function readGovernanceProposalGuardianRelayOperationsSummary(rows: unknown): GovernanceProposalGuardianRelayOperationsSummary | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  const policyKey = asString(row.policy_key, 'guardian_relay_default');

  return {
    policyKey,
    requireTrustMinimizedQuorum: Boolean(row.require_trust_minimized_quorum),
    requireRelayOpsReadiness: Boolean(row.require_relay_ops_readiness),
    maxOpenCriticalRelayAlerts: asNonNegativeInteger(row.max_open_critical_relay_alerts),
    relayAttestationSlaMinutes: Math.max(1, asNonNegativeInteger(row.relay_attestation_sla_minutes, 120)),
    externalApprovalCount: asNonNegativeInteger(row.external_approval_count),
    staleSignerCount: asNonNegativeInteger(row.stale_signer_count),
    openWarningAlertCount: asNonNegativeInteger(row.open_warning_alert_count),
    openCriticalAlertCount: asNonNegativeInteger(row.open_critical_alert_count),
    lastWorkerRunAt: asNullableString(row.last_worker_run_at),
    lastWorkerRunStatus: asRunStatus(row.last_worker_run_status),
    trustMinimizedQuorumMet: Boolean(row.trust_minimized_quorum_met),
    relayOpsReady: Boolean(row.relay_ops_ready),
  };
}

export function readGovernanceProposalGuardianRelayClientProofManifest(rows: unknown): GovernanceProposalGuardianRelayClientProofManifest | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = asRecord(rows[0]);
  if (!row) return null;

  const manifestVersion = asString(row.manifest_version);
  const manifestHash = asString(row.manifest_hash);
  const manifestPayload = asRecord(row.manifest_payload);

  if (!manifestVersion || !manifestHash || !manifestPayload) return null;

  const relayOperations = asRecord(manifestPayload.relay_operations);

  return {
    manifestVersion,
    manifestHash,
    manifestPayload,
    trustMinimizedQuorumMet: Boolean(row.trust_minimized_quorum_met),
    relayOpsReady: relayOperations ? Boolean(relayOperations.relay_ops_ready) : false,
  };
}

export function readGovernanceProposalGuardianRelayAlertBoardRows(rows: unknown): GovernanceProposalGuardianRelayAlertBoardRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      alertId: asString(entry.alert_id),
      alertKey: asString(entry.alert_key),
      severity: asAlertSeverity(entry.severity),
      alertScope: asString(entry.alert_scope, 'manual'),
      alertStatus: asAlertStatus(entry.alert_status),
      alertMessage: asString(entry.alert_message),
      openedAt: asNullableString(entry.opened_at),
      resolvedAt: asNullableString(entry.resolved_at),
    }))
    .filter((entry) => entry.alertId.length > 0 && entry.alertKey.length > 0 && entry.alertMessage.length > 0);
}

export function readGovernanceProposalGuardianRelayWorkerRunBoardRows(rows: unknown): GovernanceProposalGuardianRelayWorkerRunBoardRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      runId: asString(entry.run_id),
      runScope: asWorkerRunScope(entry.run_scope),
      runStatus: asRunStatus(entry.run_status),
      processedSignerCount: asNonNegativeInteger(entry.processed_signer_count),
      staleSignerCount: asNonNegativeInteger(entry.stale_signer_count),
      openAlertCount: asNonNegativeInteger(entry.open_alert_count),
      errorMessage: asNullableString(entry.error_message),
      observedAt: asNullableString(entry.observed_at),
    }))
    .filter((entry) => entry.runId.length > 0);
}

export function readGovernanceProposalGuardianRelayRecentClientManifestRows(rows: unknown): GovernanceProposalGuardianRelayRecentClientManifestRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => ({
      manifestId: asString(entry.manifest_id),
      capturedAt: asString(entry.captured_at),
      manifestVersion: asString(entry.manifest_version),
      manifestHash: asString(entry.manifest_hash),
      trustMinimizedQuorumMet: Boolean(entry.trust_minimized_quorum_met),
      relayQuorumMet: Boolean(entry.relay_quorum_met),
      chainProofMatchMet: Boolean(entry.chain_proof_match_met),
      manifestNotes: asNullableString(entry.manifest_notes),
    }))
    .filter((entry) => entry.manifestId.length > 0 && entry.capturedAt.length > 0);
}

export function isMissingGuardianRelayBackend(error: { code?: string | null; message?: string | null; details?: string | null } | null) {
  if (!error) return false;
  const message = `${error.code || ''} ${error.message || ''} ${error.details || ''}`.toLowerCase();
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || error.code === 'PGRST202'
    || message.includes('governance_guardian_relay_')
    || message.includes('governance_proposal_guardian_relay_attestations')
    || message.includes('governance_proposal_guardian_relay_summary')
    || message.includes('governance_proposal_guardian_relay_diversity_audit')
    || message.includes('governance_proposal_guardian_relay_attestation_audit_report')
    || message.includes('governance_proposal_guardian_relay_recent_audits')
    || message.includes('governance_guardian_relay_audit_reports')
    || message.includes('governance_proposal_guardian_relay_trust_minimized_summary')
    || message.includes('governance_proposal_guardian_relay_client_proof_manifest')
    || message.includes('governance_proposal_guardian_relay_recent_client_manifests')
    || message.includes('governance_proposal_guardian_relay_client_verification_package')
    || message.includes('capture_governance_proposal_guardian_relay_client_verification_')
    || message.includes('sign_governance_proposal_guardian_relay_client_verification_pac')
    || message.includes('governance_proposal_guardian_relay_recent_client_verification_p')
    || message.includes('governance_proposal_guardian_relay_client_verification_distribu')
    || message.includes('governance_proposal_guardian_relay_client_verification_signatur')
    || message.includes('governance_guardian_relay_worker_runs')
    || message.includes('governance_guardian_relay_alerts')
    || message.includes('governance_proposal_guardian_relay_operations_summary')
    || message.includes('governance_proposal_guardian_relay_alert_board')
    || message.includes('governance_proposal_guardian_relay_worker_run_board')
    || message.includes('governance_proposal_client_verification_manifests')
    || message.includes('governance_proposal_client_verification_packages')
    || message.includes('governance_proposal_client_verification_package_signatures')
    || message.includes('capture_governance_proposal_guardian_relay_client_manifest')
    || message.includes('capture_governance_guardian_relay_audit_report')
    || message.includes('record_governance_guardian_relay_worker_run')
    || message.includes('maybe_escalate_guardian_relay_critical_public_execution_page')
    || message.includes('sync_guardian_relay_attestation_sla_alerts')
    || message.includes('governance_proposal_meets_guardian_relay_distribution_gate')
    || message.includes('maybe_escalate_guardian_relay_proof_distribution_exec_page')
    || message.includes('open_governance_guardian_relay_alert')
    || message.includes('resolve_governance_guardian_relay_alert')
    || message.includes('set_governance_guardian_relay_ops_requirement')
    || message.includes('current_profile_can_manage_guardian_relays')
    || message.includes('register_governance_guardian_relay_node')
    || message.includes('record_governance_guardian_relay_attestation')
  );
}
