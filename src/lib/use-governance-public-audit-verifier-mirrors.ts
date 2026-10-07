import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import {
  isMissingPublicAuditVerifierBackend,
  readGovernancePublicAuditClientVerifierBundle,
  readGovernancePublicAuditVerifierMirrorHealthRows,
  type GovernancePublicAuditClientVerifierBundle,
  type GovernancePublicAuditVerifierMirrorHealthRow,
} from '@/lib/governance-public-audit-verifiers';

export function useGovernancePublicAuditVerifierMirrors(args: { latestBatchId: string | null }) {
  const [loadingMirrorData, setLoadingMirrorData] = useState(true);
  const [mirrorBackendUnavailable, setMirrorBackendUnavailable] = useState(false);
  const [canManageVerifierMirrors, setCanManageVerifierMirrors] = useState(false);
  const [registeringVerifierMirror, setRegisteringVerifierMirror] = useState(false);
  const [recordingVerifierMirrorCheck, setRecordingVerifierMirrorCheck] = useState(false);
  const [togglingMirrorId, setTogglingMirrorId] = useState<string | null>(null);

  const [verifierMirrorHealthRows, setVerifierMirrorHealthRows] = useState<GovernancePublicAuditVerifierMirrorHealthRow[]>([]);
  const [clientVerifierBundle, setClientVerifierBundle] = useState<GovernancePublicAuditClientVerifierBundle | null>(null);

  const loadMirrorData = useCallback(async () => {
    setLoadingMirrorData(true);

    const [permissionResponse, mirrorHealthResponse, clientBundleResponse] = await Promise.all([
      supabase.rpc('current_profile_can_manage_public_audit_verifiers'),
      supabase.rpc('governance_public_audit_verifier_mirror_health_summary', {
        requested_batch_id: args.latestBatchId,
        stale_after_minutes: 90,
      }),
      supabase.rpc('governance_public_audit_client_verifier_bundle', {
        target_batch_id: args.latestBatchId,
        max_mirrors: 8,
      }),
    ]);

    const sharedError = permissionResponse.error || mirrorHealthResponse.error || clientBundleResponse.error;
    if (isMissingPublicAuditVerifierBackend(sharedError)) {
      setMirrorBackendUnavailable(true);
      setLoadingMirrorData(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load public audit verifier mirror data:', {
        permissionError: permissionResponse.error,
        mirrorHealthError: mirrorHealthResponse.error,
        clientBundleError: clientBundleResponse.error,
      });
      toast.error('Could not load verifier mirror data.');
      setLoadingMirrorData(false);
      return;
    }

    setCanManageVerifierMirrors(Boolean(permissionResponse.data));
    setVerifierMirrorHealthRows(readGovernancePublicAuditVerifierMirrorHealthRows(mirrorHealthResponse.data));
    setClientVerifierBundle(readGovernancePublicAuditClientVerifierBundle(clientBundleResponse.data));
    setMirrorBackendUnavailable(false);
    setLoadingMirrorData(false);
  }, [args.latestBatchId]);

  useEffect(() => {
    void loadMirrorData();
  }, [loadMirrorData]);

  const registerVerifierMirror = useCallback(async (draft: {
    mirrorKey: string;
    mirrorLabel: string;
    endpointUrl: string;
    mirrorType: string;
    regionCode: string;
    jurisdictionCountryCode: string;
    operatorLabel: string;
  }) => {
    if (mirrorBackendUnavailable || !canManageVerifierMirrors) return;

    const mirrorKey = draft.mirrorKey.trim();
    const endpointUrl = draft.endpointUrl.trim();
    if (!mirrorKey || !endpointUrl) {
      toast.error('Mirror key and endpoint URL are required.');
      return;
    }

    setRegisteringVerifierMirror(true);

    const { error } = await supabase.rpc('register_governance_public_audit_verifier_mirror', {
      mirror_key: mirrorKey,
      mirror_label: draft.mirrorLabel.trim() || null,
      endpoint_url: endpointUrl,
      mirror_type: draft.mirrorType.trim() || 'https_gateway',
      region_code: draft.regionCode.trim().toUpperCase() || 'GLOBAL',
      jurisdiction_country_code: draft.jurisdictionCountryCode.trim().toUpperCase() || '',
      operator_label: draft.operatorLabel.trim() || 'unspecified',
      metadata: {
        source: 'governance_public_audit_verifier_panel',
      },
    });

    if (error) {
      console.error('Failed to register public audit verifier mirror:', error);
      toast.error('Could not register verifier mirror.');
      setRegisteringVerifierMirror(false);
      return;
    }

    toast.success('Verifier mirror saved.');
    setRegisteringVerifierMirror(false);
    await loadMirrorData();
  }, [canManageVerifierMirrors, loadMirrorData, mirrorBackendUnavailable]);

  const recordVerifierMirrorCheck = useCallback(async (draft: {
    mirrorId: string;
    checkStatus: 'ok' | 'degraded' | 'failed';
    latencyMs: string;
    observedBatchHash: string;
    errorMessage: string;
  }) => {
    if (mirrorBackendUnavailable || !canManageVerifierMirrors) return;

    if (!draft.mirrorId) {
      toast.error('Select a verifier mirror first.');
      return;
    }

    setRecordingVerifierMirrorCheck(true);

    const parsedLatency = Number.parseInt(draft.latencyMs, 10);

    const { error } = await supabase.rpc('record_governance_public_audit_verifier_mirror_check', {
      target_mirror_id: draft.mirrorId,
      check_status: draft.checkStatus,
      target_batch_id: args.latestBatchId,
      latency_ms: Number.isFinite(parsedLatency) ? parsedLatency : null,
      observed_batch_hash: draft.observedBatchHash.trim() || null,
      error_message: draft.errorMessage.trim() || null,
      check_payload: {
        source: 'governance_public_audit_verifier_panel',
      },
    });

    if (error) {
      console.error('Failed to record verifier mirror health check:', error);
      toast.error('Could not record verifier mirror check.');
      setRecordingVerifierMirrorCheck(false);
      return;
    }

    toast.success('Verifier mirror check recorded.');
    setRecordingVerifierMirrorCheck(false);
    await loadMirrorData();
  }, [args.latestBatchId, canManageVerifierMirrors, loadMirrorData, mirrorBackendUnavailable]);

  const setVerifierMirrorActive = useCallback(async (mirrorId: string, isActive: boolean) => {
    if (mirrorBackendUnavailable || !canManageVerifierMirrors) return;

    setTogglingMirrorId(mirrorId);

    const { error } = await supabase
      .from('governance_public_audit_verifier_mirrors')
      .update({ is_active: isActive })
      .eq('id', mirrorId);

    if (error) {
      console.error('Failed to update verifier mirror status:', { mirrorId, error });
      toast.error('Could not update verifier mirror status.');
      setTogglingMirrorId(null);
      return;
    }

    toast.success(isActive ? 'Verifier mirror activated.' : 'Verifier mirror deactivated.');
    setTogglingMirrorId(null);
    await loadMirrorData();
  }, [canManageVerifierMirrors, loadMirrorData, mirrorBackendUnavailable]);

  return {
    loadingMirrorData,
    mirrorBackendUnavailable,
    canManageVerifierMirrors,
    registeringVerifierMirror,
    recordingVerifierMirrorCheck,
    togglingMirrorId,
    verifierMirrorHealthRows,
    clientVerifierBundle,
    loadMirrorData,
    registerVerifierMirror,
    recordVerifierMirrorCheck,
    setVerifierMirrorActive,
  };
}
