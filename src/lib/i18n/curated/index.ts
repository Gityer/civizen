import { governanceDashboardHy } from './governance-dashboard.hy';
import { governanceDashboardRu } from './governance-dashboard.ru';
import { governanceHubHy } from './governance-hub.hy';
import { governanceHubRu } from './governance-hub.ru';
import { civicVotingHy } from './civic-voting.hy';
import { civicVotingRu } from './civic-voting.ru';

type Tree = Record<string, unknown>;

/**
 * Hand-written translations that take precedence over machine translation.
 * Keyed by primary language subtag, then by top-level translation group.
 */
function mergeGroups(...groups: Tree[]): Tree {
  return groups.reduce<Tree>((acc, group) => mergeTree(acc, group), {});
}

export const curatedTranslations: Record<string, Tree> = {
  hy: mergeGroups({ governanceDashboard: governanceDashboardHy, ...governanceHubHy }, civicVotingHy),
  ru: mergeGroups({ governanceDashboard: governanceDashboardRu, ...governanceHubRu }, civicVotingRu),
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
