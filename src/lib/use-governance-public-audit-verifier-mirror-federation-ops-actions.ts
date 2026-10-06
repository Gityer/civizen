import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { asIntegerOrNull } from '@/lib/governance-rpc';

interface UseGovernancePublicAuditVerifierMirrorFederationOpsActionsArgs {
  canManageMirrorFederation: boolean;
  federationBackendUnavailable: boolean;
  loadFederationData: () => Promise<void>;
}

export function useGovernancePublicAuditVerifierMirrorFederationOpsActions({
  canManageMirrorFederation,
  federationBackendUnavailable,
  loadFederationData,
}: UseGovernancePublicAuditVerifierMirrorFederationOpsActionsArgs) {
  const [savingFederationOpsRequirement, setSavingFederationOpsRequirement] = useState(false);
  const [registeringFederationOperator, setRegisteringFederationOperator] = useState(false);
  const [submittingOnboardingRequest, setSubmittingOnboardingRequest] = useState(false);
  const [reviewingOnboardingRequest, setReviewingOnboardingRequest] = useState(false);
  const [onboardingFederationRequest, setOnboardingFederationRequest] = useState(false);
  const [recordingFederationWorkerRun, setRecordingFederationWorkerRun] = useState(false);
  const [openingFederationAlert, setOpeningFederationAlert] = useState(false);
  const [resolvingFederationAlert, setResolvingFederationAlert] = useState(false);

  const saveFederationOpsRequirement = useCallback(async (draft: {
    requireFederationOpsReadiness: boolean;
    maxOpenCriticalAlerts: string;
    minOnboardedOperators: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    setSavingFederationOpsRequirement(true);
    const maxOpen = asIntegerOrNull(draft.maxOpenCriticalAlerts);
    const minOnboarded = asIntegerOrNull(draft.minOnboardedOperators);
    const { error } = await supabase.rpc('set_governance_public_audit_verifier_mirror_federation_ops_requ', {
      requested_policy_key: 'default',
      requested_require_federation_ops_readiness: draft.requireFederationOpsReadiness,
      max_open_critical_alerts: maxOpen ?? undefined,
      min_onboarded_operators: minOnboarded ?? undefined,
    });

    if (error) {
      console.error('Failed to save federation operations requirement:', error);
      toast.error('Could not save federation operations requirement.');
      setSavingFederationOpsRequirement(false);
      return;
    }

    toast.success('Federation operations requirement saved.');
    setSavingFederationOpsRequirement(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const registerFederationOperator = useCallback(async (draft: {
    operatorKey: string;
    operatorLabel: string;
    contactEndpoint: string;
    jurisdictionCountryCode: string;
    trustDomain: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const operatorKey = draft.operatorKey.trim();
    if (!operatorKey) {
      toast.error('Operator key is required.');
      return;
    }

    setRegisteringFederationOperator(true);
    const { error } = await supabase.rpc('register_governance_public_audit_verifier_mirror_federation_ope', {
      operator_key: operatorKey,
      operator_label: draft.operatorLabel.trim() || null,
      contact_endpoint: draft.contactEndpoint.trim() || null,
      jurisdiction_country_code: draft.jurisdictionCountryCode.trim().toUpperCase() || '',
      trust_domain: draft.trustDomain.trim().toLowerCase() || 'public',
      metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to register federation operator:', error);
      toast.error('Could not save federation operator.');
      setRegisteringFederationOperator(false);
      return;
    }

    toast.success('Federation operator saved.');
    setRegisteringFederationOperator(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const submitFederationOnboardingRequest = useCallback(async (draft: {
    operatorKey: string;
    requestedMirrorKey: string;
    requestedMirrorLabel: string;
    requestedEndpointUrl: string;
    requestedMirrorType: string;
    requestedRegionCode: string;
    requestedJurisdictionCountryCode: string;
    requestedTrustDomain: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const operatorKey = draft.operatorKey.trim();
    const requestedMirrorKey = draft.requestedMirrorKey.trim();
    const requestedEndpointUrl = draft.requestedEndpointUrl.trim();
    if (!operatorKey || !requestedMirrorKey || !requestedEndpointUrl) {
      toast.error('Operator key, mirror key, and endpoint URL are required.');
      return;
    }

    setSubmittingOnboardingRequest(true);
    const { error } = await supabase.rpc('submit_governance_public_audit_verifier_mirror_federation_onboa', {
      operator_key: operatorKey,
      requested_mirror_key: requestedMirrorKey,
      requested_mirror_label: draft.requestedMirrorLabel.trim() || null,
      requested_endpoint_url: requestedEndpointUrl,
      requested_mirror_type: draft.requestedMirrorType.trim() || 'https_gateway',
      requested_region_code: draft.requestedRegionCode.trim().toUpperCase() || 'GLOBAL',
      requested_jurisdiction_country_code: draft.requestedJurisdictionCountryCode.trim().toUpperCase() || '',
      requested_trust_domain: draft.requestedTrustDomain.trim().toLowerCase() || 'public',
      metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to submit federation onboarding request:', error);
      toast.error('Could not submit onboarding request.');
      setSubmittingOnboardingRequest(false);
      return;
    }

    toast.success('Federation onboarding request submitted.');
    setSubmittingOnboardingRequest(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const reviewFederationOnboardingRequest = useCallback(async (draft: {
    requestId: string;
    reviewDecision: 'approve' | 'reject';
    reviewNotes: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    if (!draft.requestId) {
      toast.error('Select an onboarding request first.');
      return;
    }

    setReviewingOnboardingRequest(true);
    const { error } = await supabase.rpc('review_governance_public_audit_verifier_mirror_federation_onboa', {
      target_request_id: draft.requestId,
      review_decision: draft.reviewDecision,
      requested_review_notes: draft.reviewNotes.trim() || null,
    });

    if (error) {
      console.error('Failed to review federation onboarding request:', error);
      toast.error('Could not review onboarding request.');
      setReviewingOnboardingRequest(false);
      return;
    }

    toast.success('Federation onboarding request reviewed.');
    setReviewingOnboardingRequest(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const onboardFederationRequest = useCallback(async (draft: {
    requestId: string;
    activateMirror: boolean;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    if (!draft.requestId) {
      toast.error('Select an approved onboarding request first.');
      return;
    }

    setOnboardingFederationRequest(true);
    const { error } = await supabase.rpc('onboard_governance_public_audit_verifier_mirror_federation_requ', {
      target_request_id: draft.requestId,
      activate_mirror: draft.activateMirror,
      requested_metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to onboard federation request:', error);
      toast.error('Could not onboard request.');
      setOnboardingFederationRequest(false);
      return;
    }

    toast.success('Federation onboarding request onboarded.');
    setOnboardingFederationRequest(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const recordFederationWorkerRun = useCallback(async (draft: {
    runScope: 'onboarding_sweep' | 'operator_health_audit' | 'diversity_audit' | 'package_distribution_verification' | 'manual';
    runStatus: 'ok' | 'degraded' | 'failed';
    discoveredRequestCount: string;
    approvedRequestCount: string;
    onboardedRequestCount: string;
    openAlertCount: string;
    errorMessage: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    setRecordingFederationWorkerRun(true);
    const { error } = await supabase.rpc('record_governance_public_audit_verifier_mirror_federation_worke', {
      run_scope: draft.runScope,
      run_status: draft.runStatus,
      discovered_request_count: asIntegerOrNull(draft.discoveredRequestCount) ?? undefined,
      approved_request_count: asIntegerOrNull(draft.approvedRequestCount) ?? undefined,
      onboarded_request_count: asIntegerOrNull(draft.onboardedRequestCount) ?? undefined,
      open_alert_count: asIntegerOrNull(draft.openAlertCount) ?? undefined,
      error_message: draft.errorMessage.trim() || null,
      run_payload: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to record federation worker run:', error);
      toast.error('Could not record federation worker run.');
      setRecordingFederationWorkerRun(false);
      return;
    }

    toast.success('Federation worker run recorded.');
    setRecordingFederationWorkerRun(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const openFederationAlert = useCallback(async (draft: {
    alertKey: string;
    severity: 'info' | 'warning' | 'critical';
    alertScope: string;
    alertMessage: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const alertKey = draft.alertKey.trim();
    const alertMessage = draft.alertMessage.trim();
    if (!alertKey || !alertMessage) {
      toast.error('Alert key and alert message are required.');
      return;
    }

    setOpeningFederationAlert(true);
    const { error } = await supabase.rpc('open_governance_public_audit_verifier_mirror_federation_alert', {
      alert_key: alertKey,
      severity: draft.severity,
      alert_scope: draft.alertScope.trim() || 'manual',
      alert_message: alertMessage,
      metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to open federation alert:', error);
      toast.error('Could not open federation alert.');
      setOpeningFederationAlert(false);
      return;
    }

    toast.success('Federation alert opened.');
    setOpeningFederationAlert(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const resolveFederationAlert = useCallback(async (draft: {
    alertId: string;
    resolutionNotes: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    if (!draft.alertId) {
      toast.error('Select an alert first.');
      return;
    }

    setResolvingFederationAlert(true);
    const { error } = await supabase.rpc('resolve_governance_public_audit_verifier_mirror_federation_aler', {
      target_alert_id: draft.alertId,
      resolution_notes: draft.resolutionNotes.trim() || null,
    });

    if (error) {
      console.error('Failed to resolve federation alert:', error);
      toast.error('Could not resolve federation alert.');
      setResolvingFederationAlert(false);
      return;
    }

    toast.success('Federation alert resolved.');
    setResolvingFederationAlert(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  return {
    savingFederationOpsRequirement,
    registeringFederationOperator,
    submittingOnboardingRequest,
    reviewingOnboardingRequest,
    onboardingFederationRequest,
    recordingFederationWorkerRun,
    openingFederationAlert,
    resolvingFederationAlert,
    saveFederationOpsRequirement,
    registerFederationOperator,
    submitFederationOnboardingRequest,
    reviewFederationOnboardingRequest,
    onboardFederationRequest,
    recordFederationWorkerRun,
    openFederationAlert,
    resolveFederationAlert,
  };
}
