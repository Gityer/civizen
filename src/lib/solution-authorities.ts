import { SOLUTION_AUTHORITIES } from './solution-authorities-data';

/**
 * Civizen civic authority taxonomy for Solutions routing.
 *
 * Jurisdiction-agnostic: names describe typical public-sector departments
 * found across countries. Civizen does not currently exercise governmental
 * power — routing informs citizens and coordinates voluntary network action.
 */

export type SolutionAuthorityTier =
  | 'executive'
  | 'national'
  | 'regional'
  | 'local'
  | 'independent'
  | 'civizen';

export type SolutionAuthority = {
  id: string;
  name: string;
  tier: SolutionAuthorityTier;
  /** What this authority is typically responsible for */
  responsibilities: string;
  /** Keywords used for auto-categorization */
  keywords: string[];
  /** Maps to `public.professions.id` when seeking certified help */
  relatedProfessionIds: string[];
  sortOrder: number;
};


export function getSolutionAuthority(id: string | null | undefined): SolutionAuthority | null {
  if (!id) return null;
  return SOLUTION_AUTHORITIES.find((a) => a.id === id) ?? null;
}

export function listSolutionAuthorities(): readonly SolutionAuthority[] {
  return SOLUTION_AUTHORITIES;
}

export { SOLUTION_AUTHORITIES };
