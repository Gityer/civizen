import {
  CITIZEN_SIGNING_ALGORITHM,
  formatCitizenSigningFingerprint,
  generateCitizenSigningKey,
  readStoredCitizenSigningKey,
  signGovernanceIntent,
  storeCitizenSigningKey,
  verifyGovernanceIntentSignature,
  type GovernanceIntentEnvelope,
  type StoredCitizenSigningKey,
} from './governance-signing';
import { sha256Hex } from './civic-voting/transparency';

/**
 * Signed governance events (Phase 10 step 10.2). A member's device holds an ECDSA P-256 citizen key; its public
 * half is registered on the profile. Ballots and proposals are signed with it and the envelope is stored in
 * `governance_action_intents`, so a reader can check on their own device that the action was authorised by the
 * member's key and not written by the server alone. Signing is best effort: an action never fails because a
 * signature could not be stored, and the status shown is honest about that.
 */
export const INTENT_SCOPES = {
  consultationBallot: 'consultation_ballot',
  votingProposalCreate: 'voting_proposal_create',
  votingProposalPublish: 'voting_proposal_publish',
} as const;

export type IntentScope = (typeof INTENT_SCOPES)[keyof typeof INTENT_SCOPES];

export type IntentRow = {
  id: string;
  actor_id: string;
  action_scope: string;
  target_id: string | null;
  payload: Record<string, unknown>;
  payload_hash: string;
  signature: string;
  public_key: string;
  key_algorithm: string;
  client_created_at: string;
  created_at: string;
};

export type SignatureStatus = 'verified' | 'invalid' | 'unsigned' | 'unavailable';

export type SignatureSummary = { status: SignatureStatus; fingerprint: string | null; signedAt: string | null };

export type SignerProfile = { id: string; citizen_signing_public_key?: string | null };

/** The subset of the Supabase client these helpers use; typed loosely so tests can pass a fake. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IntentClient = { from: (table: string) => any };

/** A ballot intent binds the voter to the receipt without disclosing the choice; the voter can later reveal the receipt. */
export async function ballotIntentPayload(electionId: string, receipt: string): Promise<Record<string, unknown>> {
  return { election_id: electionId, receipt_sha256: await sha256Hex(receipt) };
}

export function proposalIntentPayload(proposalId: string, title: string, matterId?: string | null): Record<string, unknown> {
  return { proposal_id: proposalId, title, matter_id: matterId ?? null };
}

/**
 * The key this device signs with: the stored one when it is the registered one, otherwise a fresh key that is
 * registered on the profile (a member who signs from a new device rotates to that device's key; earlier
 * envelopes stay verifiable because they carry the key they were signed with). Null when registration fails.
 */
export async function ensureCitizenSigningKey(client: IntentClient, profile: SignerProfile): Promise<StoredCitizenSigningKey | null> {
  const registered = profile.citizen_signing_public_key ?? null;
  let key = readStoredCitizenSigningKey(profile.id);
  if (key && registered === key.publicKey) return key;
  if (!key) {
    key = await generateCitizenSigningKey();
    storeCitizenSigningKey(profile.id, key);
  }
  const { error } = await client
    .from('profiles')
    .update({
      citizen_signing_public_key: key.publicKey,
      citizen_signing_key_algorithm: key.algorithm,
      citizen_signing_key_registered_at: key.createdAt,
    })
    .eq('id', profile.id);
  if (error) {
    console.warn('[governance-intents] could not register the citizen key', error);
    return null;
  }
  return key;
}

/** Signs and stores an intent; returns the envelope, or null when the device could not sign or the store refused. */
export async function recordSignedIntent(
  client: IntentClient,
  input: { profile: SignerProfile; scope: IntentScope; targetId: string; payload: Record<string, unknown> },
): Promise<GovernanceIntentEnvelope | null> {
  try {
    const key = await ensureCitizenSigningKey(client, input.profile);
    if (!key) return null;
    const envelope = await signGovernanceIntent(
      { actorProfileId: input.profile.id, actionScope: input.scope, targetId: input.targetId, payload: input.payload },
      key,
    );
    const { error } = await client.from('governance_action_intents').insert({
      actor_id: envelope.actorProfileId,
      action_scope: envelope.actionScope,
      target_id: envelope.targetId ?? null,
      payload: envelope.payload,
      payload_hash: envelope.payloadHash,
      signature: envelope.signature,
      public_key: envelope.publicKey,
      key_algorithm: envelope.algorithm,
      client_created_at: envelope.clientCreatedAt,
    });
    if (error) {
      console.warn('[governance-intents] could not store the signed intent', error);
      return null;
    }
    return envelope;
  } catch (error) {
    console.warn('[governance-intents] signing failed', error);
    return null;
  }
}

export async function fetchLatestIntent(client: IntentClient, scope: IntentScope, targetId: string, actorId?: string | null): Promise<IntentRow | null> {
  let query = client
    .from('governance_action_intents')
    .select('id, actor_id, action_scope, target_id, payload, payload_hash, signature, public_key, key_algorithm, client_created_at, created_at')
    .eq('action_scope', scope)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (actorId) query = query.eq('actor_id', actorId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return (data as IntentRow | null) ?? null;
}

export function envelopeFromRow(row: IntentRow): GovernanceIntentEnvelope {
  return {
    actorProfileId: row.actor_id,
    actionScope: row.action_scope,
    targetId: row.target_id,
    payload: row.payload,
    clientCreatedAt: row.client_created_at,
    algorithm: CITIZEN_SIGNING_ALGORITHM,
    publicKey: row.public_key,
    payloadHash: row.payload_hash,
    signature: row.signature,
  };
}

/** Verifies a stored envelope on this device. */
export async function verifyIntentRow(row: IntentRow): Promise<SignatureStatus> {
  if (row.key_algorithm !== CITIZEN_SIGNING_ALGORITHM) return 'invalid';
  try {
    return (await verifyGovernanceIntentSignature(envelopeFromRow(row))) ? 'verified' : 'invalid';
  } catch {
    return 'invalid';
  }
}

/** Reads the latest intent for an action and verifies it here; `unavailable` when the store could not be read. */
export async function signatureSummaryFor(client: IntentClient, scope: IntentScope, targetId: string, actorId?: string | null): Promise<SignatureSummary> {
  try {
    const row = await fetchLatestIntent(client, scope, targetId, actorId);
    if (!row) return { status: 'unsigned', fingerprint: null, signedAt: null };
    return { status: await verifyIntentRow(row), fingerprint: formatCitizenSigningFingerprint(row.public_key), signedAt: row.client_created_at };
  } catch {
    return { status: 'unavailable', fingerprint: null, signedAt: null };
  }
}
