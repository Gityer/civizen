import { describe, expect, it } from 'vitest';

import {
  isMissingGuardianRelayBackend,
  readGovernanceProposalGuardianRelayAlertBoardRows,
  readGovernanceProposalGuardianRelayAttestationAuditRows,
  readGovernanceProposalGuardianRelayClientProofManifest,
  readGovernanceProposalGuardianRelayDiversityAudit,
  readGovernanceProposalGuardianRelayOperationsSummary,
  readGovernanceProposalGuardianRelayRecentClientManifestRows,
  readGovernanceProposalGuardianRelayRecentAuditRows,
  readGovernanceProposalGuardianRelaySummary,
  readGovernanceProposalGuardianRelayTrustMinimizedSummary,
  readGovernanceProposalGuardianRelayWorkerRunBoardRows,
} from '@/lib/governance-guardian-relays';

describe('governance-guardian-relays helpers', () => {
  it('parses relay summary rows', () => {
    const summary = readGovernanceProposalGuardianRelaySummary([
      {
        active_relay_count: 3,
        chain_proof_match_met: true,
        external_approval_count: 2,
        policy_enabled: true,
        relay_mismatch_count: 0,
        relay_quorum_met: true,
        relay_unreachable_count: 0,
        relay_verified_count: 4,
        require_chain_proof_match: true,
        required_relay_attestations: 2,
        signers_with_chain_proof_count: 2,
        signers_with_relay_quorum_count: 2,
      },
    ]);

    expect(summary).toEqual({
      policyEnabled: true,
      requiredRelayAttestations: 2,
      requireChainProofMatch: true,
      activeRelayCount: 3,
      relayVerifiedCount: 4,
      relayMismatchCount: 0,
      relayUnreachableCount: 0,
      signersWithRelayQuorumCount: 2,
      signersWithChainProofCount: 2,
      externalApprovalCount: 2,
      relayQuorumMet: true,
      chainProofMatchMet: true,
    });
  });

  it('parses relay diversity audit rows', () => {
    const parsed = readGovernanceProposalGuardianRelayDiversityAudit([
      {
        policy_enabled: true,
        required_relay_attestations: 2,
        min_distinct_relay_regions: 2,
        min_distinct_relay_providers: 2,
        min_distinct_relay_operators: 2,
        verified_relay_count: 5,
        distinct_regions_count: 3,
        distinct_providers_count: 2,
        distinct_operators_count: 2,
        dominant_region_share_percent: 40,
        dominant_provider_share_percent: 60,
        dominant_operator_share_percent: 40,
        region_diversity_met: true,
        provider_diversity_met: true,
        operator_diversity_met: true,
        overall_diversity_met: true,
      },
    ]);

    expect(parsed).toEqual({
      policyEnabled: true,
      requiredRelayAttestations: 2,
      minDistinctRelayRegions: 2,
      minDistinctRelayProviders: 2,
      minDistinctRelayOperators: 2,
      verifiedRelayCount: 5,
      distinctRegionsCount: 3,
      distinctProvidersCount: 2,
      distinctOperatorsCount: 2,
      dominantRegionSharePercent: 40,
      dominantProviderSharePercent: 60,
      dominantOperatorSharePercent: 40,
      regionDiversityMet: true,
      providerDiversityMet: true,
      operatorDiversityMet: true,
      overallDiversityMet: true,
    });
  });

  it('parses relay attestation audit rows', () => {
    const rows = readGovernanceProposalGuardianRelayAttestationAuditRows([
      {
        relay_id: 'relay-1',
        relay_key: 'relay-key-1',
        relay_label: 'Relay 1',
        relay_region_code: 'US-WEST',
        relay_infrastructure_provider: 'ProviderA',
        relay_operator_label: 'OperatorA',
        relay_trust_domain: 'public',
        total_attestation_count: 10,
        verified_count: 8,
        mismatch_count: 1,
        unreachable_count: 1,
        last_attested_at: '2026-04-20T12:00:00.000Z',
        recent_attestation_count: 5,
        recent_failure_count: 1,
        recent_health_score: 80,
        recent_health_status: 'degraded',
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      relayId: 'relay-1',
      relayKey: 'relay-key-1',
      relayRegionCode: 'US-WEST',
      relayInfrastructureProvider: 'ProviderA',
      recentHealthStatus: 'degraded',
      recentHealthScore: 80,
    });
  });

  it('parses recent formal audit snapshots', () => {
    const rows = readGovernanceProposalGuardianRelayRecentAuditRows([
      {
        report_id: 'report-1',
        captured_at: '2026-04-20T12:00:00.000Z',
        overall_diversity_met: true,
        relay_quorum_met: true,
        chain_proof_match_met: false,
        verified_relay_count: 6,
        distinct_regions_count: 3,
        distinct_providers_count: 2,
        distinct_operators_count: 2,
        audit_notes: 'Weekly relay audit',
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      reportId: 'report-1',
      capturedAt: '2026-04-20T12:00:00.000Z',
      overallDiversityMet: true,
      relayQuorumMet: true,
      chainProofMatchMet: false,
      verifiedRelayCount: 6,
      distinctRegionsCount: 3,
      distinctProvidersCount: 2,
      distinctOperatorsCount: 2,
      auditNotes: 'Weekly relay audit',
    });
  });

  it('parses trust-minimized relay quorum summary rows', () => {
    const summary = readGovernanceProposalGuardianRelayTrustMinimizedSummary([
      {
        policy_enabled: true,
        required_relay_attestations: 2,
        min_distinct_relay_regions: 2,
        min_distinct_relay_providers: 2,
        min_distinct_relay_operators: 2,
        min_distinct_relay_jurisdictions: 2,
        min_distinct_relay_trust_domains: 1,
        max_dominant_relay_region_share_percent: '80',
        max_dominant_relay_provider_share_percent: '75',
        max_dominant_relay_operator_share_percent: '70',
        max_dominant_relay_jurisdiction_share_percent: '80',
        max_dominant_relay_trust_domain_share_percent: '90',
        external_approval_count: 3,
        signers_with_relay_quorum_count: 3,
        signers_with_chain_proof_count: 3,
        verified_relay_count: 6,
        distinct_regions_count: 3,
        distinct_providers_count: 3,
        distinct_operators_count: 3,
        distinct_jurisdictions_count: 2,
        distinct_trust_domains_count: 1,
        dominant_region_share_percent: 40,
        dominant_provider_share_percent: 30,
        dominant_operator_share_percent: 40,
        dominant_jurisdiction_share_percent: '50',
        dominant_trust_domain_share_percent: '80',
        relay_quorum_met: true,
        chain_proof_match_met: true,
        region_diversity_met: true,
        provider_diversity_met: true,
        operator_diversity_met: true,
        jurisdiction_diversity_met: true,
        trust_domain_diversity_met: true,
        concentration_limits_met: true,
        trust_minimized_quorum_met: true,
      },
    ]);

    expect(summary).toMatchObject({
      policyEnabled: true,
      minDistinctRelayJurisdictions: 2,
      dominantJurisdictionSharePercent: 50,
      concentrationLimitsMet: true,
      trustMinimizedQuorumMet: true,
    });
  });

  it('parses client proof manifest payload rows', () => {
    const manifest = readGovernanceProposalGuardianRelayClientProofManifest([
      {
        manifest_version: 'guardian_relay_client_proof_v1',
        manifest_hash: 'abc123',
        manifest_payload: {
          generated_at: '2026-04-21T01:00:00.000Z',
          relay_operations: {
            relay_ops_ready: true,
          },
        },
        trust_minimized_quorum_met: false,
      },
    ]);

    expect(manifest).toEqual({
      manifestVersion: 'guardian_relay_client_proof_v1',
      manifestHash: 'abc123',
      manifestPayload: {
        generated_at: '2026-04-21T01:00:00.000Z',
        relay_operations: {
          relay_ops_ready: true,
        },
      },
      trustMinimizedQuorumMet: false,
      relayOpsReady: true,
    });
  });

  it('parses recent client manifest rows', () => {
    const rows = readGovernanceProposalGuardianRelayRecentClientManifestRows([
      {
        manifest_id: 'manifest-1',
        captured_at: '2026-04-21T01:10:00.000Z',
        manifest_version: 'guardian_relay_client_proof_v1',
        manifest_hash: 'hash-1',
        trust_minimized_quorum_met: true,
        relay_quorum_met: true,
        chain_proof_match_met: false,
        manifest_notes: 'Nightly capture',
      },
    ]);

    expect(rows).toEqual([
      {
        manifestId: 'manifest-1',
        capturedAt: '2026-04-21T01:10:00.000Z',
        manifestVersion: 'guardian_relay_client_proof_v1',
        manifestHash: 'hash-1',
        trustMinimizedQuorumMet: true,
        relayQuorumMet: true,
        chainProofMatchMet: false,
        manifestNotes: 'Nightly capture',
      },
    ]);
  });

  it('returns an empty list for non-array inputs or malformed manifest rows', () => {
    expect(readGovernanceProposalGuardianRelayRecentClientManifestRows(null)).toEqual([]);
    expect(readGovernanceProposalGuardianRelayRecentClientManifestRows({})).toEqual([]);
    expect(
      readGovernanceProposalGuardianRelayRecentClientManifestRows([
        {
          manifest_id: '',
          captured_at: '2026-04-21T01:10:00.000Z',
          manifest_version: 'v1',
          manifest_hash: 'h',
          trust_minimized_quorum_met: false,
          relay_quorum_met: false,
          chain_proof_match_met: false,
          manifest_notes: null,
        },
      ]),
    ).toEqual([]);
  });

  it('parses relay operations summary, alerts, and worker-run rows', () => {
    const operationsSummary = readGovernanceProposalGuardianRelayOperationsSummary([
      {
        policy_key: 'guardian_relay_default',
        require_trust_minimized_quorum: true,
        require_relay_ops_readiness: true,
        max_open_critical_relay_alerts: 1,
        relay_attestation_sla_minutes: 120,
        external_approval_count: 3,
        stale_signer_count: 1,
        open_warning_alert_count: 2,
        open_critical_alert_count: 1,
        last_worker_run_at: '2026-04-21T02:00:00.000Z',
        last_worker_run_status: 'degraded',
        trust_minimized_quorum_met: true,
        relay_ops_ready: false,
      },
    ]);
    const alerts = readGovernanceProposalGuardianRelayAlertBoardRows([
      {
        alert_id: 'alert-1',
        alert_key: 'stale_attestation',
        severity: 'critical',
        alert_scope: 'attestation_sweep',
        alert_status: 'open',
        alert_message: 'Signer relay attestations are stale',
        opened_at: '2026-04-21T02:05:00.000Z',
        resolved_at: null,
      },
    ]);
    const workerRuns = readGovernanceProposalGuardianRelayWorkerRunBoardRows([
      {
        run_id: 'run-1',
        run_scope: 'attestation_sweep',
        run_status: 'ok',
        processed_signer_count: 3,
        stale_signer_count: 0,
        open_alert_count: 1,
        error_message: null,
        observed_at: '2026-04-21T02:10:00.000Z',
      },
    ]);

    expect(operationsSummary).toEqual({
      policyKey: 'guardian_relay_default',
      requireTrustMinimizedQuorum: true,
      requireRelayOpsReadiness: true,
      maxOpenCriticalRelayAlerts: 1,
      relayAttestationSlaMinutes: 120,
      externalApprovalCount: 3,
      staleSignerCount: 1,
      openWarningAlertCount: 2,
      openCriticalAlertCount: 1,
      lastWorkerRunAt: '2026-04-21T02:00:00.000Z',
      lastWorkerRunStatus: 'degraded',
      trustMinimizedQuorumMet: true,
      relayOpsReady: false,
    });
    expect(alerts).toEqual([
      {
        alertId: 'alert-1',
        alertKey: 'stale_attestation',
        severity: 'critical',
        alertScope: 'attestation_sweep',
        alertStatus: 'open',
        alertMessage: 'Signer relay attestations are stale',
        openedAt: '2026-04-21T02:05:00.000Z',
        resolvedAt: null,
      },
    ]);
    expect(workerRuns).toEqual([
      {
        runId: 'run-1',
        runScope: 'attestation_sweep',
        runStatus: 'ok',
        processedSignerCount: 3,
        staleSignerCount: 0,
        openAlertCount: 1,
        errorMessage: null,
        observedAt: '2026-04-21T02:10:00.000Z',
      },
    ]);
  });

  it('detects missing guardian relay backend errors', () => {
    expect(
      isMissingGuardianRelayBackend({
        code: 'PGRST202',
        message: 'Function governance_proposal_guardian_relay_client_proof_manifest does not exist',
      }),
    ).toBe(true);

    expect(
      isMissingGuardianRelayBackend({
        code: 'PGRST202',
        message: 'Could not find the function public.governance_proposal_guardian_relay_client_verification_signatur',
        details: null,
      }),
    ).toBe(true);

    expect(
      isMissingGuardianRelayBackend({
        code: 'PGRST202',
        message: 'Could not find the function public.maybe_escalate_guardian_relay_proof_distribution_exec_page',
        details: null,
      }),
    ).toBe(true);

    expect(
      isMissingGuardianRelayBackend({
        code: '42P01',
        message: 'relation "governance_guardian_relay_policies" does not exist',
        details: null,
      }),
    ).toBe(true);

    expect(
      isMissingGuardianRelayBackend({
        code: 'PGRST205',
        message: 'Could not find the table public.governance_proposal_guardian_relay_attestations in the schema cache',
        details: null,
      }),
    ).toBe(true);

    expect(
      isMissingGuardianRelayBackend({
        code: null,
        message: 'error loading governance_proposal_guardian_relay_summary',
        details: null,
      }),
    ).toBe(true);

    expect(isMissingGuardianRelayBackend(null)).toBe(false);

    expect(
      isMissingGuardianRelayBackend({
        code: '22023',
        message: 'random failure',
      }),
    ).toBe(false);
  });
});
