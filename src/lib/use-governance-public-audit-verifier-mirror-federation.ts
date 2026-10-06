import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { supabase, supabaseUntyped } from '@/integrations/supabase/untyped';
import {
  countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring,
  GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES,
  isMissingPublicAuditAutomationBackend,
  readGovernancePublicAuditExternalExecutionPageBoardRows,
  type GovernancePublicAuditExternalExecutionPageBoardRow,
} from '@/lib/governance-public-audit-automation';
import {
  readGovernancePublicAuditVerifierFederationExchangeAttestationRows,
  readGovernancePublicAuditVerifierFederationExchangeAttestationSummary,
  readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus,
  readGovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRows,
  readGovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary,
  isMissingPublicAuditVerifierBackend,
  readGovernancePublicAuditVerifierFederationPackage,
  readGovernancePublicAuditVerifierFederationPackageDistributionSummary,
  readGovernancePublicAuditVerifierFederationPackageHistoryRows,
  readGovernancePublicAuditVerifierFederationPackageSignatureRows,
  readGovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRows,
  readGovernancePublicAuditVerifierMirrorDiscoverySourceBoardRows,
  readGovernancePublicAuditVerifierMirrorDiscoverySummary,
  readGovernancePublicAuditVerifierMirrorFederationAlertBoardRows,
  readGovernancePublicAuditVerifierMirrorFederationOnboardingBoardRows,
  readGovernancePublicAuditVerifierMirrorFederationOperationsSummary,
  readGovernancePublicAuditVerifierMirrorFederationWorkerRunRows,
  readGovernancePublicAuditVerifierMirrorPolicyRatificationSummary,
  type GovernancePublicAuditVerifierFederationPackage,
  type GovernancePublicAuditVerifierFederationExchangeAttestationRow,
  type GovernancePublicAuditVerifierFederationExchangeAttestationSummary,
  type GovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus,
  type GovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRow,
  type GovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary,
  type GovernancePublicAuditVerifierFederationPackageDistributionSummary,
  type GovernancePublicAuditVerifierFederationPackageHistoryRow,
  type GovernancePublicAuditVerifierFederationPackageSignatureRow,
  type GovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRow,
  type GovernancePublicAuditVerifierMirrorDiscoverySourceBoardRow,
  type GovernancePublicAuditVerifierMirrorDiscoverySummary,
  type GovernancePublicAuditVerifierMirrorFederationAlertBoardRow,
  type GovernancePublicAuditVerifierMirrorFederationOnboardingBoardRow,
  type GovernancePublicAuditVerifierMirrorFederationOperationsSummary,
  type GovernancePublicAuditVerifierMirrorFederationWorkerRunRow,
  type GovernancePublicAuditVerifierMirrorPolicyRatificationSummary,
} from '@/lib/governance-public-audit-verifiers';
import { useGovernancePublicAuditVerifierMirrorFederationActions } from '@/lib/use-governance-public-audit-verifier-mirror-federation-actions';

export function useGovernancePublicAuditVerifierMirrorFederation(args: { latestBatchId: string | null }) {
  const [loadingFederationData, setLoadingFederationData] = useState(true);
  const [federationBackendUnavailable, setFederationBackendUnavailable] = useState(false);
  const [canManageMirrorFederation, setCanManageMirrorFederation] = useState(false);

  const [policyRatificationSummary, setPolicyRatificationSummary] =
    useState<GovernancePublicAuditVerifierMirrorPolicyRatificationSummary | null>(null);
  const [discoverySummary, setDiscoverySummary] = useState<GovernancePublicAuditVerifierMirrorDiscoverySummary | null>(null);
  const [federationOperationsSummary, setFederationOperationsSummary] =
    useState<GovernancePublicAuditVerifierMirrorFederationOperationsSummary | null>(null);
  const [discoverySources, setDiscoverySources] = useState<GovernancePublicAuditVerifierMirrorDiscoverySourceBoardRow[]>([]);
  const [discoveredCandidates, setDiscoveredCandidates] = useState<GovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRow[]>([]);
  const [federationOnboardingBoard, setFederationOnboardingBoard] =
    useState<GovernancePublicAuditVerifierMirrorFederationOnboardingBoardRow[]>([]);
  const [federationAlertBoard, setFederationAlertBoard] =
    useState<GovernancePublicAuditVerifierMirrorFederationAlertBoardRow[]>([]);
  const [federationWorkerRuns, setFederationWorkerRuns] =
    useState<GovernancePublicAuditVerifierMirrorFederationWorkerRunRow[]>([]);
  const [federationDistributionEscalationOpenPageCount, setFederationDistributionEscalationOpenPageCount] = useState(0);
  const [federationExchangeReceiptEscalationOpenPageCount, setFederationExchangeReceiptEscalationOpenPageCount] = useState(0);
  const [federationExchangeReceiptEscalationPages, setFederationExchangeReceiptEscalationPages] =
    useState<GovernancePublicAuditExternalExecutionPageBoardRow[]>([]);
  const [federationPackage, setFederationPackage] = useState<GovernancePublicAuditVerifierFederationPackage | null>(null);
  const [federationPackageDistributionSummary, setFederationPackageDistributionSummary] =
    useState<GovernancePublicAuditVerifierFederationPackageDistributionSummary | null>(null);
  const [federationPackageSignatures, setFederationPackageSignatures] =
    useState<GovernancePublicAuditVerifierFederationPackageSignatureRow[]>([]);
  const [federationPackageHistory, setFederationPackageHistory] =
    useState<GovernancePublicAuditVerifierFederationPackageHistoryRow[]>([]);
  const [federationExchangeAttestationSummary, setFederationExchangeAttestationSummary] =
    useState<GovernancePublicAuditVerifierFederationExchangeAttestationSummary | null>(null);
  const [federationExchangeAttestations, setFederationExchangeAttestations] =
    useState<GovernancePublicAuditVerifierFederationExchangeAttestationRow[]>([]);
  const [federationExchangeReceiptPolicySummary, setFederationExchangeReceiptPolicySummary] =
    useState<GovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary | null>(null);
  const [federationExchangeReceiptAutomationStatus, setFederationExchangeReceiptAutomationStatus] =
    useState<GovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus | null>(null);
  const [federationExchangeReceiptAutomationRuns, setFederationExchangeReceiptAutomationRuns] =
    useState<GovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRow[]>([]);
  const [federationExchangeReceiptEscalationHistory, setFederationExchangeReceiptEscalationHistory] =
    useState<GovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRow[]>([]);
  const [federationExchangeReceiptPolicyEvents, setFederationExchangeReceiptPolicyEvents] =
    useState<GovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRow[]>([]);

  const loadFederationData = useCallback(async () => {
    setLoadingFederationData(true);

    const [
      permissionResponse,
      ratificationSummaryResponse,
      discoverySummaryResponse,
      discoverySourcesResponse,
      discoveredCandidatesResponse,
      operationsSummaryResponse,
      onboardingBoardResponse,
      alertBoardResponse,
      packageWithDigestResponse,
      packageDistributionSummaryResponse,
      packageSignatureBoardResponse,
      packageHistoryResponse,
      exchangeAttestationSummaryResponse,
      exchangeAttestationBoardResponse,
      exchangeReceiptPolicySummaryResponse,
      exchangeReceiptAutomationStatusResponse,
      exchangeReceiptAutomationRunHistoryResponse,
      exchangeReceiptEscalationHistoryResponse,
      exchangeReceiptPolicyEventsResponse,
      workerRunsResponse,
      executionPageBoardResponse,
    ] = await Promise.all([
      supabase.rpc('current_profile_can_manage_public_audit_verifiers'),
      supabase.rpc('governance_public_audit_verifier_mirror_policy_ratification_sum', {
        requested_policy_key: 'default',
      }),
      supabase.rpc('governance_public_audit_verifier_mirror_discovery_summary', {
        requested_batch_id: args.latestBatchId,
        requested_lookback_hours: 24,
      }),
      supabase.rpc('governance_public_audit_verifier_mirror_discovery_source_board', {
        max_entries: 20,
      }),
      supabase.rpc('governance_public_audit_verifier_mirror_discovered_candidate_bo', {
        status_filter: null,
        max_candidates: 80,
      }),
      supabase.rpc('governance_public_audit_verifier_mirror_federation_operations_s', {
        requested_policy_key: 'default',
        requested_lookback_hours: 24,
        requested_alert_sla_hours: 12,
      }),
      supabase.rpc('governance_public_audit_verifier_mirror_federation_onboarding_b', {
        status_filter: null,
        max_entries: 80,
      }),
      supabase.rpc('governance_public_audit_verifier_mirror_federation_alert_board', {
        status_filter: null,
        max_entries: 80,
      }),
      supabase.rpc('governance_public_audit_verifier_federation_pkg_digest_text', {
        target_batch_id: args.latestBatchId,
        requested_policy_key: 'default',
      }),
      supabase.rpc('governance_public_audit_verifier_federation_package_distributio', {
        target_batch_id: args.latestBatchId,
        requested_policy_key: 'default',
      }),
      supabase.rpc('governance_public_audit_verifier_federation_package_signature_b', {
        target_batch_id: args.latestBatchId,
        max_entries: 80,
      }),
      supabase.rpc('governance_public_audit_verifier_federation_dist_pkg_history', {
        target_batch_id: args.latestBatchId,
        max_entries: 40,
      }),
      supabaseUntyped.rpc('governance_public_audit_verifier_federation_exchange_summary', {
        target_batch_id: args.latestBatchId,
        requested_lookback_hours: 336,
      }),
      supabaseUntyped.rpc('governance_public_audit_verifier_federation_exchange_board', {
        target_batch_id: args.latestBatchId,
        target_package_id: null,
        max_entries: 80,
      }),
      supabaseUntyped.rpc('gpav_fed_exchange_receipt_policy_summary', {
        requested_policy_key: 'default',
      }),
      supabaseUntyped.rpc('gpav_fed_exchange_receipt_automation_status'),
      supabaseUntyped.rpc('gpav_fed_exchange_receipt_automation_run_history', {
        requested_lookback_hours: 336,
        max_runs: 40,
      }),
      supabaseUntyped.rpc('governance_public_audit_external_execution_page_history', {
        requested_page_key_substring: 'verifier_federation_exchange_receipt',
        requested_lookback_hours: 336,
        max_pages: 120,
      }),
      supabaseUntyped.rpc('gpav_fed_exchange_receipt_policy_event_history', {
        requested_policy_key: 'default',
        requested_lookback_hours: 336,
        max_events: 120,
      }),
      supabaseUntyped
        .from('governance_public_audit_verifier_mirror_federation_worker_runs')
        .select(
          'id, run_scope, run_status, discovered_request_count, approved_request_count, onboarded_request_count, open_alert_count, observed_at',
        )
        .order('observed_at', { ascending: false })
        .limit(12),
      supabase.rpc('governance_public_audit_external_execution_page_board', {
        requested_batch_id: args.latestBatchId,
        max_pages: GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES,
      }),
    ]);

    const sharedError = permissionResponse.error
      || ratificationSummaryResponse.error
      || discoverySummaryResponse.error
      || discoverySourcesResponse.error
      || discoveredCandidatesResponse.error
      || operationsSummaryResponse.error
      || onboardingBoardResponse.error
      || alertBoardResponse.error
      || packageWithDigestResponse.error
      || packageDistributionSummaryResponse.error
      || packageSignatureBoardResponse.error
      || packageHistoryResponse.error
      || exchangeAttestationSummaryResponse.error
      || exchangeAttestationBoardResponse.error
      || exchangeReceiptPolicySummaryResponse.error
      || exchangeReceiptPolicyEventsResponse.error
      || exchangeReceiptAutomationRunHistoryResponse.error
      || exchangeReceiptEscalationHistoryResponse.error
      || workerRunsResponse.error;

    if (isMissingPublicAuditVerifierBackend(sharedError)) {
      setFederationBackendUnavailable(true);
      setFederationDistributionEscalationOpenPageCount(0);
      setFederationExchangeReceiptEscalationOpenPageCount(0);
      setFederationExchangeReceiptEscalationPages([]);
      setLoadingFederationData(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load verifier mirror federation data:', {
        permissionError: permissionResponse.error,
        ratificationSummaryError: ratificationSummaryResponse.error,
        discoverySummaryError: discoverySummaryResponse.error,
        discoverySourcesError: discoverySourcesResponse.error,
        discoveredCandidatesError: discoveredCandidatesResponse.error,
        operationsSummaryError: operationsSummaryResponse.error,
        onboardingBoardError: onboardingBoardResponse.error,
        alertBoardError: alertBoardResponse.error,
        packageError: packageWithDigestResponse.error,
        packageDistributionSummaryError: packageDistributionSummaryResponse.error,
        packageSignatureBoardError: packageSignatureBoardResponse.error,
        packageHistoryError: packageHistoryResponse.error,
        exchangeAttestationSummaryError: exchangeAttestationSummaryResponse.error,
        exchangeAttestationBoardError: exchangeAttestationBoardResponse.error,
        exchangeReceiptPolicySummaryError: exchangeReceiptPolicySummaryResponse.error,
        exchangeReceiptPolicyEventsError: exchangeReceiptPolicyEventsResponse.error,
        exchangeReceiptAutomationRunHistoryError: exchangeReceiptAutomationRunHistoryResponse.error,
        exchangeReceiptEscalationHistoryError: exchangeReceiptEscalationHistoryResponse.error,
        workerRunsError: workerRunsResponse.error,
      });
      toast.error('Could not load verifier mirror federation data.');
      setFederationDistributionEscalationOpenPageCount(0);
      setFederationExchangeReceiptEscalationOpenPageCount(0);
      setFederationExchangeReceiptEscalationPages([]);
      setLoadingFederationData(false);
      return;
    }

    setCanManageMirrorFederation(Boolean(permissionResponse.data));
    setPolicyRatificationSummary(readGovernancePublicAuditVerifierMirrorPolicyRatificationSummary(ratificationSummaryResponse.data));
    setDiscoverySummary(readGovernancePublicAuditVerifierMirrorDiscoverySummary(discoverySummaryResponse.data));
    setDiscoverySources(readGovernancePublicAuditVerifierMirrorDiscoverySourceBoardRows(discoverySourcesResponse.data));
    setDiscoveredCandidates(readGovernancePublicAuditVerifierMirrorDiscoveredCandidateBoardRows(discoveredCandidatesResponse.data));
    setFederationOperationsSummary(readGovernancePublicAuditVerifierMirrorFederationOperationsSummary(operationsSummaryResponse.data));
    setFederationOnboardingBoard(readGovernancePublicAuditVerifierMirrorFederationOnboardingBoardRows(onboardingBoardResponse.data));
    setFederationAlertBoard(readGovernancePublicAuditVerifierMirrorFederationAlertBoardRows(alertBoardResponse.data));
    setFederationPackage(readGovernancePublicAuditVerifierFederationPackage(packageWithDigestResponse.data));
    setFederationPackageDistributionSummary(
      readGovernancePublicAuditVerifierFederationPackageDistributionSummary(packageDistributionSummaryResponse.data),
    );
    setFederationPackageSignatures(readGovernancePublicAuditVerifierFederationPackageSignatureRows(packageSignatureBoardResponse.data));
    setFederationPackageHistory(readGovernancePublicAuditVerifierFederationPackageHistoryRows(packageHistoryResponse.data));
    setFederationExchangeAttestationSummary(
      readGovernancePublicAuditVerifierFederationExchangeAttestationSummary(exchangeAttestationSummaryResponse.data),
    );
    setFederationExchangeAttestations(
      readGovernancePublicAuditVerifierFederationExchangeAttestationRows(exchangeAttestationBoardResponse.data),
    );
    setFederationExchangeReceiptPolicySummary(
      readGovernancePublicAuditVerifierFederationExchangeReceiptPolicySummary(exchangeReceiptPolicySummaryResponse.data),
    );
    if (!exchangeReceiptAutomationStatusResponse.error) {
      setFederationExchangeReceiptAutomationStatus(
        readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationStatus(exchangeReceiptAutomationStatusResponse.data),
      );
    } else if (isMissingPublicAuditVerifierBackend(exchangeReceiptAutomationStatusResponse.error)) {
      setFederationExchangeReceiptAutomationStatus(null);
    } else {
      console.warn(
        'Could not load federation exchange receipt automation status; continuing without telemetry:',
        exchangeReceiptAutomationStatusResponse.error,
      );
      setFederationExchangeReceiptAutomationStatus(null);
    }
    if (!exchangeReceiptAutomationRunHistoryResponse.error) {
      setFederationExchangeReceiptAutomationRuns(
        readGovernancePublicAuditVerifierFederationExchangeReceiptAutomationRunRows(exchangeReceiptAutomationRunHistoryResponse.data),
      );
    } else if (isMissingPublicAuditVerifierBackend(exchangeReceiptAutomationRunHistoryResponse.error)) {
      setFederationExchangeReceiptAutomationRuns([]);
    } else {
      console.warn(
        'Could not load federation exchange receipt automation run history; continuing without run ledger:',
        exchangeReceiptAutomationRunHistoryResponse.error,
      );
      setFederationExchangeReceiptAutomationRuns([]);
    }
    if (!exchangeReceiptEscalationHistoryResponse.error) {
      setFederationExchangeReceiptEscalationHistory(
        readGovernancePublicAuditVerifierFederationExchangeReceiptEscalationHistoryRows(exchangeReceiptEscalationHistoryResponse.data),
      );
    } else if (isMissingPublicAuditAutomationBackend(exchangeReceiptEscalationHistoryResponse.error)) {
      setFederationExchangeReceiptEscalationHistory([]);
    } else {
      console.warn(
        'Could not load federation exchange receipt escalation history; continuing without history analytics:',
        exchangeReceiptEscalationHistoryResponse.error,
      );
      setFederationExchangeReceiptEscalationHistory([]);
    }
    setFederationExchangeReceiptPolicyEvents(
      readGovernancePublicAuditVerifierFederationExchangeReceiptPolicyEventRows(exchangeReceiptPolicyEventsResponse.data),
    );
    setFederationWorkerRuns(readGovernancePublicAuditVerifierMirrorFederationWorkerRunRows(workerRunsResponse.data));

    if (!executionPageBoardResponse.error) {
      const executionPages = readGovernancePublicAuditExternalExecutionPageBoardRows(executionPageBoardResponse.data);
      setFederationDistributionEscalationOpenPageCount(
        countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring(
          executionPages,
          'verifier_federation_distribution',
        ),
      );
      setFederationExchangeReceiptEscalationOpenPageCount(
        countOpenGovernancePublicAuditExternalExecutionPagesForPageKeySubstring(
          executionPages,
          'verifier_federation_exchange_receipt',
        ),
      );
      setFederationExchangeReceiptEscalationPages(
        executionPages.filter((page) => page.pageKey.includes('verifier_federation_exchange_receipt')),
      );
    } else if (isMissingPublicAuditAutomationBackend(executionPageBoardResponse.error)) {
      setFederationDistributionEscalationOpenPageCount(0);
      setFederationExchangeReceiptEscalationOpenPageCount(0);
      setFederationExchangeReceiptEscalationPages([]);
    } else {
      console.warn('Could not load external execution page board for federation escalation summary:', executionPageBoardResponse.error);
      setFederationDistributionEscalationOpenPageCount(0);
      setFederationExchangeReceiptEscalationOpenPageCount(0);
      setFederationExchangeReceiptEscalationPages([]);
    }

    setFederationBackendUnavailable(false);
    setLoadingFederationData(false);
  }, [args.latestBatchId]);

  useEffect(() => {
    void loadFederationData();
  }, [loadFederationData]);

  const actions = useGovernancePublicAuditVerifierMirrorFederationActions({
    latestBatchId: args.latestBatchId,
    canManageMirrorFederation,
    federationBackendUnavailable,
    loadFederationData,
  });

  return {
    loadingFederationData,
    federationBackendUnavailable,
    canManageMirrorFederation,
    policyRatificationSummary,
    discoverySummary,
    federationOperationsSummary,
    discoverySources,
    discoveredCandidates,
    federationOnboardingBoard,
    federationAlertBoard,
    federationWorkerRuns,
    federationDistributionEscalationOpenPageCount,
    federationExchangeReceiptEscalationOpenPageCount,
    federationExchangeReceiptEscalationPages,
    federationPackage,
    federationPackageDistributionSummary,
    federationPackageSignatures,
    federationPackageHistory,
    federationExchangeAttestationSummary,
    federationExchangeAttestations,
    federationExchangeReceiptPolicySummary,
    federationExchangeReceiptAutomationStatus,
    federationExchangeReceiptAutomationRuns,
    federationExchangeReceiptEscalationHistory,
    federationExchangeReceiptPolicyEvents,
    loadFederationData,
    ...actions,
  };
}
