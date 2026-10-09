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
