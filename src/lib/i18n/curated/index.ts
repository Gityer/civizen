import { governanceDashboardHy } from './governance-dashboard.hy';
import { governanceDashboardRu } from './governance-dashboard.ru';

type Tree = Record<string, unknown>;

/**
 * Hand-written translations that take precedence over machine translation.
 * Keyed by primary language subtag, then by top-level translation group.
 */
export const curatedTranslations: Record<string, Tree> = {
  hy: { governanceDashboard: governanceDashboardHy },
  ru: { governanceDashboard: governanceDashboardRu },
};

function isTree(value: unknown): value is Tree {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeTree(target: unknown, source: Tree): Tree {
  const result: Tree = isTree(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(source)) {
    result[key] = isTree(value) ? mergeTree(result[key], value) : value;
  }
  return result;
}

export function applyCuratedTranslations(language: string, messages: Tree): Tree {
  const curated = curatedTranslations[language.toLowerCase().split(/[-_]/)[0] ?? ''];
  return curated ? mergeTree(messages, curated) : messages;
}
