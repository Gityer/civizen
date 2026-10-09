import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { INTENT_SCOPES, ballotIntentPayload, recordSignedIntent, signatureSummaryFor, type SignatureSummary, type SignerProfile } from '@/lib/governance-intents';

const NONE: SignatureSummary = { status: 'unsigned', fingerprint: null, signedAt: null };

/**
 * The voter's signature over their own ballot (Phase 10 step 10.2): after a cast, the device signs
 * {election, sha256(receipt)} with the citizen key and stores the envelope; on load, the latest envelope for this
 * election and voter is verified here. Everything is best effort and never blocks the ballot itself.
 */
export function useBallotSignature(electionId: string, profile: SignerProfile | null | undefined, myReceipt: string | null) {
  const [signature, setSignature] = useState<SignatureSummary>(NONE);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!electionId || !profile?.id || !myReceipt) {
      setSignature(NONE);
      return;
    }
    let active = true;
    void signatureSummaryFor(supabase, INTENT_SCOPES.consultationBallot, electionId, profile.id).then((summary) => {
      if (active) setSignature(summary);
    });
    return () => {
      active = false;
    };
  }, [electionId, profile?.id, myReceipt]);

  /** Called right after a successful cast with the fresh receipt. */
  const signBallot = useCallback(
    async (receipt: string) => {
      if (!electionId || !profile?.id || !receipt) return;
      setSigning(true);
      try {
        const envelope = await recordSignedIntent(supabase, {
          profile,
          scope: INTENT_SCOPES.consultationBallot,
          targetId: electionId,
          payload: await ballotIntentPayload(electionId, receipt),
        });
        setSignature(
          envelope
            ? { status: 'verified', fingerprint: `${envelope.publicKey.slice(0, 12)}...${envelope.publicKey.slice(-12)}`, signedAt: envelope.clientCreatedAt }
            : NONE,
        );
      } finally {
        setSigning(false);
      }
    },
    [electionId, profile],
  );

  return { signature, signing, signBallot };
}
