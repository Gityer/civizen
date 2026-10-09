import type { AppPermission } from '@/lib/access-control';
import { getAccessiblePageLinks } from '@/lib/app-pages';
import { CONTRIBUTE_LANES } from '@/lib/contribute-lanes';
import { featureRegistry, pageRegistry, type FeatureId, type PageId } from '@/lib/feature-registry';
import { INSTITUTIONAL_DOCS } from '@/lib/institutional-docs';
import { lawCatalog } from '@/lib/law-catalog';
import { STUDY_DOCUMENTS } from '@/lib/study';

export type SearchContentKind = 'page' | 'feature' | 'study' | 'law' | 'document' | 'contribute';

export type SearchContentHit = {
  id: string;
  kind: SearchContentKind;
  title: string;
  summary: string;
  path: string;
  keywords: string[];
};

export const SEARCH_FILTER_TABS = ['people', 'companies', 'products', 'services', 'contents'] as const;
export type SearchFilterTab = (typeof SEARCH_FILTER_TABS)[number];
/** `null` means search all categories (no filter chip selected). */
export type SearchTabSelection = SearchFilterTab | null;

const PAGE_PATHS: Partial<Record<PageId, string>> = {
  home: '/',
  study: '/study',
  features: '/features',
  downloads: '/download',
  law: '/law',
  terms: '/terms',
  search: '/search',
  endorse: '/search?tab=people',
  market: '/market',
  agreements: '/agreements',
  earnings: '/earnings',
  happiness: '/happiness',
  profile: '/profile',
  editProfile: '/settings/profile',
  settings: '/settings',
  pillars: '/settings/pillars',
  messaging: '/messaging',
  login: '/login',
  signUp: '/signup',
  contribute: '/contribute',
  admin: '/settings/admin/users',
  adminRoles: '/settings/admin/roles',
  adminUsers: '/settings/admin/users',
  adminPermissions: '/settings/admin/permissions',
  adminGovernance: '/settings/admin/governance',
  adminModules: '/settings/admin/modules',
};

const FEATURE_PATHS: Partial<Record<FeatureId, string>> = {
  workFulfillment: '/happiness/work',
  fulfillmentPlans: '/happiness/improve',
  wellbeingAggregatePrivacy: '/happiness/privacy',
};

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function matchesQuery(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query);
}

export function parseSearchTabParam(value: string | null | undefined): SearchTabSelection {
  if (!value || value === 'all') return null;
  return (SEARCH_FILTER_TABS as readonly string[]).includes(value) ? (value as SearchFilterTab) : null;
}

export function isSearchFilterTab(value: string): value is SearchFilterTab {
  return (SEARCH_FILTER_TABS as readonly string[]).includes(value);
}

/** Build client-side Contents catalog (pages, features, study, law, docs, contribute). */
export function buildSearchContentsCatalog(
  t: Translate,
  effectivePermissions: AppPermission[] = [],
): SearchContentHit[] {
  const hits: SearchContentHit[] = [];
  const seen = new Set<string>();

  const push = (hit: SearchContentHit) => {
    const key = `${hit.kind}:${hit.path}:${hit.title.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push(hit);
  };

  for (const page of getAccessiblePageLinks(effectivePermissions)) {
    const title = t(page.labelKey);
    push({
      id: `page:${page.id}`,
      kind: 'page',
      title,
      summary: page.path,
      path: page.path,
      keywords: [page.id, page.path, page.labelKey],
    });
  }

  // Extra public surfaces not always in appPageLinks
  for (const extra of [
    { id: 'home', path: '/', labelKey: pageRegistry.home.labelKey },
    { id: 'features', path: '/features', labelKey: pageRegistry.features.labelKey },
    { id: 'governance', path: '/governance', labelKey: 'settings.governanceHub' },
    { id: 'areas', path: '/areas', labelKey: 'areas.title' },
    { id: 'fund', path: '/fund', labelKey: 'common.footerFund' },
    { id: 'documents', path: '/documents', labelKey: 'documents.indexTitle' },
  ] as const) {
    const title = t(extra.labelKey);
    if (!title || title === extra.labelKey) continue;
    push({
      id: `page:${extra.id}`,
      kind: 'page',
      title,
      summary: extra.path,
      path: extra.path,
      keywords: [extra.id, extra.path],
    });
  }

  push({
    id: 'page:wellbeing-insights',
    kind: 'page',
    title: 'Wellbeing Insights',
    summary: 'Privacy-protected group insights for authorized organization and community viewers.',
    path: '/wellbeing-insights',
    keywords: ['wellbeing insights', 'community wellbeing', 'organization wellbeing'],
  });
  push({
    id: 'page:human-outcome-review',
    kind: 'page',
    title: 'Human Outcome Review',
    summary: 'Privacy-safe baseline and follow-up comparison after a linked Challenge, Project, or Governance action. Causality is not established.',
    path: '/wellbeing-insights/outcome',
    keywords: ['human outcome review', 'outcome review', 'human outcomes'],
  });
  push({
    id: 'page:solution-records',
    kind: 'page',
    title: 'Solution Records',
    summary: 'Reusable lessons from completed Community Challenges. Distinct from Human Outcome Reviews.',
    path: '/contribute/challenges',
    keywords: ['solution records', 'learn from this'],
  });

  for (const feature of featureRegistry) {
    const title = t(feature.titleKey);
    const summary = t(feature.summaryKey);
    const path = FEATURE_PATHS[feature.id] ?? PAGE_PATHS[feature.page] ?? '/features';
    push({
      id: `feature:${feature.id}`,
      kind: 'feature',
      title,
      summary,
      path,
      keywords: [feature.id, feature.page, feature.section, feature.titleKey],
    });
  }

  for (const document of STUDY_DOCUMENTS) {
    const title = t(document.titleKey);
    const summary = t(document.summaryKey);
    push({
      id: `study:${document.key}`,
      kind: 'study',
      title,
      summary,
      path: document.route ?? '/study',
      keywords: [document.key, document.domainId, ...document.keywords],
    });
  }

  for (const entry of lawCatalog) {
    const sectionText = entry.sections.map((section) => `${section.title} ${section.summary}`).join(' ');
    push({
      id: `law:${entry.id}`,
      kind: 'law',
      title: entry.title,
      summary: entry.summary,
      path: '/law',
      keywords: [
        entry.id,
        entry.domain,
        entry.jurisdiction,
        entry.instrument,
        entry.track,
        sectionText,
      ],
    });
  }

  for (const doc of INSTITUTIONAL_DOCS) {
    push({
      id: `document:${doc.id}`,
      kind: 'document',
      title: doc.title,
      summary: doc.section,
      path: doc.path,
      keywords: [doc.id, doc.section, doc.version],
    });
  }

  for (const lane of CONTRIBUTE_LANES) {
    push({
      id: `contribute:${lane.id}`,
      kind: 'contribute',
      title: t(lane.titleKey),
      summary: t(lane.descriptionKey),
      path: lane.path,
      keywords: [lane.id, lane.section],
    });
  }

  return hits;
}

export function filterSearchContents(catalog: SearchContentHit[], query: string, limit = 30): SearchContentHit[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  return catalog
    .filter((hit) => {
      const haystack = [hit.title, hit.summary, hit.path, ...hit.keywords].join(' ');
      return matchesQuery(haystack, normalized);
    })
    .slice(0, limit);
}

export function searchContentKindLabelKey(kind: SearchContentKind): string {
  switch (kind) {
    case 'page':
      return 'search.contentKindPage';
    case 'feature':
      return 'search.contentKindFeature';
    case 'study':
      return 'search.contentKindStudy';
    case 'law':
      return 'search.contentKindLaw';
    case 'document':
      return 'search.contentKindDocument';
    case 'contribute':
      return 'search.contentKindContribute';
  }
}
