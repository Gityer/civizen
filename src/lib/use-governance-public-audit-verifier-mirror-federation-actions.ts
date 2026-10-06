import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { supabase, supabaseUntyped } from '@/integrations/supabase/untyped';
import { asIntegerOrNull, asNumericOrNull } from '@/lib/governance-rpc';
import { useGovernancePublicAuditVerifierFederationDistributionActions } from '@/lib/use-governance-public-audit-verifier-federation-distribution-actions';
import { useGovernancePublicAuditVerifierMirrorFederationOpsActions } from '@/lib/use-governance-public-audit-verifier-mirror-federation-ops-actions';

interface UseGovernancePublicAuditVerifierMirrorFederationActionsArgs {
  latestBatchId: string | null;
  canManageMirrorFederation: boolean;
  federationBackendUnavailable: boolean;
  loadFederationData: () => Promise<void>;
}

export function useGovernancePublicAuditVerifierMirrorFederationActions({
  latestBatchId,
  canManageMirrorFederation,
  federationBackendUnavailable,
  loadFederationData,
}: UseGovernancePublicAuditVerifierMirrorFederationActionsArgs) {
  const [registeringDiscoverySource, setRegisteringDiscoverySource] = useState(false);
  const [recordingDiscoveryRun, setRecordingDiscoveryRun] = useState(false);
  const [upsertingDiscoveredCandidate, setUpsertingDiscoveredCandidate] = useState(false);
  const [promotingDiscoveredCandidate, setPromotingDiscoveredCandidate] = useState(false);
  const [savingPolicyRatification, setSavingPolicyRatification] = useState(false);
  const [runningFederationExchangeReceiptAutomationCheck, setRunningFederationExchangeReceiptAutomationCheck] = useState(false);
  const [acknowledgingFederationExchangeReceiptEscalationPageId, setAcknowledgingFederationExchangeReceiptEscalationPageId] = useState<string | null>(null);
  const [resolvingFederationExchangeReceiptEscalationPageId, setResolvingFederationExchangeReceiptEscalationPageId] = useState<string | null>(null);

  const opsActions = useGovernancePublicAuditVerifierMirrorFederationOpsActions({
    canManageMirrorFederation,
    federationBackendUnavailable,
    loadFederationData,
  });
  const distributionActions = useGovernancePublicAuditVerifierFederationDistributionActions({
    latestBatchId,
    canManageMirrorFederation,
    federationBackendUnavailable,
    loadFederationData,
  });

  const registerDiscoverySource = useCallback(async (draft: {
    sourceKey: string;
    sourceLabel: string;
    endpointUrl: string;
    discoveryScope: string;
    trustTier: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const sourceKey = draft.sourceKey.trim();
    const endpointUrl = draft.endpointUrl.trim();
    if (!sourceKey || !endpointUrl) {
      toast.error('Source key and endpoint URL are required.');
      return;
    }

    setRegisteringDiscoverySource(true);
    const { error } = await supabase.rpc('register_governance_public_audit_verifier_mirror_discovery_sour', {
      source_key: sourceKey,
      source_label: draft.sourceLabel.trim() || null,
      endpoint_url: endpointUrl,
      discovery_scope: draft.discoveryScope.trim() || 'public_registry',
      trust_tier: draft.trustTier.trim() || 'observer',
      metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to register verifier mirror discovery source:', error);
      toast.error('Could not save discovery source.');
      setRegisteringDiscoverySource(false);
      return;
    }

    toast.success('Discovery source saved.');
    setRegisteringDiscoverySource(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const recordDiscoveryRun = useCallback(async (draft: {
    sourceId: string;
    runStatus: 'ok' | 'degraded' | 'failed';
    discoveredCount: string;
    acceptedCandidateCount: string;
    staleCandidateCount: string;
    errorMessage: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    if (!draft.sourceId) {
      toast.error('Select a discovery source first.');
      return;
    }

    setRecordingDiscoveryRun(true);
    const discovered = asIntegerOrNull(draft.discoveredCount);
    const accepted = asIntegerOrNull(draft.acceptedCandidateCount);
    const stale = asIntegerOrNull(draft.staleCandidateCount);
    const { error } = await supabase.rpc('record_governance_public_audit_verifier_mirror_discovery_run', {
      target_source_id: draft.sourceId,
      target_batch_id: latestBatchId ?? undefined,
      run_status: draft.runStatus,
      discovered_count: discovered ?? undefined,
      accepted_candidate_count: accepted ?? undefined,
      stale_candidate_count: stale ?? undefined,
      error_message: draft.errorMessage.trim() || null,
      run_payload: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to record verifier mirror discovery run:', error);
      toast.error('Could not save discovery run.');
      setRecordingDiscoveryRun(false);
      return;
    }

    toast.success('Discovery run recorded.');
    setRecordingDiscoveryRun(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, latestBatchId, loadFederationData]);

  const upsertDiscoveredCandidate = useCallback(async (draft: {
    sourceId: string;
    candidateKey: string;
    candidateLabel: string;
    endpointUrl: string;
    mirrorType: string;
    regionCode: string;
    jurisdictionCountryCode: string;
    operatorLabel: string;
    trustDomain: string;
    discoveryConfidence: string;
    candidateStatus: 'new' | 'reviewed' | 'promoted' | 'rejected' | 'inactive';
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const candidateKey = draft.candidateKey.trim();
    const endpointUrl = draft.endpointUrl.trim();
    if (!draft.sourceId || !candidateKey || !endpointUrl) {
      toast.error('Source, candidate key, and endpoint URL are required.');
      return;
    }

    setUpsertingDiscoveredCandidate(true);
    const confidence = asNumericOrNull(draft.discoveryConfidence);
    const { error } = await supabase.rpc('upsert_governance_public_audit_verifier_mirror_discovered_candi', {
      target_source_id: draft.sourceId,
      candidate_key: candidateKey,
      candidate_label: draft.candidateLabel.trim() || null,
      endpoint_url: endpointUrl,
      mirror_type: draft.mirrorType.trim() || 'https_gateway',
      region_code: draft.regionCode.trim().toUpperCase() || 'GLOBAL',
      jurisdiction_country_code: draft.jurisdictionCountryCode.trim().toUpperCase() || '',
      operator_label: draft.operatorLabel.trim() || 'unspecified',
      trust_domain: draft.trustDomain.trim().toLowerCase() || 'public',
      discovery_confidence: confidence ?? undefined,
      candidate_status: draft.candidateStatus,
      run_id: null,
      metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to upsert verifier mirror discovered candidate:', error);
      toast.error('Could not save discovered candidate.');
      setUpsertingDiscoveredCandidate(false);
      return;
    }

    toast.success('Discovered candidate saved.');
    setUpsertingDiscoveredCandidate(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const promoteDiscoveredCandidate = useCallback(async (candidateId: string) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    if (!candidateId) {
      toast.error('Select a discovered candidate first.');
      return;
    }

    setPromotingDiscoveredCandidate(true);
    const { error } = await supabase.rpc('promote_governance_public_audit_verifier_mirror_discovered_cand', {
      target_candidate_id: candidateId,
      metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to promote verifier mirror discovered candidate:', error);
      toast.error('Could not promote discovered candidate.');
      setPromotingDiscoveredCandidate(false);
      return;
    }

    toast.success('Discovered candidate promoted to mirror registry.');
    setPromotingDiscoveredCandidate(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const recordPolicyRatification = useCallback(async (draft: {
    policyKey: string;
    signerKey: string;
    ratificationDecision: 'approve' | 'reject';
    ratificationSignature: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const signerKey = draft.signerKey.trim();
    const ratificationSignature = draft.ratificationSignature.trim();
    if (!signerKey || !ratificationSignature) {
      toast.error('Signer key and ratification signature are required.');
      return;
    }

    setSavingPolicyRatification(true);
    const { error } = await supabase.rpc('record_governance_public_audit_verifier_mirror_policy_ratificat', {
      requested_policy_key: draft.policyKey.trim() || 'default',
      signer_key: signerKey,
      ratification_decision: draft.ratificationDecision,
      ratification_signature: ratificationSignature,
      ratification_payload: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to save verifier mirror policy ratification:', error);
      toast.error('Could not save policy ratification.');
      setSavingPolicyRatification(false);
      return;
    }

    toast.success('Policy ratification saved.');
    setSavingPolicyRatification(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const runFederationExchangeReceiptAutomationCheck = useCallback(async (draft: {
    lookbackHours: string;
    runMessage: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    setRunningFederationExchangeReceiptAutomationCheck(true);

    const lookbackParsed = asIntegerOrNull(draft.lookbackHours);
    const { error } = await supabaseUntyped.rpc('run_gpav_fed_exchange_receipt_automation_check', {
      requested_lookback_hours: lookbackParsed ?? null,
      trigger_source: 'steward_manual',
      run_message: draft.runMessage.trim() || null,
      metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      const detail = [error.message, error.details, error.hint].filter(Boolean).join(' ');
      console.error('Failed to run federation exchange receipt automation check:', error);
      toast.error(detail || 'Could not run receipt automation check.');
      setRunningFederationExchangeReceiptAutomationCheck(false);
      return;
    }

    toast.success('Receipt automation check completed.');
    setRunningFederationExchangeReceiptAutomationCheck(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const acknowledgeFederationExchangeReceiptEscalationPage = useCallback(async (pageId: string) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    if (!pageId) return;
    setAcknowledgingFederationExchangeReceiptEscalationPageId(pageId);
    const notes = window.prompt('Optional acknowledgement notes for this federation exchange receipt escalation page:', '');
    const { error } = await supabaseUntyped.rpc('acknowledge_governance_public_audit_external_execution_page', {
      target_page_id: pageId,
      acknowledgement_notes: notes?.trim() || null,
    });
    if (error) {
      console.error('Failed to acknowledge federation exchange receipt escalation page:', error);
      toast.error('Could not acknowledge receipt escalation page.');
      setAcknowledgingFederationExchangeReceiptEscalationPageId(null);
      return;
    }
    toast.success('Receipt escalation page acknowledged.');
    setAcknowledgingFederationExchangeReceiptEscalationPageId(null);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const resolveFederationExchangeReceiptEscalationPage = useCallback(async (pageId: string) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    if (!pageId) return;
    setResolvingFederationExchangeReceiptEscalationPageId(pageId);
    const notes = window.prompt('Optional resolution notes for this federation exchange receipt escalation page:', '');
    const { error } = await supabase.rpc('resolve_governance_public_audit_external_execution_page', {
      target_page_id: pageId,
      resolution_notes: notes?.trim() || null,
    });
    if (error) {
      console.error('Failed to resolve federation exchange receipt escalation page:', error);
      toast.error('Could not resolve receipt escalation page.');
      setResolvingFederationExchangeReceiptEscalationPageId(null);
      return;
    }
    toast.success('Receipt escalation page resolved.');
    setResolvingFederationExchangeReceiptEscalationPageId(null);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  return {
    registeringDiscoverySource,
    recordingDiscoveryRun,
    upsertingDiscoveredCandidate,
    promotingDiscoveredCandidate,
    savingPolicyRatification,
    runningFederationExchangeReceiptAutomationCheck,
    acknowledgingFederationExchangeReceiptEscalationPageId,
    resolvingFederationExchangeReceiptEscalationPageId,
    capturingFederationPackage: distributionActions.capturingFederationPackage,
    signingFederationPackage: distributionActions.signingFederationPackage,
    verifyingFederationDistribution: distributionActions.verifyingFederationDistribution,
    recordingFederationExchangeAttestation: distributionActions.recordingFederationExchangeAttestation,
    verifyingFederationExchangeReceipt: distributionActions.verifyingFederationExchangeReceipt,
    savingFederationExchangeReceiptPolicy: distributionActions.savingFederationExchangeReceiptPolicy,
    rollingBackFederationExchangeReceiptPolicyEventId: distributionActions.rollingBackFederationExchangeReceiptPolicyEventId,
    savingFederationOpsRequirement: opsActions.savingFederationOpsRequirement,
    registeringFederationOperator: opsActions.registeringFederationOperator,
    submittingOnboardingRequest: opsActions.submittingOnboardingRequest,
    reviewingOnboardingRequest: opsActions.reviewingOnboardingRequest,
    onboardingFederationRequest: opsActions.onboardingFederationRequest,
    recordingFederationWorkerRun: opsActions.recordingFederationWorkerRun,
    openingFederationAlert: opsActions.openingFederationAlert,
    resolvingFederationAlert: opsActions.resolvingFederationAlert,
    registerDiscoverySource,
    recordDiscoveryRun,
    upsertDiscoveredCandidate,
    promoteDiscoveredCandidate,
    recordPolicyRatification,
    runFederationExchangeReceiptAutomationCheck,
    acknowledgeFederationExchangeReceiptEscalationPage,
    resolveFederationExchangeReceiptEscalationPage,
    captureFederationPackage: distributionActions.captureFederationPackage,
    signFederationPackage: distributionActions.signFederationPackage,
    runFederationDistributionVerification: distributionActions.runFederationDistributionVerification,
    recordFederationExchangeAttestation: distributionActions.recordFederationExchangeAttestation,
    verifyFederationExchangeReceipt: distributionActions.verifyFederationExchangeReceipt,
    saveFederationExchangeReceiptPolicy: distributionActions.saveFederationExchangeReceiptPolicy,
    rollbackFederationExchangeReceiptPolicyToEvent: distributionActions.rollbackFederationExchangeReceiptPolicyToEvent,
    saveFederationOpsRequirement: opsActions.saveFederationOpsRequirement,
    registerFederationOperator: opsActions.registerFederationOperator,
    submitFederationOnboardingRequest: opsActions.submitFederationOnboardingRequest,
    reviewFederationOnboardingRequest: opsActions.reviewFederationOnboardingRequest,
    onboardFederationRequest: opsActions.onboardFederationRequest,
    recordFederationWorkerRun: opsActions.recordFederationWorkerRun,
    openFederationAlert: opsActions.openFederationAlert,
    resolveFederationAlert: opsActions.resolveFederationAlert,
  };
}
