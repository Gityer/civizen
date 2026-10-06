import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GovernanceGuardianExternalMultisigPanel } from '@/components/governance/GovernanceGuardianExternalMultisigPanel';
import { GovernanceGuardianRelayPanel } from '@/components/governance/GovernanceGuardianRelayPanel';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  isMissingGuardianMultisigBackend,
  readGovernanceProposalExternalMultisigSummary,
  type GuardianExternalSignerRow,
  type GovernanceProposalExternalMultisigSummary,
} from '@/lib/governance-guardian-multisig';
import { prepareExternalGuardianSignoffPayload } from '@/lib/governance-guardian-external-signoff';

interface GovernanceGuardianSignoffCardProps {
  proposalId: string;
  proposalStatus: Database['public']['Enums']['governance_proposal_status'];
  requiresGuardianSignoff: boolean;
  isGuardianSigner: boolean;
  isBlocked: boolean;
  profileId: string | null;
  onUpdated: () => Promise<void> | void;
}

export function GovernanceGuardianSignoffCard({
  proposalId,
  proposalStatus,
  requiresGuardianSignoff,
  isGuardianSigner,
  isBlocked,
  profileId,
  onUpdated,
}: GovernanceGuardianSignoffCardProps) {
  const [submittingDecision, setSubmittingDecision] = useState<Database['public']['Enums']['governance_guardian_decision'] | null>(null);
  const [loadingExternalMultisig, setLoadingExternalMultisig] = useState(true);
  const [externalMultisigUnavailable, setExternalMultisigUnavailable] = useState(false);
  const [canManageGuardianMultisig, setCanManageGuardianMultisig] = useState(false);
  const [externalSummary, setExternalSummary] = useState<GovernanceProposalExternalMultisigSummary | null>(null);
  const [externalSigners, setExternalSigners] = useState<GuardianExternalSignerRow[]>([]);
  const [selectedExternalSignerId, setSelectedExternalSignerId] = useState('');
  const [externalDecision, setExternalDecision] = useState<Database['public']['Enums']['governance_guardian_decision']>('approve');
  const [externalPayloadHash, setExternalPayloadHash] = useState('');
  const [externalSignatureReference, setExternalSignatureReference] = useState('');
  const [externalSignedMessage, setExternalSignedMessage] = useState('');
  const [externalSignature, setExternalSignature] = useState('');
  const [externalRationale, setExternalRationale] = useState('');
  const [submittingExternalSignature, setSubmittingExternalSignature] = useState(false);

  const canAttestExternalSignatures = isGuardianSigner || canManageGuardianMultisig;
  const selectedExternalSigner = externalSigners.find((signer) => signer.id === selectedExternalSignerId) || null;

  const loadExternalMultisigData = useCallback(async () => {
    setLoadingExternalMultisig(true);

    const [summaryResponse, signerResponse, managerResponse] = await Promise.all([
      supabase.rpc('governance_proposal_external_multisig_summary', {
        target_proposal_id: proposalId,
      }),
      supabase
        .from('governance_guardian_external_signers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      supabase.rpc('current_profile_can_manage_guardian_multisig'),
    ]);

    const sharedError = summaryResponse.error || signerResponse.error || managerResponse.error;
    if (isMissingGuardianMultisigBackend(sharedError)) {
      setExternalMultisigUnavailable(true);
      setLoadingExternalMultisig(false);
      return;
    }

    if (sharedError) {
      console.error('Failed to load guardian external multisig data:', {
        summaryError: summaryResponse.error,
        signersError: signerResponse.error,
        managerError: managerResponse.error,
      });
      setLoadingExternalMultisig(false);
      return;
    }

    const summary = readGovernanceProposalExternalMultisigSummary(summaryResponse.data);
    const signers = signerResponse.data ?? [];

    setExternalSummary(summary);
    setExternalSigners(signers);
    setCanManageGuardianMultisig(Boolean(managerResponse.data));
    setSelectedExternalSignerId((current) => current || signers[0]?.id || '');
    setExternalMultisigUnavailable(false);
    setLoadingExternalMultisig(false);
  }, [proposalId]);

  useEffect(() => {
    if (!requiresGuardianSignoff || proposalStatus !== 'open') return;
    void loadExternalMultisigData();
  }, [loadExternalMultisigData, proposalStatus, requiresGuardianSignoff]);

  if (!requiresGuardianSignoff || proposalStatus !== 'open') {
    return null;
  }

  const handleSignoff = async (decision: Database['public']['Enums']['governance_guardian_decision']) => {
    if (!profileId || !isGuardianSigner) return;

    setSubmittingDecision(decision);

    const { error: signoffError } = await supabase
      .from('governance_proposal_guardian_approvals')
      .upsert(
        {
          proposal_id: proposalId,
          signer_profile_id: profileId,
          decision,
          snapshot: {
            source: 'governance_hub',
            decision,
          },
        },
        { onConflict: 'proposal_id,signer_profile_id' },
      );

    if (signoffError) {
      console.error('Failed to record guardian signoff:', signoffError);
      toast.error('Could not record guardian signoff.');
      setSubmittingDecision(null);
      return;
    }

    const { error: eventError } = await supabase.from('governance_proposal_events').insert({
      proposal_id: proposalId,
      actor_id: profileId,
      event_type: 'guardian.signoff.recorded',
      payload: {
        decision,
      },
    });

    if (eventError) {
      console.error('Failed to record guardian signoff event:', eventError);
    }

    toast.success(decision === 'approve' ? 'Guardian approval recorded.' : 'Guardian rejection recorded.');
    setSubmittingDecision(null);
    await loadExternalMultisigData();
    await onUpdated();
  };

  const handleRecordExternalSignature = async () => {
    if (!profileId || !canAttestExternalSignatures) return;
    if (!selectedExternalSigner) {
      toast.error('Select an external signer before recording.');
      return;
    }
    if (!externalSignatureReference.trim()) {
      toast.error('Enter an external signature reference before recording.');
      return;
    }

    setSubmittingExternalSignature(true);
    let verificationMethod: string;
    let resolvedPayloadHash: string | null;
    let resolvedSignedMessage: string | null;
    let resolvedSignature: string | null;
    let hasCryptographicPayload: boolean;
    try {
      const preparedPayload = await prepareExternalGuardianSignoffPayload({
        signer: selectedExternalSigner,
        payloadHashInput: externalPayloadHash,
        signedMessageInput: externalSignedMessage,
        signatureInput: externalSignature,
      });
      verificationMethod = preparedPayload.verificationMethod;
      resolvedPayloadHash = preparedPayload.payloadHash;
      resolvedSignedMessage = preparedPayload.signedMessage;
      resolvedSignature = preparedPayload.signature;
      hasCryptographicPayload = preparedPayload.hasCryptographicPayload;
    } catch (verificationError) {
      console.error('Failed to verify external guardian signature payload:', verificationError);
      toast.error(
        verificationError instanceof Error
          ? verificationError.message
          : 'Could not verify cryptographic signature for the selected signer.',
      );
      setSubmittingExternalSignature(false);
      return;
    }

    const { error: signatureError } = await supabase
      .from('governance_proposal_guardian_external_signatures')
      .upsert(
        {
          proposal_id: proposalId,
          external_signer_id: selectedExternalSignerId,
          decision: externalDecision,
          payload_hash: resolvedPayloadHash,
          signature: resolvedSignature,
          signature_reference: externalSignatureReference.trim(),
          signed_message: resolvedSignedMessage,
          rationale: externalRationale.trim() || null,
          verification_method: verificationMethod,
          verified_by: profileId,
          verified_at: new Date().toISOString(),
          snapshot: {
            source: 'governance_hub',
            decision: externalDecision,
            verification_method: verificationMethod,
          },
        },
        { onConflict: 'proposal_id,external_signer_id' },
      );

    if (signatureError) {
      console.error('Failed to record external guardian signature:', signatureError);
      toast.error('Could not record external guardian signature.');
      setSubmittingExternalSignature(false);
      return;
    }

    const { error: eventError } = await supabase.from('governance_proposal_events').insert({
      proposal_id: proposalId,
      actor_id: profileId,
      event_type: 'guardian.external_signoff.recorded',
      payload: {
        external_signer_id: selectedExternalSignerId,
        decision: externalDecision,
        signature_reference: externalSignatureReference.trim(),
        payload_hash: resolvedPayloadHash,
        verification_method: verificationMethod,
        cryptographic_payload: hasCryptographicPayload,
      },
    });

    if (eventError) {
      console.error('Failed to record external guardian signoff event:', eventError);
    }

    toast.success(
      verificationMethod === 'cryptographic_signature_verification'
        ? 'External guardian signature verified and recorded.'
        : 'External guardian signature attestation recorded.',
    );
    setExternalPayloadHash('');
    setExternalSignatureReference('');
    setExternalSignedMessage('');
    setExternalSignature('');
    setExternalRationale('');
    setSubmittingExternalSignature(false);
    await loadExternalMultisigData();
    await onUpdated();
  };

  const externalProgressLabel = (() => {
    if (!externalSummary?.externalMultisigRequired) return 'External multisig optional';
    return `External approvals ${externalSummary.externalApprovalCount}/${externalSummary.requiredExternalApprovals}`;
  })();

  return (
    <div className="space-y-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
          Guardian signoff required
        </p>
        <Badge variant="outline" className="border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300">
          Critical action
        </Badge>
      </div>

      {isGuardianSigner ? (
        <div className="grid grid-cols-1 gap-2">
          <Button
            type="button"
            size="sm"
            className="gap-2"
            disabled={isBlocked || submittingDecision !== null}
            onClick={() => void handleSignoff('approve')}
          >
            {submittingDecision === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Guardian approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={isBlocked || submittingDecision !== null}
            onClick={() => void handleSignoff('reject')}
          >
            {submittingDecision === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
            Guardian reject
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Waiting for active guardian signers to record approval.
        </p>
      )}

      {!externalMultisigUnavailable && (
        <GovernanceGuardianExternalMultisigPanel
          loadingExternalMultisig={loadingExternalMultisig}
          externalProgressLabel={externalProgressLabel}
          externalSummary={externalSummary}
          canAttestExternalSignatures={canAttestExternalSignatures}
          selectedExternalSignerId={selectedExternalSignerId}
          externalSigners={externalSigners}
          externalDecision={externalDecision}
          externalSignatureReference={externalSignatureReference}
          externalSignedMessage={externalSignedMessage}
          externalSignature={externalSignature}
          externalPayloadHash={externalPayloadHash}
          externalRationale={externalRationale}
          submittingExternalSignature={submittingExternalSignature}
          isBlocked={isBlocked}
          onSelectedExternalSignerIdChange={setSelectedExternalSignerId}
          onExternalDecisionChange={setExternalDecision}
          onExternalSignatureReferenceChange={setExternalSignatureReference}
          onExternalSignedMessageChange={setExternalSignedMessage}
          onExternalSignatureChange={setExternalSignature}
          onExternalPayloadHashChange={setExternalPayloadHash}
          onExternalRationaleChange={setExternalRationale}
          onRecordExternalSignature={() => void handleRecordExternalSignature()}
        />
      )}

      {!externalMultisigUnavailable && (
        <GovernanceGuardianRelayPanel
          proposalId={proposalId}
          externalSigners={externalSigners}
        />
      )}
    </div>
  );
}
