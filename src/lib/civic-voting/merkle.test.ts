import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));

import { sha256Hex } from '@/lib/civic-voting/transparency';
import { parseReceiptProof, shortHash, verifyReceiptProof } from './merkle';

async function root(receipts: string[]): Promise<{ root: string; leaves: string[] }> {
  const leaves = await Promise.all([...receipts].sort().map((r) => sha256Hex(r)));
  let level = leaves;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(await sha256Hex(level[i] + (level[i + 1] ?? level[i])));
    level = next;
  }
  return { root: level[0], leaves };
}

describe('consultation merkle proofs', () => {
  it('verifies a correct proof and rejects a tampered one (same construction as the SQL functions)', async () => {
    const receipts = ['r-charlie', 'r-alpha', 'r-bravo', 'r-delta', 'r-echo'];
    const { root: expectedRoot, leaves } = await root(receipts);
    // proof for r-charlie: sorted index 2 → sibling r-delta (right), then pair (01)(23)(44): index 1 → sibling index 0 (left), then index 0 → sibling index 1 (right)
    const l01 = await sha256Hex(leaves[0] + leaves[1]);
    const l23 = await sha256Hex(leaves[2] + leaves[3]);
    const l44 = await sha256Hex(leaves[4] + leaves[4]);
    const m0 = await sha256Hex(l01 + l23);
    const m1 = await sha256Hex(l44 + l44);
    const proof = parseReceiptProof({
      included: true, root: expectedRoot, leaf: leaves[2], index: 2, count: 5,
      path: [{ hash: leaves[3], side: 'right' }, { hash: l01, side: 'left' }, { hash: m1, side: 'right' }],
    });
    expect(proof).not.toBeNull();
    expect(await sha256Hex(m0 + m1)).toBe(expectedRoot);
    expect(await verifyReceiptProof('r-charlie', proof!)).toBe(true);
    expect(await verifyReceiptProof('r-alpha', proof!)).toBe(false);
    expect(await verifyReceiptProof('r-charlie', { ...proof!, root: 'f'.repeat(64) })).toBe(false);
    expect(await verifyReceiptProof('r-charlie', { ...proof!, included: false })).toBe(false);
  });

  it('parses and shortens', () => {
    expect(parseReceiptProof({ included: false, root: 'ab', leaf: 'cd' })).toEqual({ included: false, root: 'ab', leaf: 'cd', index: undefined, count: undefined, path: undefined });
    expect(parseReceiptProof(null)).toBeNull();
    expect(shortHash('0123456789abcdef0123456789abcdef')).toBe('01234567…89abcdef');
  });
});
