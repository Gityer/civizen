import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import {
  readGovernanceProposalGuardianRelayClientVerificationDistributionSummary,
  readGovernanceProposalGuardianRelayClientVerificationPackage,
  readGovernanceProposalGuardianRelayClientVerificationSignatureRows,
  readGovernanceProposalGuardianRelayRecentClientVerificationPackageRows,
} from '@/lib/governance-guardian-relay-distribution';
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
  type GovernanceProposalGuardianRelayAlertBoardRow,
  type GovernanceProposalGuardianRelayAttestationAuditRow,
  type GovernanceProposalGuardianRelayClientProofManifest,
  type GovernanceProposalGuardianRelayClientVerificationDistributionSummary,
  type GovernanceProposalGuardianRelayClientVerificationPackage,
  type GovernanceProposalGuardianRelayClientVerificationSignatureRow,
  type GovernanceProposalGuardianRelayDiversityAudit,
  type GovernanceProposalGuardianRelayOperationsSummary,
  type GovernanceProposalGuardianRelayRecentClientManifestRow,
  type GovernanceProposalGuardianRelayRecentClientVerificationPackageRow,
  type GovernanceProposalGuardianRelayRecentAuditRow,
  type GovernanceProposalGuardianRelaySummary,
  type GovernanceProposalGuardianRelayTrustMinimizedSummary,
  type GovernanceProposalGuardianRelayWorkerRunBoardRow,
  type GuardianRelayAttestationRow,
  type GuardianRelayNodeRow,
  type GuardianRelayPolicyRow,
} from '@/lib/governance-guardian-relays';
import { useGovernanceGuardianRelayActions } from '@/lib/use-governance-guardian-relay-actions';

export function useGovernanceGuardianRelays(args: { proposalId: string }) {
  const [loadingRelayData, setLoadingRelayData] = useState(true);
  const [relayBackendUnavailable, setRelayBackendUnavailable] = useState(false);
  const [canManageGuardianRelays, setCanManageGuardianRelays] = useState(false);

  const [relayPolicy, setRelayPolicy] = useState<GuardianRelayPolicyRow | null>(null);
  const [relayNodes, setRelayNodes] = useState<GuardianRelayNodeRow[]>([]);
  const [relayAttestations, setRelayAttestations] = useState<GuardianRelayAttestationRow[]>([]);
  const [relaySummary, setRelaySummary] = useState<GovernanceProposalGuardianRelaySummary | null>(null);
  const [relayTrustMinimizedSummary, setRelayTrustMinimizedSummary] = useState<GovernanceProposalGuardianRelayTrustMinimizedSummary | null>(null);
  const [relayOperationsSummary, setRelayOperationsSummary] = useState<GovernanceProposalGuardianRelayOperationsSummary | null>(null);
  const [relayClientProofManifest, setRelayClientProofManifest] = useState<GovernanceProposalGuardianRelayClientProofManifest | null>(null);
  const [relayDiversityAudit, setRelayDiversityAudit] = useState<GovernanceProposalGuardianRelayDiversityAudit | null>(null);
  const [relayAttestationAuditRows, setRelayAttestationAuditRows] = useState<GovernanceProposalGuardianRelayAttestationAuditRow[]>([]);
  const [relayRecentAuditReports, setRelayRecentAuditReports] = useState<GovernanceProposalGuardianRelayRecentAuditRow[]>([]);
  const [relayRecentClientManifests, setRelayRecentClientManifests] = useState<GovernanceProposalGuardianRelayRecentClientManifestRow[]>([]);
  const [relayClientVerificationPackage, setRelayClientVerificationPackage] = useState<GovernanceProposalGuardianRelayClientVerificationPackage | null>(null);
  const [relayRecentClientVerificationPackages, setRelayRecentClientVerificationPackages] = useState<GovernanceProposalGuardianRelayRecentClientVerificationPackageRow[]>([]);
  const [relayClientVerificationDistributionSummary, setRelayClientVerificationDistributionSummary] = useState<GovernanceProposalGuardianRelayClientVerificationDistributionSummary | null>(null);
  const [relayClientVerificationSignatures, setRelayClientVerificationSignatures] = useState<GovernanceProposalGuardianRelayClientVerificationSignatureRow[]>([]);
  const [relayAlertBoardRows, setRelayAlertBoardRows] = useState<GovernanceProposalGuardianRelayAlertBoardRow[]>([]);
  const [relayWorkerRunBoardRows, setRelayWorkerRunBoardRows] = useState<GovernanceProposalGuardianRelayWorkerRunBoardRow[]>([]);

  const loadRelayData = useCallback(async () => {
    setLoadingRelayData(true);

    const [
      policyResponse,
      nodesResponse,
      summaryResponse,
      attestationResponse,
      permissionResponse,
      diversityResponse,
      attestationAuditResponse,
      recentAuditsResponse,
      trustMinimizedSummaryResponse,
      operationsSummaryResponse,
      clientProofManifestResponse,
      recentClientManifestsResponse,
      clientVerificationPackageResponse,
      recentClientVerificationPackagesResponse,
      clientVerificationDistributionSummaryResponse,
      clientVerificationSignatureBoardResponse,
      alertBoardResponse,
      workerRunBoardResponse,
    ] = await Promise.all([
      supabase
        .from('governance_guardian_relay_policies')
        .select('*')
        .eq('policy_key', 'guardian_relay_default')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('governance_guardian_relay_nodes')
        .select('*')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase.rpc('governance_proposal_guardian_relay_summary', {
        target_proposal_id: args.proposalId,
      }),
      supabase
        .from('governance_proposal_guardian_relay_attestations')
        .select('*')
        .eq('proposal_id', args.proposalId)
        .order('verified_at', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.rpc('current_profile_can_manage_guardian_relays'),
      supabase.rpc('governance_proposal_guardian_relay_diversity_audit', {
        target_proposal_id: args.proposalId,
      }),
      supabase.rpc('governance_proposal_guardian_relay_attestation_audit_report', {
        target_proposal_id: args.proposalId,
        requested_lookback_hours: 168,
      }),
      supabase.rpc('governance_proposal_guardian_relay_recent_audits', {
        target_proposal_id: args.proposalId,
        max_reports: 12,
      }),
      supabase.rpc('governance_proposal_guardian_relay_trust_minimized_summary', {
        target_proposal_id: args.proposalId,
      }),
      supabase.rpc('governance_proposal_guardian_relay_operations_summary', {
        target_proposal_id: args.proposalId,
        requested_policy_key: 'guardian_relay_default',
        requested_attestation_sla_minutes: null,
      }),
      supabase.rpc('governance_proposal_guardian_relay_client_proof_manifest', {
        target_proposal_id: args.proposalId,
      }),
      supabase.rpc('governance_proposal_guardian_relay_recent_client_manifests', {
        target_proposal_id: args.proposalId,
        max_manifests: 12,
      }),
      supabase.rpc('governance_proposal_guardian_relay_client_verification_package', {
        target_proposal_id: args.proposalId,
      }),
      supabase.rpc('governance_proposal_guardian_relay_recent_client_verification_p', {
        target_proposal_id: args.proposalId,
        max_packages: 12,
      }),
      supabase.rpc('governance_proposal_guardian_relay_client_verification_distribu', {
        target_proposal_id: args.proposalId,
      }),
      supabase.rpc('governance_proposal_guardian_relay_client_verification_signatur', {
        target_proposal_id: args.proposalId,
        max_entries: 40,
      }),
      supabase.rpc('governance_proposal_guardian_relay_alert_board', {
        target_proposal_id: args.proposalId,
        status_filter: null,
        max_entries: 80,
      }),
      supabase.rpc('governance_proposal_guardian_relay_worker_run_board', {
        target_proposal_id: args.proposalId,
        max_entries: 80,
      }),
    ]);

    const sharedError = policyResponse.error
      || nodesResponse.error
      || summaryResponse.error
      || attestationResponse.error
      || permissionResponse.error
      || diversityResponse.error
      || attestationAuditResponse.error
      || recentAuditsResponse.error
      || trustMinimizedSummaryResponse.error
      || operationsSummaryResponse.error
      || clientProofManifestResponse.error
      || recentClientManifestsResponse.error
      || clientVerificationPackageResponse.error
      || recentClientVerificationPackagesResponse.error
      || clientVerificationDistributionSummaryResponse.error
      || clientVerificationSignatureBoardResponse.error
      || alertBoardResponse.error
      || workerRunBoardResponse.error;

    if (isMissingGuardianRelayBackend(sharedError)) {
      setRelayBackendUnavailable(true);
      setLoadingRelayData(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load guardian relay data:', {
        policyError: policyResponse.error,
        nodesError: nodesResponse.error,
        summaryError: summaryResponse.error,
        attestationError: attestationResponse.error,
        permissionError: permissionResponse.error,
        diversityError: diversityResponse.error,
        attestationAuditError: attestationAuditResponse.error,
        recentAuditsError: recentAuditsResponse.error,
        trustMinimizedSummaryError: trustMinimizedSummaryResponse.error,
        operationsSummaryError: operationsSummaryResponse.error,
        clientProofManifestError: clientProofManifestResponse.error,
        recentClientManifestsError: recentClientManifestsResponse.error,
        clientVerificationPackageError: clientVerificationPackageResponse.error,
        recentClientVerificationPackagesError: recentClientVerificationPackagesResponse.error,
        clientVerificationDistributionSummaryError: clientVerificationDistributionSummaryResponse.error,
        clientVerificationSignatureBoardError: clientVerificationSignatureBoardResponse.error,
        alertBoardError: alertBoardResponse.error,
        workerRunBoardError: workerRunBoardResponse.error,
      });
      toast.error('Could not load guardian relay data.');
      setLoadingRelayData(false);
      return;
    }

    setRelayPolicy(policyResponse.data ?? null);
    setRelayNodes(nodesResponse.data ?? []);
    setRelayAttestations(attestationResponse.data ?? []);
    setRelaySummary(readGovernanceProposalGuardianRelaySummary(summaryResponse.data));
    setRelayTrustMinimizedSummary(readGovernanceProposalGuardianRelayTrustMinimizedSummary(trustMinimizedSummaryResponse.data));
    setRelayOperationsSummary(readGovernanceProposalGuardianRelayOperationsSummary(operationsSummaryResponse.data));
    setRelayClientProofManifest(readGovernanceProposalGuardianRelayClientProofManifest(clientProofManifestResponse.data));
    setRelayDiversityAudit(readGovernanceProposalGuardianRelayDiversityAudit(diversityResponse.data));
    setRelayAttestationAuditRows(readGovernanceProposalGuardianRelayAttestationAuditRows(attestationAuditResponse.data));
    setRelayRecentAuditReports(readGovernanceProposalGuardianRelayRecentAuditRows(recentAuditsResponse.data));
    setRelayRecentClientManifests(readGovernanceProposalGuardianRelayRecentClientManifestRows(recentClientManifestsResponse.data));
    setRelayClientVerificationPackage(readGovernanceProposalGuardianRelayClientVerificationPackage(clientVerificationPackageResponse.data));
    setRelayRecentClientVerificationPackages(readGovernanceProposalGuardianRelayRecentClientVerificationPackageRows(recentClientVerificationPackagesResponse.data));
    setRelayClientVerificationDistributionSummary(
      readGovernanceProposalGuardianRelayClientVerificationDistributionSummary(clientVerificationDistributionSummaryResponse.data),
    );
    setRelayClientVerificationSignatures(
      readGovernanceProposalGuardianRelayClientVerificationSignatureRows(clientVerificationSignatureBoardResponse.data),
    );
    setRelayAlertBoardRows(readGovernanceProposalGuardianRelayAlertBoardRows(alertBoardResponse.data));
    setRelayWorkerRunBoardRows(readGovernanceProposalGuardianRelayWorkerRunBoardRows(workerRunBoardResponse.data));
    setCanManageGuardianRelays(Boolean(permissionResponse.data));
    setRelayBackendUnavailable(false);
    setLoadingRelayData(false);
  }, [args.proposalId]);

  useEffect(() => {
    void loadRelayData();
  }, [loadRelayData]);

  const actions = useGovernanceGuardianRelayActions({
    proposalId: args.proposalId,
    canManageGuardianRelays,
    relayBackendUnavailable,
    loadRelayData,
  });

  return {
    loadingRelayData,
    relayBackendUnavailable,
    canManageGuardianRelays,
    relayPolicy,
    relayNodes,
    relayAttestations,
    relaySummary,
    relayTrustMinimizedSummary,
    relayOperationsSummary,
    relayClientProofManifest,
    relayDiversityAudit,
    relayAttestationAuditRows,
    relayRecentAuditReports,
    relayRecentClientManifests,
    relayClientVerificationPackage,
    relayRecentClientVerificationPackages,
    relayClientVerificationDistributionSummary,
    relayClientVerificationSignatures,
    relayAlertBoardRows,
    relayWorkerRunBoardRows,
    loadRelayData,
    ...actions,
  };
}
