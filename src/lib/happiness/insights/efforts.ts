import type { ExistingEffort, PresentedDomainInsight, SystemicIssueCandidate } from './types';

const RELATED = {
  transportation: ['transit', 'transport', 'commute'],
  commute: ['transportation', 'transit'],
  housing: ['homes', 'rent'],
} as const;

function tokensFrom(text: string): string[] {
  const base = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
  return [...new Set(base.flatMap((token) => [token, ...((RELATED as Record<string, readonly string[]>)[token] ?? [])]))];
}

export function matchExistingEfforts(input: {
  candidate: SystemicIssueCandidate;
  insight?: PresentedDomainInsight | null;
  efforts: ExistingEffort[];
}): ExistingEffort[] {
  const hay = tokensFrom(
    [input.candidate.domain, input.candidate.factorCategory ?? '', input.candidate.summary, ...(input.insight?.factors ?? [])].join(' '),
  );
  return input.efforts
    .filter((effort) => {
      const titleTokens = tokensFrom(effort.title);
      return hay.some((token) => titleTokens.includes(token));
    })
    .slice(0, 3);
}
