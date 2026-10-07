import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { asIntegerOrNull } from '@/lib/governance-rpc';

interface UseGovernancePublicAuditVerifierFederationDistributionActionsArgs {
  latestBatchId: string | null;
  canManageMirrorFederation: boolean;
  federationBackendUnavailable: boolean;
  loadFederationData: () => Promise<void>;
}

export function useGovernancePublicAuditVerifierFederationDistributionActions({
  latestBatchId,
  canManageMirrorFederation,
  federationBackendUnavailable,
  loadFederationData,
}: UseGovernancePublicAuditVerifierFederationDistributionActionsArgs) {
  const [capturingFederationPackage, setCapturingFederationPackage] = useState(false);
  const [signingFederationPackage, setSigningFederationPackage] = useState(false);
  const [verifyingFederationDistribution, setVerifyingFederationDistribution] = useState(false);
  const [recordingFederationExchangeAttestation, setRecordingFederationExchangeAttestation] = useState(false);
  const [verifyingFederationExchangeReceipt, setVerifyingFederationExchangeReceipt] = useState(false);
  const [savingFederationExchangeReceiptPolicy, setSavingFederationExchangeReceiptPolicy] = useState(false);
  const [rollingBackFederationExchangeReceiptPolicyEventId, setRollingBackFederationExchangeReceiptPolicyEventId] = useState<string | null>(null);

  const captureFederationPackage = useCallback(async (packageNotes: string) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    setCapturingFederationPackage(true);
    const { error } = await supabase.rpc('capture_governance_public_audit_verifier_federation_package', {
      target_batch_id: latestBatchId,
      requested_policy_key: 'default',
      package_notes: packageNotes.trim() || null,
      package_metadata: {
        source: 'governance_public_audit_verifier_panel',
      },
    });

    if (error) {
      console.error('Failed to capture verifier federation package:', error);
      const detail = typeof error?.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : null;
      toast.error(detail ?? 'Could not capture verifier federation package.');
      setCapturingFederationPackage(false);
      return;
    }

    toast.success('Verifier federation package captured.');
    setCapturingFederationPackage(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, latestBatchId, loadFederationData]);

  const signFederationPackage = useCallback(async (draft: {
    packageId: string;
    signerKey: string;
    signature: string;
    signatureAlgorithm: string;
    signerTrustDomain: string;
    signerJurisdictionCountryCode: string;
    signerIdentityUri: string;
    distributionChannel: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const packageId = draft.packageId.trim();
    const signerKey = draft.signerKey.trim();
    const signature = draft.signature.trim();
    if (!packageId || !signerKey || !signature) {
      toast.error('Package, signer key, and signature are required.');
      return;
    }

    setSigningFederationPackage(true);
    const { error } = await supabase.rpc('sign_governance_public_audit_verifier_federation_package', {
      target_package_id: packageId,
      signer_key: signerKey,
      signature,
      signature_algorithm: draft.signatureAlgorithm.trim() || 'ed25519',
      signer_trust_domain: draft.signerTrustDomain.trim().toLowerCase() || 'public',
      signer_jurisdiction_country_code: draft.signerJurisdictionCountryCode.trim().toUpperCase() || null,
      signer_identity_uri: draft.signerIdentityUri.trim() || null,
      distribution_channel: draft.distributionChannel.trim().toLowerCase() || 'primary',
      signature_metadata: {
        source: 'governance_public_audit_verifier_panel',
      },
    });

    if (error) {
      console.error('Failed to sign verifier federation package:', error);
      const detail = typeof error?.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : null;
      toast.error(detail ?? 'Could not sign verifier federation package.');
      setSigningFederationPackage(false);
      return;
    }

    toast.success('Verifier federation package signature recorded.');
    setSigningFederationPackage(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const runFederationDistributionVerification = useCallback(async (staleAfterHours: string) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    setVerifyingFederationDistribution(true);
    const staleHours = asIntegerOrNull(staleAfterHours);
    const { data, error } = await supabase.rpc('run_governance_public_audit_verifier_federation_distribution_ve', {
      target_batch_id: latestBatchId,
      requested_policy_key: 'default',
      stale_after_hours: staleHours ?? undefined,
      run_metadata: {
        source: 'governance_public_audit_verifier_panel',
      },
    });

    if (error) {
      console.error('Failed to run verifier federation distribution verification:', error);
      const detail = typeof error?.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : null;
      toast.error(detail ?? 'Could not run federation distribution verification.');
      setVerifyingFederationDistribution(false);
      return;
    }

    const runStatus = typeof data?.[0]?.run_status === 'string'
      ? data[0].run_status.trim().toLowerCase()
      : 'ok';
    if (runStatus === 'ok') {
      toast.success('Federation distribution verification completed.');
    } else {
      toast.warning('Federation distribution verification opened blocking alerts.');
    }
    setVerifyingFederationDistribution(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, latestBatchId, loadFederationData]);

  const recordFederationExchangeAttestation = useCallback(async (draft: {
    packageId: string;
    operatorLabel: string;
    operatorIdentityUri: string;
    operatorTrustDomain: string;
    operatorJurisdictionCountryCode: string;
    exchangeChannel: string;
    attestationVerdict: string;
    attestationNotes: string;
    receiptPayloadText: string;
    receiptSignature: string;
    receiptSignerKey: string;
    receiptSignatureAlgorithm: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const packageId = draft.packageId.trim();
    const operatorLabel = draft.operatorLabel.trim();
    if (!packageId || !operatorLabel) {
      toast.error('Package and operator label are required.');
      return;
    }

    let parsedReceiptPayload: Record<string, unknown> | null = null;
    const receiptPayloadText = draft.receiptPayloadText.trim();
    if (receiptPayloadText) {
      try {
        const parsed = JSON.parse(receiptPayloadText) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          toast.error('Receipt payload must be a JSON object.');
          return;
        }
        parsedReceiptPayload = parsed as Record<string, unknown>;
      } catch {
        toast.error('Receipt payload must be valid JSON.');
        return;
      }
    }

    setRecordingFederationExchangeAttestation(true);
    const { error } = await supabase.rpc('record_governance_public_audit_verifier_federation_exchange', {
      target_package_id: packageId,
      operator_label: operatorLabel,
      operator_identity_uri: draft.operatorIdentityUri.trim() || null,
      operator_trust_domain: draft.operatorTrustDomain.trim().toLowerCase() || 'external',
      operator_jurisdiction_country_code: draft.operatorJurisdictionCountryCode.trim().toUpperCase() || null,
      exchange_channel: draft.exchangeChannel.trim().toLowerCase() || 'api',
      attestation_verdict: draft.attestationVerdict.trim().toLowerCase() || 'accepted',
      attestation_notes: draft.attestationNotes.trim() || null,
      attestation_metadata: {
        source: 'governance_public_audit_verifier_panel',
      },
      receipt_payload: parsedReceiptPayload,
      receipt_signature: draft.receiptSignature.trim() || null,
      receipt_signer_key: draft.receiptSignerKey.trim() || null,
      receipt_signature_algorithm: draft.receiptSignatureAlgorithm.trim().toLowerCase() || 'ed25519',
    });

    if (error) {
      console.error('Failed to record verifier federation exchange attestation:', error);
      const detail = typeof error?.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : null;
      toast.error(detail ?? 'Could not record federation exchange attestation.');
      setRecordingFederationExchangeAttestation(false);
      return;
    }

    toast.success('Federation exchange attestation recorded.');
    setRecordingFederationExchangeAttestation(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const verifyFederationExchangeReceipt = useCallback(async (draft: {
    attestationId: string;
    receiptVerified: boolean;
    receiptVerificationNotes: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    const attestationId = draft.attestationId.trim();
    if (!attestationId) {
      toast.error('Attestation id is required.');
      return;
    }

    setVerifyingFederationExchangeReceipt(true);
    const { error } = await supabase.rpc('gpav_verify_federation_exchange_receipt', {
      target_attestation_id: attestationId,
      receipt_verified: draft.receiptVerified,
      receipt_verification_notes: draft.receiptVerificationNotes.trim() || null,
    });

    if (error) {
      console.error('Failed to verify federation exchange receipt:', error);
      const detail = typeof error?.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : null;
      toast.error(detail ?? 'Could not verify federation exchange receipt.');
      setVerifyingFederationExchangeReceipt(false);
      return;
    }

    toast.success(draft.receiptVerified ? 'Exchange receipt marked verified.' : 'Exchange receipt marked unverified.');
    setVerifyingFederationExchangeReceipt(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const saveFederationExchangeReceiptPolicy = useCallback(async (draft: {
    lookbackHours: string;
    warningPendingThreshold: string;
    criticalPendingThreshold: string;
    escalationEnabled: boolean;
    oncallChannel: string;
    receiptMaxVerificationAgeHours: string;
    criticalStaleReceiptCountThreshold: string;
  }) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;

    const lookbackHours = asIntegerOrNull(draft.lookbackHours);
    const warningPendingThreshold = asIntegerOrNull(draft.warningPendingThreshold);
    const criticalPendingThreshold = asIntegerOrNull(draft.criticalPendingThreshold);
    const receiptMaxVerificationAgeHours = asIntegerOrNull(draft.receiptMaxVerificationAgeHours);
    const criticalStaleReceiptCountThreshold = asIntegerOrNull(draft.criticalStaleReceiptCountThreshold);
    if (!lookbackHours || !warningPendingThreshold || !criticalPendingThreshold || !receiptMaxVerificationAgeHours || !criticalStaleReceiptCountThreshold) {
      toast.error('Lookback and threshold values must be positive integers.');
      return;
    }
    if (criticalPendingThreshold < warningPendingThreshold) {
      toast.error('Critical threshold must be greater than or equal to warning threshold.');
      return;
    }

    setSavingFederationExchangeReceiptPolicy(true);
    const { error } = await supabase.rpc('set_gpav_fed_exchange_receipt_policy', {
      requested_policy_key: 'default',
      requested_policy_name: 'Default federation exchange receipt escalation policy',
      requested_lookback_hours: lookbackHours,
      requested_warning_pending_threshold: warningPendingThreshold,
      requested_critical_pending_threshold: criticalPendingThreshold,
      requested_escalation_enabled: draft.escalationEnabled,
      requested_oncall_channel: draft.oncallChannel.trim() || 'public_audit_ops',
      requested_receipt_max_verification_age_hours: receiptMaxVerificationAgeHours,
      requested_critical_stale_receipt_count_threshold: criticalStaleReceiptCountThreshold,
      metadata: { source: 'governance_public_audit_verifier_panel' },
    });

    if (error) {
      console.error('Failed to save federation exchange receipt policy:', error);
      const detail = typeof error?.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : null;
      toast.error(detail ?? 'Could not save federation exchange receipt policy.');
      setSavingFederationExchangeReceiptPolicy(false);
      return;
    }

    toast.success('Federation exchange receipt policy saved.');
    setSavingFederationExchangeReceiptPolicy(false);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  const rollbackFederationExchangeReceiptPolicyToEvent = useCallback(async (eventId: string) => {
    if (federationBackendUnavailable || !canManageMirrorFederation) return;
    const trimmed = eventId.trim();
    if (!trimmed) return;

    setRollingBackFederationExchangeReceiptPolicyEventId(trimmed);
    const { error } = await supabase.rpc('rollback_gpav_fed_exchange_receipt_policy_to_event', {
      target_event_id: trimmed,
      max_rollback_age_hours: 336,
      required_policy_schema_version: '1',
    });

    if (error) {
      console.error('Failed to rollback federation exchange receipt policy:', error);
      const detail = typeof error?.message === 'string' && error.message.trim().length > 0 ? error.message.trim() : null;
      toast.error(detail ?? 'Could not rollback federation exchange receipt policy.');
      setRollingBackFederationExchangeReceiptPolicyEventId(null);
      return;
    }

    toast.success('Federation exchange receipt policy rolled back.');
    setRollingBackFederationExchangeReceiptPolicyEventId(null);
    await loadFederationData();
  }, [canManageMirrorFederation, federationBackendUnavailable, loadFederationData]);

  return {
    capturingFederationPackage,
    signingFederationPackage,
    verifyingFederationDistribution,
    recordingFederationExchangeAttestation,
    verifyingFederationExchangeReceipt,
    savingFederationExchangeReceiptPolicy,
    rollingBackFederationExchangeReceiptPolicyEventId,
    captureFederationPackage,
    signFederationPackage,
    runFederationDistributionVerification,
    recordFederationExchangeAttestation,
    verifyFederationExchangeReceipt,
    saveFederationExchangeReceiptPolicy,
    rollbackFederationExchangeReceiptPolicyToEvent,
  };
}
