import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { ASSISTANT_CAPABILITIES, ASSISTANT_FAQ } from './catalog';
import { INDEXED_SOURCES } from './sources';
import { ASSISTANT_CAPABILITY_STATUSES, type KnowledgePack } from './types';

export type KnowledgeValidationIssue = { code: string; message: string };

const APP_ROUTES_DIR = 'src/app-routes';

/** Route declarations live in App.tsx, the happiness routes, and the route modules under src/app-routes. */
function routeFiles(): string[] {
  const routeModules = existsSync(APP_ROUTES_DIR)
    ? readdirSync(APP_ROUTES_DIR)
        .filter((file) => /^app-routes-.*\.tsx$/.test(file))
        .map((file) => `${APP_ROUTES_DIR}/${file}`)
    : [];
  return ['src/App.tsx', 'src/pages/happiness/happiness-app-routes.tsx', ...routeModules];
}

function appRoutes(): string[] {
  return routeFiles().flatMap((file) => {
    if (!existsSync(file)) return [];
    const src = readFileSync(file, 'utf8');
    return [...src.matchAll(/path="(\/[^"]*)"/g)].map((m) => m[1]);
  });
}

function routeExists(route: string, declared: string[]): boolean {
  if (!route.startsWith('/')) return false;
  return declared.some((candidate) => {
    const base = candidate.replace(/\/:[^/]+/g, '');
    return route === candidate || route === base || route.startsWith(`${base}/`) || candidate.startsWith(`${route}/`);
  });
}

export function validateAssistantCatalog(pack?: KnowledgePack): KnowledgeValidationIssue[] {
  const issues: KnowledgeValidationIssue[] = [];
  const faqIds = new Set<string>();
  const capIds = new Set<string>();
  const routes = appRoutes();

  for (const item of ASSISTANT_FAQ) {
    if (faqIds.has(item.id)) issues.push({ code: 'duplicate_faq', message: item.id });
    faqIds.add(item.id);
    if (!item.question.trim() || !item.answer.trim()) {
      issues.push({ code: 'malformed_faq', message: item.id });
    }
    for (const ref of item.sourceRefs) {
      if (!existsSync(ref)) issues.push({ code: 'missing_source', message: `${item.id} → ${ref}` });
    }
  }

  for (const cap of ASSISTANT_CAPABILITIES) {
    if (capIds.has(cap.id)) issues.push({ code: 'duplicate_capability', message: cap.id });
    capIds.add(cap.id);
    if (!ASSISTANT_CAPABILITY_STATUSES.includes(cap.status)) {
      issues.push({ code: 'invalid_status', message: `${cap.id} ${cap.status}` });
    }
    if (cap.status === 'deprecated' && cap.id === 'agreements') {
      issues.push({ code: 'deprecated_marked_wrong', message: cap.id });
    }
    for (const ref of cap.sourceRefs) {
      if (!existsSync(ref)) issues.push({ code: 'missing_source', message: `${cap.id} → ${ref}` });
    }
    for (const route of cap.routes) {
      if (routes.length && !routeExists(route, routes)) {
        issues.push({ code: 'missing_route', message: `${cap.id} → ${route}` });
      }
    }
  }

  for (const source of INDEXED_SOURCES) {
    if (!existsSync(source.path)) issues.push({ code: 'missing_index_source', message: source.path });
  }

  if (pack) {
    if (pack.faq.length !== ASSISTANT_FAQ.length) {
      issues.push({ code: 'stale_pack_faq', message: 'FAQ count does not match catalog' });
    }
    if (pack.capabilities.length !== ASSISTANT_CAPABILITIES.length) {
      issues.push({ code: 'stale_pack_capabilities', message: 'Capability count does not match catalog' });
    }
  }

  return issues;
}
