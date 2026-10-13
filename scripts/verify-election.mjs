#!/usr/bin/env node
// Independently recompute a Civizen consultation's Merkle root (v2 plan step C4). Node.js 18 or later.
//
// Offline, from the file downloaded on the election's "Verify this election" page (no account, no key):
//   node scripts/verify-election.mjs --file civizen-election-<id>-receipts.json [--root <published root>]
//
// Online, straight from the public API (the URL and the public "anon" key the website uses):
//   CIVIZEN_SUPABASE_URL=https://... CIVIZEN_ANON_KEY=... node scripts/verify-election.mjs <election id>
//
// Algorithm (same as the database function civic_merkle_root_for): receipts sorted, leaf = sha256(receipt),
// node = sha256(left_hex || right_hex), an odd last node pairs with itself, no receipts gives sha256('').
// Exit code 0 when the recomputed root equals the published one, 1 when it differs, 2 on usage errors.

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

export function merkleRoot(receipts) {
  let level = [...receipts].sort().map((receipt) => sha256(receipt));
  if (level.length === 0) return sha256('');
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(sha256(level[i] + (level[i + 1] ?? level[i])));
    level = next;
  }
  return level[0];
}

async function rpc(name, args) {
  const url = process.env.CIVIZEN_SUPABASE_URL;
  const key = process.env.CIVIZEN_ANON_KEY;
  if (!url || !key) throw new Error('Set CIVIZEN_SUPABASE_URL and CIVIZEN_ANON_KEY, or use --file.');
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  return response.json();
}

async function main(argv) {
  const fileIndex = argv.indexOf('--file');
  const rootIndex = argv.indexOf('--root');
  let receipts;
  let published = rootIndex >= 0 ? argv[rootIndex + 1] : null;
  let label;

  if (fileIndex >= 0) {
    const data = JSON.parse(await readFile(argv[fileIndex + 1], 'utf8'));
    receipts = data.receipts;
    published = published ?? data.merkle_root ?? null;
    label = data.election_id ?? argv[fileIndex + 1];
  } else if (argv[0] && !argv[0].startsWith('--')) {
    label = argv[0];
    receipts = (await rpc('civic_election_receipts', { p_election_id: label })).map((row) => row.receipt);
    published = published ?? (await rpc('civic_election_merkle_root', { p_election_id: label }));
  } else {
    console.error('Usage: verify-election.mjs --file <receipts.json> [--root <hex>] | <election id>');
    return 2;
  }

  if (!Array.isArray(receipts) || receipts.some((receipt) => typeof receipt !== 'string')) {
    console.error('The receipts must be a list of strings.');
    return 2;
  }
  const computed = merkleRoot(receipts);
  console.log(`election:   ${label}`);
  console.log(`receipts:   ${receipts.length}`);
  console.log(`computed:   ${computed}`);
  console.log(`published:  ${published ?? '(none given)'}`);
  if (!published) return 2;
  const ok = computed === published;
  console.log(ok ? 'MATCH: the published root is exactly the root of these receipts.' : 'MISMATCH: the roots differ.');
  return ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(2);
    },
  );
}
