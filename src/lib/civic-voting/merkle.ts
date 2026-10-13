import { supabase } from '@/integrations/supabase/client';
import { sha256Hex } from '@/lib/civic-voting/transparency';

/** Inclusion proof as served by civic_election_receipt_proof (Phase 10 step 10.1). */
export type ReceiptProof = {
  included: boolean;
  root: string;
  leaf: string;
  index?: number;
  count?: number;
  path?: Array<{ hash: string; side: 'left' | 'right' }>;
};

export function parseReceiptProof(data: unknown): ReceiptProof | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  if (typeof row.root !== 'string' || typeof row.leaf !== 'string') return null;
  const path = Array.isArray(row.path)
    ? row.path
      .filter((step): step is Record<string, unknown> => Boolean(step) && typeof step === 'object')
      .map((step) => ({ hash: String(step.hash ?? ''), side: step.side === 'left' ? ('left' as const) : ('right' as const) }))
    : undefined;
  return {
    included: row.included === true,
    root: row.root,
    leaf: row.leaf,
    index: typeof row.index === 'number' ? row.index : undefined,
    count: typeof row.count === 'number' ? row.count : undefined,
    path,
  };
}

/**
 * Recomputes the root from the member's receipt and the proof path in the browser. Leaf = sha256(receipt);
 * node = sha256(left_hex || right_hex). True only when the recomputed root equals the published one.
 */
export async function verifyReceiptProof(receipt: string, proof: ReceiptProof): Promise<boolean> {
  if (!proof.included || !proof.path) return false;
  let running = await sha256Hex(receipt.trim());
  if (running !== proof.leaf) return false;
  for (const step of proof.path) {
    running = step.side === 'right' ? await sha256Hex(running + step.hash) : await sha256Hex(step.hash + running);
  }
  return running === proof.root;
}

export async function fetchReceiptProof(electionId: string, receipt: string): Promise<ReceiptProof | null> {
  const { data, error } = await supabase.rpc('civic_election_receipt_proof', { p_election_id: electionId, p_receipt: receipt });
  if (error) throw new Error(error.message);
  return parseReceiptProof(data);
}

export async function fetchMerkleRoot(electionId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('civic_election_merkle_root', { p_election_id: electionId });
  if (error || typeof data !== 'string') return null;
  return data;
}

export function shortHash(hash: string | null | undefined): string {
  if (!hash) return '';
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

/**
 * Recomputes an election's Merkle root from its public receipts, exactly as the server does
 * (`civic_merkle_root_for`): receipts sorted, leaf = sha256(receipt), node = sha256(left_hex || right_hex),
 * an odd last node pairs with itself, and no receipts gives sha256('').
 */
export async function computeMerkleRoot(receipts: string[]): Promise<string> {
  let level = await Promise.all([...receipts].sort().map((receipt) => sha256Hex(receipt)));
  if (level.length === 0) return sha256Hex('');
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(await sha256Hex(level[i] + (level[i + 1] ?? level[i])));
    }
    level = next;
  }
  return level[0];
}

export async function fetchElectionReceipts(electionId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('civic_election_receipts', { p_election_id: electionId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { receipt: string }) => row.receipt);
}

/** Where the ballot-box commitment sits in the public audit log (v2 step C4). */
export type ElectionAuditAnchor = {
  eventHash: string;
  committedRoot: string | null;
  committedCount: number | null;
  batchId: string | null;
  batchIndex: number | null;
  batchHash: string | null;
  anchorNetwork: string | null;
  anchorReference: string | null;
  anchoredAt: string | null;
};

export async function fetchElectionAuditAnchor(electionId: string): Promise<ElectionAuditAnchor | null> {
  const { data, error } = await supabase.rpc('civic_election_audit_anchor', { p_election_id: electionId });
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    eventHash: row.event_hash,
    committedRoot: row.committed_root ?? null,
    committedCount: row.committed_count ?? null,
    batchId: row.batch_id ?? null,
    batchIndex: row.batch_index ?? null,
    batchHash: row.batch_hash ?? null,
    anchorNetwork: row.anchor_network ?? null,
    anchorReference: row.anchor_reference ?? null,
    anchoredAt: row.anchored_at ?? null,
  };
}
