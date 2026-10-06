#!/usr/bin/env npx tsx
/**
 * Generate Nela's searchable knowledge pack and edge-function bundle.
 * Usage:
 *   npx tsx scripts/assistant-knowledge.ts
 *   npx tsx scripts/assistant-knowledge.ts --check
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ANDROID_VERSION_CODE, APP_RELEASE_ID, APP_VERSION } from '../src/lib/app-release.ts';
import { ASSISTANT_ALIASES, ASSISTANT_CAPABILITIES, ASSISTANT_FAQ } from '../src/lib/assistant/catalog.ts';
import { INDEXED_SOURCES, KNOWLEDGE_FORMAT, SOURCE_PRIORITY } from '../src/lib/assistant/sources.ts';
import { IDENTITY_FAQ_IDS, isIdentitySourcePath } from '../src/lib/assistant/identity.ts';
import { validateAssistantCatalog } from '../src/lib/assistant/validate.ts';
import type {
  AssistantCapabilityStatus,
  KnowledgeChunk,
  KnowledgePack,
} from '../src/lib/assistant/types.ts';
import { AGREEMENT_TYPES } from '../src/lib/agreements-model.ts';
import { APP_ROLES } from '../src/lib/access-control.ts';
import { CONTRIBUTE_LANES } from '../src/lib/contribute-lanes.ts';
import { MAIN_NAV_ITEMS } from '../src/lib/main-nav.ts';
import { NELA_PAGE_LINKS } from '../src/lib/nela-nav-paths.ts';
import { LUMA_PROTOTYPE_NOTICE } from '../src/lib/prototype-credits.ts';
import { listCurrentAreas } from '../src/lib/classification/registry.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packPath = resolve(root, 'src/lib/assistant/generated/knowledge-pack.ts');
const bundlePath = resolve(root, 'supabase/functions/messaging-agent-reply/nela-bundle.js');
const checkOnly = process.argv.includes('--check');

function fail(message: string): never {
  console.error(`assistant:knowledge FAIL: ${message}`);
  process.exit(1);
}

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

function stripFrontMatter(raw: string): { body: string; status?: AssistantCapabilityStatus } {
  if (!raw.startsWith('---')) return { body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return { body: raw };
  const fm = raw.slice(0, end);
  const body = raw.slice(end + 4).replace(/^\s+/, '');
  let status: AssistantCapabilityStatus | undefined;
  if (/review_status:\s*superseded/i.test(fm) || /status:\s*(superseded|historical)/i.test(fm)) {
    status = 'historical';
  } else if (/status:\s*current/i.test(fm)) {
    status = 'implemented';
  } else if (/status:\s*draft/i.test(fm)) {
    status = 'proposed';
  }
  return { body, status };
}

function chunkMarkdown(path: string, raw: string, priority: KnowledgeChunk['priority'], forced?: AssistantCapabilityStatus): KnowledgeChunk[] {
  const { body, status } = stripFrontMatter(raw);
  const resolvedStatus = forced ?? status ?? 'implemented';
  const sections = body.split(/\n(?=##\s+)/).map((s) => s.trim()).filter(Boolean);
  const chunks: KnowledgeChunk[] = [];
  let idx = 0;
  for (const section of sections.slice(0, 12)) {
    const titleMatch = section.match(/^#+\s+(.+)/);
    const title = titleMatch?.[1]?.trim() || path;
    const pieces: string[] = [];
    if (section.length <= 900) pieces.push(section);
    else {
      const paras = section.split(/\n\n+/);
      let buf = '';
      for (const para of paras) {
        if ((buf + '\n\n' + para).length > 850 && buf) {
          pieces.push(buf);
          buf = para;
        } else {
          buf = buf ? `${buf}\n\n${para}` : para;
        }
      }
      if (buf) pieces.push(buf);
    }
    for (const piece of pieces.slice(0, 3)) {
      const text = piece.replace(/\s+/g, ' ').trim();
      if (text.length < 40) continue;
      chunks.push({
        id: `${path}#${idx}`,
        title,
        path,
        text: text.slice(0, 1200),
        status: resolvedStatus,
        priority,
        kind: isIdentitySourcePath(path)
          ? 'identity'
          : path.includes('civizen-assistant-cheatsheet')
            ? 'cheatsheet'
            : 'doc',
      });
      idx += 1;
      if (chunks.length >= 14) return chunks;
    }
  }
  return chunks;
}

function structuredChunks(): KnowledgeChunk[] {
  const areas = listCurrentAreas().map((n) => n.displayName || n.shortName).join(', ');
  const lanes = CONTRIBUTE_LANES.map((l) => `${l.id} → ${l.path}${l.placeholder ? ' (placeholder)' : ''}`).join('; ');
  const nav = MAIN_NAV_ITEMS.map((i) => i.path).join(', ');
  return [
    {
      id: 'registry:nav',
      title: 'Primary navigation',
      path: 'src/lib/main-nav.ts',
      text: `Current bottom navigation paths: ${nav}.`,
      status: 'implemented',
      priority: SOURCE_PRIORITY.runtimeStructured,
      kind: 'registry',
    },
    {
      id: 'registry:civi-pages',
      title: 'Pages Civi can open',
      path: 'src/lib/nela-nav-paths.ts',
      text: `Civi can link these live pages in answers: ${NELA_PAGE_LINKS.map((page) => `${page.label} (${page.href})`).join('; ')}.`,
      status: 'implemented',
      priority: SOURCE_PRIORITY.runtimeStructured,
      kind: 'registry',
    },
    {
      id: 'registry:roles',
      title: 'App roles',
      path: 'src/lib/access-control.ts',
      text: `Current app roles: ${APP_ROLES.join(', ')}. Members have agreements.create.`,
      status: 'implemented',
      priority: SOURCE_PRIORITY.schemaPermissions,
      kind: 'registry',
    },
    {
      id: 'registry:contribute-lanes',
      title: 'Contribute lanes',
      path: 'src/lib/contribute-lanes.ts',
      text: `Contribute lanes: ${lanes}.`,
      status: 'implemented',
      priority: SOURCE_PRIORITY.featureRegistry,
      kind: 'registry',
    },
    {
      id: 'registry:areas',
      title: 'Foundational Areas',
      path: 'src/lib/classification/registry.ts',
      text: `Current foundational Areas: ${areas}.`,
      status: 'implemented',
      priority: SOURCE_PRIORITY.runtimeStructured,
      kind: 'registry',
    },
    {
      id: 'registry:agreement-types',
      title: 'Agreement types',
      path: 'src/lib/agreements-model.ts',
      text: `Implemented agreement types: ${AGREEMENT_TYPES.join(', ')}. Native electronic signing and paper/external execution are supported.`,
      status: 'implemented',
      priority: SOURCE_PRIORITY.runtimeStructured,
      kind: 'registry',
    },
    {
      id: 'registry:luma',
      title: 'Prototype credits',
      path: 'src/lib/prototype-credits.ts',
      text: LUMA_PROTOTYPE_NOTICE,
      status: 'experimental',
      priority: SOURCE_PRIORITY.featureRegistry,
      kind: 'registry',
    },
  ];
}

function catalogChunks(): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];
  for (const cap of ASSISTANT_CAPABILITIES) {
    chunks.push({
      id: `capability:${cap.id}`,
      title: cap.name,
      path: 'src/lib/assistant/catalog.ts',
      text: `${cap.name} status=${cap.status}. ${cap.description} ${cap.howTo ?? ''} Routes: ${cap.routes.join(', ')}.`,
      status: cap.status,
      priority: SOURCE_PRIORITY.featureRegistry,
      kind: 'capability',
    });
  }
  for (const faq of ASSISTANT_FAQ) {
    chunks.push({
      id: `faq:${faq.id}`,
      title: faq.question,
      path: 'src/lib/assistant/catalog.ts',
      text: `Q: ${faq.question} A: ${faq.answer}`,
      status: 'implemented',
      priority: IDENTITY_FAQ_IDS.has(faq.id) ? SOURCE_PRIORITY.identityCanonical : SOURCE_PRIORITY.cheatSheet,
      kind: 'faq',
    });
  }
  return chunks;
}

function fingerprint(parts: string[]): string {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part);
  return hash.digest('hex');
}

function sourceParts(): string[] {
  const parts = [
    `app:${APP_VERSION}:${APP_RELEASE_ID}:${ANDROID_VERSION_CODE}`,
    JSON.stringify(ASSISTANT_CAPABILITIES),
    JSON.stringify(ASSISTANT_FAQ),
    JSON.stringify(ASSISTANT_ALIASES),
    JSON.stringify(INDEXED_SOURCES),
  ];
  for (const source of INDEXED_SOURCES) {
    const abs = resolve(root, source.path);
    parts.push(`${source.path}\n${readFileSync(abs, 'utf8')}`);
  }
  parts.push(readFileSync(resolve(root, 'src/App.tsx'), 'utf8'));
  for (const file of readdirSync(resolve(root, 'src/app-routes')).sort()) {
    parts.push(readFileSync(resolve(root, 'src/app-routes', file), 'utf8'));
  }
  parts.push(readFileSync(resolve(root, 'src/pages/happiness/happiness-app-routes.tsx'), 'utf8'));
  parts.push(readFileSync(resolve(root, 'src/lib/contribute-lanes.ts'), 'utf8'));
  parts.push(readFileSync(resolve(root, 'src/lib/agreements-model.ts'), 'utf8'));
  parts.push(readFileSync(resolve(root, 'src/lib/prototype-credits.ts'), 'utf8'));
  parts.push(readFileSync(resolve(root, 'src/lib/main-nav.ts'), 'utf8'));
  return parts;
}

function emitPackFile(pack: KnowledgePack): string {
  return `/** Generated by \`npm run assistant:knowledge\`. Do not edit. */
import type { KnowledgePack } from '../types';

export const KNOWLEDGE_PACK: KnowledgePack = ${JSON.stringify(pack, null, 2)};
`;
}

async function bundleEdge(): Promise<void> {
  const esbuild = await import('esbuild');
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: ['src/lib/assistant/edge-entry.ts'],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile: bundlePath,
    legalComments: 'none',
    logLevel: 'silent',
  });
}

const issues = validateAssistantCatalog();
if (issues.length) {
  for (const issue of issues) console.error(`  ${issue.code}: ${issue.message}`);
  fail(`${issues.length} validation issue(s)`);
}

const chunks: KnowledgeChunk[] = [...catalogChunks(), ...structuredChunks()];
for (const source of INDEXED_SOURCES) {
  const abs = resolve(root, source.path);
  if (!existsSync(abs)) fail(`missing source ${source.path}`);
  chunks.push(...chunkMarkdown(source.path, readFileSync(abs, 'utf8'), source.priority, source.status));
}

const sourceFingerprint = fingerprint(sourceParts());
const pack: KnowledgePack = {
  meta: {
    appVersion: APP_VERSION,
    appReleaseId: APP_RELEASE_ID,
    androidVersionCode: ANDROID_VERSION_CODE,
    gitSha: gitSha(),
    generatedAt: new Date().toISOString(),
    sourceFingerprint,
    knowledgeFormat: KNOWLEDGE_FORMAT,
    sourceCount: INDEXED_SOURCES.length,
    chunkCount: chunks.length,
  },
  capabilities: ASSISTANT_CAPABILITIES,
  faq: ASSISTANT_FAQ,
  aliases: ASSISTANT_ALIASES,
  chunks,
};

if (checkOnly) {
  if (!existsSync(packPath) || !existsSync(bundlePath)) {
    fail('generated knowledge pack or nela-bundle.js missing; run npm run assistant:knowledge');
  }
  const current = readFileSync(packPath, 'utf8');
  const match = current.match(/"sourceFingerprint": "([a-f0-9]+)"/);
  if (!match || match[1] !== sourceFingerprint) {
    fail('knowledge pack is stale; run npm run assistant:knowledge');
  }
  const bundle = readFileSync(bundlePath, 'utf8');
  if (!bundle.includes(sourceFingerprint)) {
    fail('nela-bundle.js does not contain current knowledge fingerprint; run npm run assistant:knowledge');
  }
  console.log(`assistant:knowledge OK (${chunks.length} chunks, ${APP_VERSION})`);
  process.exit(0);
}

mkdirSync(dirname(packPath), { recursive: true });
writeFileSync(packPath, emitPackFile(pack));
await bundleEdge();
console.log(`assistant:knowledge wrote ${chunks.length} chunks for ${APP_VERSION} → ${packPath}`);
console.log(`assistant:knowledge bundled ${bundlePath}`);
