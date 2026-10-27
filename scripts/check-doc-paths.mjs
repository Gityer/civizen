#!/usr/bin/env node
/**
 * Docs follow the app (AyMe job jafe649b7). Fails when a current doc names an app route or a repository file that
 * no longer exists, and prints the file, the line and the nearest real path.
 *
 * Checked: inline-code app routes such as `/governance/voting` (against the <Route path="..."> list in
 * src/app-routes/) and inline-code repository paths such as `src/lib/x.ts`, `scripts/y.sh`, `supabase/...`,
 * `docs/...`, `e2e/...`, `public/...` (against the file system).
 * Scope: docs that describe the current app (operations, assistant, product design) and README.md. Vision,
 * architecture and research docs name planned routes and files on purpose and are not checked.
 * Skipped: docs/archive, dated history files (*-YYYY-MM-DD.md, plans and baselines record the state of their day),
 * and lines marked with `docs-check: ignore`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCOPES = ['docs/04-operations', 'docs/assistant', 'docs/03-platform/product-design'];
const ROUTE_FILES = ['src/app-routes/app-routes-1.tsx', 'src/app-routes/app-routes-2.tsx', 'src/pages/happiness/happiness-app-routes.tsx'];
const REPO_PREFIXES = ['src/', 'scripts/', 'supabase/', 'docs/', 'e2e/', 'public/', 'native/', '.github/'];
// Created by the build and release scripts, not carried by git: present on a maintainer's machine, absent in a
// clean checkout (CI), so existence on disk says nothing about whether the doc is current.
const GENERATED = ['public/downloads/', 'public/updates/bundles/', 'dist/'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'archive') continue;
      walk(full, out);
    } else if (name.endsWith('.md') && !/-\d{4}-\d{2}-\d{2}(\.[a-z]{2})?\.md$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/** Route paths, with nested child routes (relative paths inside an open parent <Route>) joined to their parent. */
function routePatterns() {
  const patterns = [];
  for (const file of ROUTE_FILES) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    const stack = [];
    for (const m of text.matchAll(/<Route[\s>]|<\/Route>/g)) {
      if (m[0] === '</Route>') { stack.pop(); continue; }
      // The opening tag ends at the first `>` outside JSX braces (element={<X />} holds its own `>`).
      let depth = 0;
      let end = m.index + 6;
      for (; end < text.length; end += 1) {
        const ch = text[end];
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        else if (ch === '>' && depth === 0) break;
      }
      const tag = text.slice(m.index, end + 1);
      const selfClosing = text[end - 1] === '/';
      const pathMatch = tag.match(/\spath="([^"]+)"/);
      const own = pathMatch ? pathMatch[1] : '';
      const parent = stack.length ? stack[stack.length - 1] : '';
      const full = own.startsWith('/') ? own : `${parent.replace(/\/+$/, '')}/${own}`.replace(/\/+/g, '/');
      if (own) patterns.push(full);
      if (!selfClosing) stack.push(own ? full : parent);
    }
  }
  return patterns;
}

function routeMatches(path, pattern) {
  if (pattern === '*') return false;
  const a = path.replace(/\/+$/, '').split('/');
  const b = pattern.replace(/\/+$/, '').split('/');
  if (b[b.length - 1] === '*') return a.length >= b.length - 1 && b.slice(0, -1).every((seg, i) => seg.startsWith(':') || seg === a[i]);
  return a.length === b.length && b.every((seg, i) => seg.startsWith(':') || seg === a[i]);
}

function nearest(target, candidates) {
  let best = null;
  let bestScore = -1;
  const parts = target.split('/');
  for (const c of candidates) {
    const cp = c.split('/');
    let score = 0;
    while (score < parts.length && score < cp.length && (parts[score] === cp[score] || cp[score].startsWith(':'))) score += 1;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

const routes = routePatterns();
const problems = [];
const files = [...SCOPES.flatMap((dir) => walk(join(ROOT, dir))), join(ROOT, 'README.md')];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (line.includes('docs-check: ignore')) return;
    for (const m of line.matchAll(/`([^`\s]+)`/g)) {
      // Struck-through paths (~~`old/path`~~) record what was removed.
      if (line.slice(Math.max(0, m.index - 2), m.index) === '~~') continue;
      const token = m[1].replace(/[),.;:]+$/, '');
      if (/^\/[a-z][a-z0-9-]*(\/[a-z0-9:_<>{}*-]+)*\/?$/i.test(token) && !token.includes('<') && !token.includes('{')) {
        const clean = token.split('?')[0].split('#')[0];
        if (clean.startsWith('/api/') || clean.startsWith('/rest/') || clean.startsWith('/functions/') || clean.startsWith('/auth/') || clean.startsWith('/assets/') || clean.startsWith('/geo/') || clean.startsWith('/updates/') || clean.startsWith('/downloads/') || /\.[a-z0-9]+$/i.test(clean) || clean.startsWith('/src/') || clean.startsWith('/home/') || clean.startsWith('/tmp/') || clean.startsWith('/etc/') || clean.startsWith('/usr/') || clean.startsWith('/var/') || clean.startsWith('/opt/')) continue;
        // A trailing wildcard (`/about/*`, `/settings/admin/funding-*`) names a family: one real route with that prefix is enough.
        const family = clean.endsWith('*') ? clean.slice(0, -1) : null;
        const exists = family ? routes.some((p) => p.startsWith(family) && p !== family.replace(/\/$/, '')) : routes.some((p) => routeMatches(clean, p));
        if (!exists) {
          problems.push(`${relative(ROOT, file)}:${i + 1}: route ${clean} does not exist (nearest: ${nearest(clean, routes)})`);
        }
      } else if (REPO_PREFIXES.some((p) => token.startsWith(p)) && !/[*<>{}$]/.test(token)) {
        const path = token.split('#')[0].replace(/:\d+(-\d+)?$/, '');
        if (GENERATED.some((g) => `${path}/`.startsWith(g))) continue;
        if (!existsSync(join(ROOT, path))) {
          problems.push(`${relative(ROOT, file)}:${i + 1}: file ${path} does not exist`);
        }
      }
    }
  });
}

if (problems.length) {
  console.error(`Docs name ${problems.length} route(s) or file(s) that no longer exist:\n${problems.join('\n')}`);
  console.error('\nFix the doc in the same commit as the change, or mark a line that names an old path on purpose with "docs-check: ignore".');
  process.exit(1);
}
console.log('Docs paths check passed.');
