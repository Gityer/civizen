import { ASSISTANT_CAPABILITIES } from '@/lib/assistant/catalog';
import { appPageLinks } from '@/lib/app-pages';
import { CONTRIBUTE_LANES } from '@/lib/contribute-lanes';
import { MAIN_NAV_ITEMS } from '@/lib/main-nav';
import { CIVI_CHOICE_LINKS, CIVI_PAGE_LINKS } from '@/lib/civi-nav-paths';

const EXTRA_PUBLIC_PATHS = [
  '/about',
  '/areas',
  '/contribute/policy',
  '/contribute/projects',
  '/contribute/tasks',
  '/documents',
  '/download',
  '/features',
  '/fund',
  '/governance',
  '/partners',
  '/signup',
  '/why-this-exists',
] as const;

const PATH_IN_TEXT =
  /(?<![A-Za-z0-9])(\/[a-zA-Z][a-zA-Z0-9/_-]*(?:\?[A-Za-z0-9._~=&%-]*)?)/g;

let cachedKnownPaths: string[] | null = null;

export type ChatTextPart =
  | { type: 'text'; value: string }
  | { type: 'page'; value: string; href: string };

type MatchSpan = { start: number; end: number; value: string; href: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectKnownAppPaths(): string[] {
  const paths = new Set<string>();
  for (const item of MAIN_NAV_ITEMS) paths.add(item.path);
  for (const page of appPageLinks) paths.add(page.path);
  for (const lane of CONTRIBUTE_LANES) {
    paths.add(lane.path);
    for (const related of lane.relatedLinks ?? []) paths.add(related.path);
  }
  for (const capability of ASSISTANT_CAPABILITIES) {
    for (const route of capability.routes) paths.add(route);
  }
  for (const extra of EXTRA_PUBLIC_PATHS) paths.add(extra);
  for (const page of CIVI_PAGE_LINKS) paths.add(page.href);
  return [...paths]
    .filter((path) => path.startsWith('/') && path.length > 1)
    .sort((a, b) => b.length - a.length);
}

export function getKnownAppPaths(): string[] {
  cachedKnownPaths ??= collectKnownAppPaths();
  return cachedKnownPaths;
}

export function resolveChatPageHref(rawPath: string): string | null {
  const pathname = rawPath.split('?')[0];
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return null;
  for (const known of getKnownAppPaths()) {
    if (pathname === known) return rawPath;
    if (pathname.startsWith(`${known}/`)) return rawPath;
  }
  return null;
}

function collectLabelSpans(
  content: string,
  links: readonly { label: string; href: string; listItem?: boolean }[],
): MatchSpan[] {
  const spans: MatchSpan[] = [];
  const ordered = [...links].sort((a, b) => b.label.length - a.label.length);
  for (const link of ordered) {
    const re = link.listItem
      ? new RegExp(`(?<=(?:such as |, |or ))${escapeRegExp(link.label)}(?=(?:,| or |\\.))`, 'g')
      : new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(link.label)}(?![A-Za-z0-9])`, 'g');
    for (const match of content.matchAll(re)) {
      const start = match.index ?? 0;
      spans.push({ start, end: start + link.label.length, value: link.label, href: link.href });
    }
  }
  return spans;
}

function collectLinkSpans(content: string, includeChoices: boolean): MatchSpan[] {
  const spans: MatchSpan[] = [];
  for (const match of content.matchAll(new RegExp(PATH_IN_TEXT.source, PATH_IN_TEXT.flags))) {
    const value = match[1];
    const href = resolveChatPageHref(value);
    if (!href) continue;
    const start = match.index ?? 0;
    spans.push({ start, end: start + value.length, value, href });
  }
  spans.push(...collectLabelSpans(content, CIVI_PAGE_LINKS));
  if (includeChoices) spans.push(...collectLabelSpans(content, CIVI_CHOICE_LINKS));
  spans.sort((a, b) => a.start - b.start || b.end - a.start - (a.end - a.start));
  const kept: MatchSpan[] = [];
  for (const span of spans) {
    if (kept.some((other) => span.start < other.end && span.end > other.start)) continue;
    kept.push(span);
  }
  return kept;
}

export function splitChatPageLinks(
  content: string,
  options?: { includeChoices?: boolean },
): ChatTextPart[] {
  if (!content) return [];
  const spans = collectLinkSpans(content, options?.includeChoices !== false);
  if (!spans.length) return [{ type: 'text', value: content }];
  const parts: ChatTextPart[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      parts.push({ type: 'text', value: content.slice(cursor, span.start) });
    }
    parts.push({ type: 'page', value: span.value, href: span.href });
    cursor = span.end;
  }
  if (cursor < content.length) {
    parts.push({ type: 'text', value: content.slice(cursor) });
  }
  return parts;
}
