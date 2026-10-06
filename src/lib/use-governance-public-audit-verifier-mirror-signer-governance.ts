import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import {
  isMissingPublicAuditVerifierBackend,
  readGovernancePublicAuditVerifierMirrorSignerGovernanceBoardRows,
  readGovernancePublicAuditVerifierMirrorSignerGovernanceSummary,
  type GovernancePublicAuditVerifierMirrorSignerGovernanceBoardRow,
  type GovernancePublicAuditVerifierMirrorSignerGovernanceSummary,
} from '@/lib/governance-public-audit-verifiers';

function asIntegerOrNull(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useGovernancePublicAuditVerifierMirrorSignerGovernance() {
  const [loadingSignerGovernanceData, setLoadingSignerGovernanceData] = useState(true);
  const [signerGovernanceBackendUnavailable, setSignerGovernanceBackendUnavailable] = useState(false);
  const [canManageSignerGovernance, setCanManageSignerGovernance] = useState(false);

  const [savingSignerGovernanceRequirement, setSavingSignerGovernanceRequirement] = useState(false);
  const [savingSignerGovernanceAttestation, setSavingSignerGovernanceAttestation] = useState(false);

  const [signerGovernanceSummary, setSignerGovernanceSummary] =
    useState<GovernancePublicAuditVerifierMirrorSignerGovernanceSummary | null>(null);
  const [signerGovernanceBoard, setSignerGovernanceBoard] =
    useState<GovernancePublicAuditVerifierMirrorSignerGovernanceBoardRow[]>([]);

  const loadSignerGovernanceData = useCallback(async () => {
    setLoadingSignerGovernanceData(true);

    const [permissionResponse, summaryResponse, boardResponse] = await Promise.all([
      supabase.rpc('current_profile_can_manage_public_audit_verifiers'),
      supabase.rpc('governance_public_audit_verifier_mirror_signer_governance_summa', {
        requested_policy_key: 'default',
      }),
      supabase.rpc('governance_public_audit_verifier_mirror_signer_governance_board', {
        max_entries: 80,
      }),
    ]);

    const sharedError = permissionResponse.error || summaryResponse.error || boardResponse.error;
    if (isMissingPublicAuditVerifierBackend(sharedError)) {
      setSignerGovernanceBackendUnavailable(true);
      setLoadingSignerGovernanceData(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load verifier mirror signer governance data:', {
        permissionError: permissionResponse.error,
        summaryError: summaryResponse.error,
        boardError: boardResponse.error,
      });
      toast.error('Could not load signer governance data.');
      setLoadingSignerGovernanceData(false);
      return;
    }

    setCanManageSignerGovernance(Boolean(permissionResponse.data));
    setSignerGovernanceSummary(readGovernancePublicAuditVerifierMirrorSignerGovernanceSummary(summaryResponse.data));
    setSignerGovernanceBoard(readGovernancePublicAuditVerifierMirrorSignerGovernanceBoardRows(boardResponse.data));
    setSignerGovernanceBackendUnavailable(false);
    setLoadingSignerGovernanceData(false);
  }, []);

  useEffect(() => {
    void loadSignerGovernanceData();
  }, [loadSignerGovernanceData]);

  const saveSignerGovernanceRequirement = useCallback(async (draft: {
    requireSignerGovernanceApproval: boolean;
    minSignerGovernanceIndependentApprovals: string;
  }) => {
    if (signerGovernanceBackendUnavailable || !canManageSignerGovernance) return;

    setSavingSignerGovernanceRequirement(true);

    const { error } = await supabase.rpc('set_governance_public_audit_verifier_mirror_signer_governance_r', {
      requested_policy_key: 'default',
      require_governance_approval: draft.requireSignerGovernanceApproval,
      required_independent_approvals: asIntegerOrNull(draft.minSignerGovernanceIndependentApprovals) ?? undefined,
    });

    if (error) {
      console.error('Failed to save signer governance requirement:', error);
      toast.error('Could not save signer governance requirement.');
      setSavingSignerGovernanceRequirement(false);
      return;
    }

    toast.success('Signer governance requirement saved.');
    setSavingSignerGovernanceRequirement(false);
    await loadSignerGovernanceData();
  }, [canManageSignerGovernance, loadSignerGovernanceData, signerGovernanceBackendUnavailable]);

  const saveSignerGovernanceAttestation = useCallback(async (draft: {
    targetSignerId: string;
    attestorSignerKey: string;
    attestationDecision: 'approve' | 'reject';
    attestationSignature: string;
  }) => {
    if (signerGovernanceBackendUnavailable || !canManageSignerGovernance) return;

    if (!draft.targetSignerId || !draft.attestorSignerKey.trim() || !draft.attestationSignature.trim()) {
      toast.error('Target signer, attestor signer key, and signature are required.');
      return;
    }

    setSavingSignerGovernanceAttestation(true);

    const { error } = await supabase.rpc('record_governance_public_audit_verifier_mirror_signer_governanc', {
      target_signer_id: draft.targetSignerId,
      attestor_signer_key: draft.attestorSignerKey.trim(),
      attestation_decision: draft.attestationDecision,
      attestation_signature: draft.attestationSignature.trim(),
      attestation_payload: {
        source: 'governance_public_audit_verifier_panel',
      },
    });

    if (error) {
      console.error('Failed to save signer governance attestation:', error);
      toast.error('Could not save signer governance attestation.');
      setSavingSignerGovernanceAttestation(false);
      return;
    }

    toast.success('Signer governance attestation saved.');
    setSavingSignerGovernanceAttestation(false);
    await loadSignerGovernanceData();
  }, [canManageSignerGovernance, loadSignerGovernanceData, signerGovernanceBackendUnavailable]);

  return {
    loadingSignerGovernanceData,
    signerGovernanceBackendUnavailable,
    canManageSignerGovernance,
    savingSignerGovernanceRequirement,
    savingSignerGovernanceAttestation,
    signerGovernanceSummary,
    signerGovernanceBoard,
    loadSignerGovernanceData,
    saveSignerGovernanceRequirement,
    saveSignerGovernanceAttestation,
  };
}
