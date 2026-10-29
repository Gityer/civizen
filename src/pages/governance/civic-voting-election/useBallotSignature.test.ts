import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SignatureSummary } from '@/lib/governance-intents';
import { useBallotSignature } from './useBallotSignature';

const intents = vi.hoisted(() => ({
  recordSignedIntent: vi.fn(),
  signatureSummaryFor: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/lib/governance-intents', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/governance-intents')>()),
  recordSignedIntent: intents.recordSignedIntent,
  signatureSummaryFor: intents.signatureSummaryFor,
}));

const PROFILE = { id: 'p1' };
const ENVELOPE = { publicKey: 'A'.repeat(40), clientCreatedAt: '2026-10-27T00:00:00.000Z' };
const UNSIGNED: SignatureSummary = { status: 'unsigned', fingerprint: null, signedAt: null };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useBallotSignature', () => {
  beforeEach(() => {
    intents.recordSignedIntent.mockReset();
    intents.signatureSummaryFor.mockReset();
  });

  it('keeps the fresh signature when a slower stored-signature read comes back after it', async () => {
    // the read issued before the envelope was stored answers late with "nothing stored"
    const lateRead = deferred<SignatureSummary>();
    intents.signatureSummaryFor.mockReturnValue(lateRead.promise);
    intents.recordSignedIntent.mockResolvedValue(ENVELOPE);

    const { result, rerender } = renderHook(({ receipt }) => useBallotSignature('e1', PROFILE, receipt), {
      initialProps: { receipt: null as string | null },
    });
    // a cast: signBallot starts, then the new receipt renders (castConsultation's order)
    let signing!: Promise<void>;
    act(() => {
      signing = result.current.signBallot('RCPT');
    });
    rerender({ receipt: 'RCPT' });
    await act(async () => {
      await signing;
    });
    expect(result.current.signature.status).toBe('verified');

    await act(async () => {
      lateRead.resolve(UNSIGNED);
      await lateRead.promise;
    });
    expect(result.current.signature.status).toBe('verified');
  });

  it('on load, checks the stored envelope against this receipt', async () => {
    intents.signatureSummaryFor.mockResolvedValue({ status: 'verified', fingerprint: 'f', signedAt: 's' });
    const { result } = renderHook(() => useBallotSignature('e1', PROFILE, 'RCPT'));
    await waitFor(() => expect(result.current.signature.status).toBe('verified'));
    const matches = intents.signatureSummaryFor.mock.calls[0][4] as (payload: Record<string, unknown>) => boolean;
    expect(matches).toBeTypeOf('function');
    expect(matches({ election_id: 'e1', receipt_sha256: 'not-this-receipt' })).toBe(false);
  });

  it('drops a signing result for a ballot withdrawn while it was signing', async () => {
    const slowSign = deferred<typeof ENVELOPE>();
    intents.recordSignedIntent.mockReturnValue(slowSign.promise);
    intents.signatureSummaryFor.mockResolvedValue(UNSIGNED);

    const { result, rerender } = renderHook(({ receipt }) => useBallotSignature('e1', PROFILE, receipt), {
      initialProps: { receipt: null as string | null },
    });
    let signing!: Promise<void>;
    act(() => {
      signing = result.current.signBallot('RCPT');
    });
    rerender({ receipt: 'RCPT' });
    rerender({ receipt: null }); // withdrawn
    await act(async () => {
      slowSign.resolve(ENVELOPE);
      await signing;
    });
    expect(result.current.signature.status).toBe('unsigned');
  });
});
