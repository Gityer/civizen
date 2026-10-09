#!/usr/bin/env node
// Bundles the English catalog and the supported language list for the language-pack edge function.
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const outfile = resolve(root, 'supabase/functions/language-pack/base-bundle.js');

await build({
  absWorkingDir: root,
  entryPoints: ['src/lib/i18n/edge-entry.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile,
  legalComments: 'none',
  logLevel: 'silent',
});
const digest = createHash('sha256').update(readFileSync(outfile)).digest('hex').slice(0, 16);
writeFileSync(resolve(root, 'supabase/functions/language-pack/base-version.txt'), `${digest}\n`);
console.log(`language-pack bundle written (${digest})`);
