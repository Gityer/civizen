import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import {
  GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES,
  isMissingPublicAuditAutomationBackend,
  readGovernancePublicAuditAnchorExecutionJobBoardRows,
  readGovernancePublicAuditExternalExecutionPageBoardRows,
  readGovernancePublicAuditExternalExecutionAutomationStatus,
  readGovernancePublicAuditExternalExecutionPagingSummary,
  readGovernancePublicAuditExternalExecutionPolicySummary,
  readGovernancePublicAuditOperationsSlaSummary,
  type GovernancePublicAuditAnchorAdapterRow,
  type GovernancePublicAuditAnchorExecutionJobBoardRow,
  type GovernancePublicAuditExternalExecutionPageBoardRow,
  type GovernancePublicAuditExternalExecutionAutomationStatus,
  type GovernancePublicAuditExternalExecutionPagingSummary,
  type GovernancePublicAuditExternalExecutionPolicySummary,
  type GovernancePublicAuditImmutableAnchorRow,
  type GovernancePublicAuditOperationsSlaSummary,
  type GovernancePublicAuditVerifierJobRow,
} from '@/lib/governance-public-audit-automation';
import { useGovernancePublicAuditAutomationActions } from '@/lib/use-governance-public-audit-automation-actions';

export function useGovernancePublicAuditAutomation(args: { latestBatchId: string | null }) {
  const [loadingAutomationData, setLoadingAutomationData] = useState(true);
  const [automationBackendUnavailable, setAutomationBackendUnavailable] = useState(false);
  const [canManageAutomation, setCanManageAutomation] = useState(false);

  const [anchorAdapters, setAnchorAdapters] = useState<GovernancePublicAuditAnchorAdapterRow[]>([]);
  const [immutableAnchors, setImmutableAnchors] = useState<GovernancePublicAuditImmutableAnchorRow[]>([]);
  const [anchorExecutionJobs, setAnchorExecutionJobs] = useState<GovernancePublicAuditAnchorExecutionJobBoardRow[]>([]);
  const [verifierJobs, setVerifierJobs] = useState<GovernancePublicAuditVerifierJobRow[]>([]);
  const [operationsSlaSummary, setOperationsSlaSummary] = useState<GovernancePublicAuditOperationsSlaSummary | null>(null);
  const [externalExecutionPolicy, setExternalExecutionPolicy] = useState<GovernancePublicAuditExternalExecutionPolicySummary | null>(null);
  const [externalExecutionPagingSummary, setExternalExecutionPagingSummary] = useState<GovernancePublicAuditExternalExecutionPagingSummary | null>(null);
  const [externalExecutionPages, setExternalExecutionPages] = useState<GovernancePublicAuditExternalExecutionPageBoardRow[]>([]);
  const [externalExecutionAutomationStatus, setExternalExecutionAutomationStatus] = useState<GovernancePublicAuditExternalExecutionAutomationStatus | null>(null);

  const loadAutomationData = useCallback(async () => {
    setLoadingAutomationData(true);

    const [
      adapterResponse,
      anchorResponse,
      verifierJobsResponse,
      permissionResponse,
      slaSummaryResponse,
      anchorExecutionBoardResponse,
      policySummaryResponse,
      pagingSummaryResponse,
      pageBoardResponse,
      automationStatusResponse,
    ] = await Promise.all([
      supabase
        .from('governance_public_audit_anchor_adapters')
        .select('*')
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: true }),
      args.latestBatchId
        ? supabase
            .from('governance_public_audit_immutable_anchors')
            .select('*')
            .eq('batch_id', args.latestBatchId)
            .order('anchored_at', { ascending: false })
            .order('created_at', { ascending: false })
        : supabase
            .from('governance_public_audit_immutable_anchors')
            .select('*')
            .order('anchored_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(50),
      args.latestBatchId
        ? supabase
            .from('governance_public_audit_verifier_jobs')
            .select('*')
            .eq('batch_id', args.latestBatchId)
            .order('scheduled_at', { ascending: false })
            .order('created_at', { ascending: false })
        : supabase
            .from('governance_public_audit_verifier_jobs')
            .select('*')
            .order('scheduled_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(100),
      supabase.rpc('current_profile_can_manage_public_audit_verifiers'),
      supabase.rpc('governance_public_audit_operations_sla_summary', {
        requested_batch_id: args.latestBatchId,
        requested_pending_sla_hours: 4,
        requested_lookback_hours: 24,
      }),
      supabase.rpc('governance_public_audit_anchor_execution_job_board', {
        requested_batch_id: args.latestBatchId,
        max_jobs: 120,
      }),
      supabase.rpc('governance_public_audit_external_execution_policy_summary', {
        requested_policy_key: 'default',
      }),
      supabase.rpc('governance_public_audit_external_execution_paging_summary', {
        requested_batch_id: args.latestBatchId,
        auto_open_pages: false,
        requested_lookback_hours: 24,
      }),
      supabase.rpc('governance_public_audit_external_execution_page_board', {
        requested_batch_id: args.latestBatchId,
        max_pages: GOVERNANCE_PUBLIC_AUDIT_EXTERNAL_EXECUTION_PAGE_BOARD_MAX_PAGES,
      }),
      supabase.rpc('governance_public_audit_external_execution_automation_status'),
    ]);

    const sharedError = adapterResponse.error
      || anchorResponse.error
      || verifierJobsResponse.error
      || permissionResponse.error
      || slaSummaryResponse.error
      || anchorExecutionBoardResponse.error
      || policySummaryResponse.error
      || pagingSummaryResponse.error
      || pageBoardResponse.error
      || automationStatusResponse.error;

    if (isMissingPublicAuditAutomationBackend(sharedError)) {
      setAutomationBackendUnavailable(true);
      setLoadingAutomationData(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load public audit automation data:', {
        adapterError: adapterResponse.error,
        anchorError: anchorResponse.error,
        verifierJobsError: verifierJobsResponse.error,
        permissionError: permissionResponse.error,
        slaSummaryError: slaSummaryResponse.error,
        anchorExecutionBoardError: anchorExecutionBoardResponse.error,
        policySummaryError: policySummaryResponse.error,
        pagingSummaryError: pagingSummaryResponse.error,
        pageBoardError: pageBoardResponse.error,
        automationStatusError: automationStatusResponse.error,
      });
      toast.error('Could not load immutable anchoring automation data.');
      setLoadingAutomationData(false);
      return;
    }

    setAnchorAdapters(adapterResponse.data ?? []);
    setImmutableAnchors(anchorResponse.data ?? []);
    setVerifierJobs(verifierJobsResponse.data ?? []);
    setOperationsSlaSummary(readGovernancePublicAuditOperationsSlaSummary(slaSummaryResponse.data));
    setAnchorExecutionJobs(readGovernancePublicAuditAnchorExecutionJobBoardRows(anchorExecutionBoardResponse.data));
    setExternalExecutionPolicy(readGovernancePublicAuditExternalExecutionPolicySummary(policySummaryResponse.data));
    setExternalExecutionPagingSummary(readGovernancePublicAuditExternalExecutionPagingSummary(pagingSummaryResponse.data));
    setExternalExecutionPages(readGovernancePublicAuditExternalExecutionPageBoardRows(pageBoardResponse.data));
    setExternalExecutionAutomationStatus(readGovernancePublicAuditExternalExecutionAutomationStatus(automationStatusResponse.data));
    setCanManageAutomation(Boolean(permissionResponse.data));
    setAutomationBackendUnavailable(false);
    setLoadingAutomationData(false);
  }, [args.latestBatchId]);

  useEffect(() => {
    void loadAutomationData();
  }, [loadAutomationData]);

  const actions = useGovernancePublicAuditAutomationActions({
    latestBatchId: args.latestBatchId,
    canManageAutomation,
    automationBackendUnavailable,
    loadAutomationData,
  });

  return {
    loadingAutomationData,
    automationBackendUnavailable,
    canManageAutomation,
    anchorAdapters,
    immutableAnchors,
    anchorExecutionJobs,
    verifierJobs,
    operationsSlaSummary,
    externalExecutionPolicy,
    externalExecutionPagingSummary,
    externalExecutionPages,
    externalExecutionAutomationStatus,
    loadAutomationData,
    ...actions,
  };
}
