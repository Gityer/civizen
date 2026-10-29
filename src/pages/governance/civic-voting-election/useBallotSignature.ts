import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { INTENT_SCOPES, ballotIntentPayload, recordSignedIntent, signatureSummaryFor, type SignatureSummary, type SignerProfile } from '@/lib/governance-intents';

const NONE: SignatureSummary = { status: 'unsigned', fingerprint: null, signedAt: null };

/**
 * The voter's signature over their own ballot (Phase 10 step 10.2): after a cast, the device signs
 * {election, sha256(receipt)} with the citizen key and stores the envelope; on load, the latest envelope for this
 * election and voter is verified here. Everything is best effort and never blocks the ballot itself.
 *
 * A cast calls `signBallot` before the new receipt re-renders, so the load for that receipt is skipped: it would race
 * the signing and could land after it with the pre-insert answer, turning `verified` back into `unsigned`.
 */
export function useBallotSignature(electionId: string, profile: SignerProfile | null | undefined, myReceipt: string | null) {
  const [signature, setSignature] = useState<SignatureSummary>(NONE);
  const [signing, setSigning] = useState(false);
  /** The receipt this device is signing (or signed) in this session; its status comes from `signBallot`. */
  const signedHere = useRef<string | null>(null);
  const currentReceipt = useRef(myReceipt);
  currentReceipt.current = myReceipt;

  useEffect(() => {
    if (!electionId || !profile?.id || !myReceipt) {
      setSignature(NONE);
      return;
    }
    if (signedHere.current === myReceipt) return;
    let active = true;
    void (async () => {
      let summary: SignatureSummary;
      try {
        const { receipt_sha256: expected } = await ballotIntentPayload(electionId, myReceipt);
        summary = await signatureSummaryFor(
          supabase,
          INTENT_SCOPES.consultationBallot,
          electionId,
          profile.id,
          (payload) => payload.receipt_sha256 === expected,
        );
      } catch {
        summary = { status: 'unavailable', fingerprint: null, signedAt: null };
      }
      if (active) setSignature(summary);
    })();
    return () => {
      active = false;
    };
  }, [electionId, profile?.id, myReceipt]);

  /** Called right after a successful cast with the fresh receipt. */
  const signBallot = useCallback(
    async (receipt: string) => {
      if (!electionId || !profile?.id || !receipt) return;
      signedHere.current = receipt;
      setSigning(true);
      try {
        const envelope = await recordSignedIntent(supabase, {
          profile,
          scope: INTENT_SCOPES.consultationBallot,
          targetId: electionId,
          payload: await ballotIntentPayload(electionId, receipt),
        });
        // withdrawn or recast while signing: this result no longer describes the ballot on screen
        if (currentReceipt.current !== receipt) return;
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
