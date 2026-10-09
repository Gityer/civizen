import { beforeEach, describe, expect, it } from 'vitest';
import {
  INTENT_SCOPES,
  ballotIntentPayload,
  ensureCitizenSigningKey,
  recordSignedIntent,
  signatureSummaryFor,
  verifyIntentRow,
  type IntentRow,
} from './governance-intents';
import { readStoredCitizenSigningKey } from './governance-signing';

/** A tiny in-memory stand-in for the two tables the helpers touch. */
function fakeClient() {
  const profiles: Record<string, Record<string, unknown>> = {};
  const intents: IntentRow[] = [];
  const client = {
    from(table: string) {
      if (table === 'profiles') {
        return {
          update(values: Record<string, unknown>) {
            return { eq: (_col: string, id: string) => { profiles[id] = { ...(profiles[id] ?? {}), ...values }; return Promise.resolve({ error: null }); } };
          },
        };
      }
      return {
        insert(row: Omit<IntentRow, 'id' | 'created_at'>) {
          intents.push({ ...row, id: `i${intents.length + 1}`, created_at: new Date().toISOString() });
          return Promise.resolve({ error: null });
        },
        select() {
          const filters: Array<[string, unknown]> = [];
          const q = {
            eq(col: string, value: unknown) { filters.push([col, value]); return q; },
            order() { return q; },
            limit() { return q; },
            maybeSingle() {
              const rows = intents.filter((r) => filters.every(([c, v]) => (r as Record<string, unknown>)[c] === v));
              return Promise.resolve({ data: rows[rows.length - 1] ?? null, error: null });
            },
          };
          return q;
        },
      };
    },
  };
  return { client, profiles, intents };
}

describe('signed governance intents', () => {
  beforeEach(() => window.localStorage.clear());

  it('binds a ballot to the receipt hash, not the receipt or the choice', async () => {
    const payload = await ballotIntentPayload('e1', 'ABCD-EFGH');
    expect(payload.election_id).toBe('e1');
    expect(String(payload.receipt_sha256)).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(payload)).not.toContain('ABCD');
  });

  it('generates and registers a key on first use, then reuses it', async () => {
    const { client, profiles } = fakeClient();
    const first = await ensureCitizenSigningKey(client, { id: 'p1', citizen_signing_public_key: null });
    expect(first).not.toBeNull();
    expect(profiles.p1?.citizen_signing_public_key).toBe(first!.publicKey);
    const second = await ensureCitizenSigningKey(client, { id: 'p1', citizen_signing_public_key: first!.publicKey });
    expect(second!.publicKey).toBe(first!.publicKey);
    expect(readStoredCitizenSigningKey('p1')!.publicKey).toBe(first!.publicKey);
  });

  it('signs an intent that verifies on another device and shows as unsigned when nothing was stored', async () => {
    const { client, intents } = fakeClient();
    const payload = await ballotIntentPayload('e1', 'RCPT');
    const envelope = await recordSignedIntent(client, { profile: { id: 'p1' }, scope: INTENT_SCOPES.consultationBallot, targetId: 'e1', payload });
    expect(envelope).not.toBeNull();
    expect(intents).toHaveLength(1);
    expect(await verifyIntentRow(intents[0])).toBe('verified');
    const summary = await signatureSummaryFor(client, INTENT_SCOPES.consultationBallot, 'e1', 'p1');
    expect(summary.status).toBe('verified');
    expect(summary.fingerprint).toContain('...');
    expect((await signatureSummaryFor(client, INTENT_SCOPES.consultationBallot, 'e2', 'p1')).status).toBe('unsigned');
  });

  it('rejects a tampered payload or signature', async () => {
    const { client, intents } = fakeClient();
    await recordSignedIntent(client, { profile: { id: 'p1' }, scope: INTENT_SCOPES.votingProposalPublish, targetId: 'v1', payload: { proposal_id: 'v1', title: 'A' } });
    const tamperedPayload: IntentRow = { ...intents[0], payload: { proposal_id: 'v1', title: 'B' } };
    expect(await verifyIntentRow(tamperedPayload)).toBe('invalid');
    const tamperedSignature: IntentRow = { ...intents[0], signature: intents[0].signature.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) };
    expect(await verifyIntentRow(tamperedSignature)).toBe('invalid');
    expect(await verifyIntentRow({ ...intents[0], key_algorithm: 'other' })).toBe('invalid');
  });

  it('reports unavailable when the store cannot be read', async () => {
    const broken = { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: 'down' } }) }), maybeSingle: () => Promise.resolve({ data: null, error: { message: 'down' } }) }) }) }) }) }) }) };
    expect((await signatureSummaryFor(broken, INTENT_SCOPES.consultationBallot, 'e1')).status).toBe('unavailable');
  });
});
