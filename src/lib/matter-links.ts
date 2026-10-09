import { supabase } from '@/integrations/supabase/client';

export type MatterLinks = {
  /** The Solutions ("AI council") problem opened from this Matter, when any. */
  solutionProblem: { id: string; title: string; status: string } | null;
  /** Community challenges started from this Matter. */
  challenges: Array<{ id: string; title: string; status: string }>;
};

export const EMPTY_MATTER_LINKS: MatterLinks = { solutionProblem: null, challenges: [] };

const str = (value: unknown): string => (typeof value === 'string' ? value : value == null ? '' : String(value));

export function mapMatterLinks(data: unknown): MatterLinks {
  if (!data || typeof data !== 'object') return EMPTY_MATTER_LINKS;
  const row = data as Record<string, unknown>;
  const problem = row.solution_problem && typeof row.solution_problem === 'object' ? (row.solution_problem as Record<string, unknown>) : null;
  const challenges = Array.isArray(row.challenges) ? row.challenges : [];
  return {
    solutionProblem: problem && problem.id ? { id: str(problem.id), title: str(problem.title), status: str(problem.status) } : null,
    challenges: challenges
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({ id: str(item.id), title: str(item.title), status: str(item.status) })),
  };
}

/** One way to raise a problem (Phase 4 step 4.1): the Matter page shows where the problem went next. */
export async function loadMatterLinks(matterId: string): Promise<MatterLinks> {
  try {
    const { data, error } = await supabase.rpc('matter_links', { p_matter_id: matterId });
    if (error) return EMPTY_MATTER_LINKS;
    return mapMatterLinks(data);
  } catch {
    return EMPTY_MATTER_LINKS;
  }
}

/** Records the Matter a Solutions problem was raised as; only the problem's author may link. */
export async function linkSolutionProblemToMatter(problemId: string, matterId: string): Promise<void> {
  const { error } = await supabase.rpc('link_solution_problem_matter', { p_problem_id: problemId, p_matter_id: matterId });
  if (error) throw new Error(error.message);
}

/** Records the Matter a community challenge grew out of; the Matter logs the event. */
export async function linkChallengeSourceMatter(challengeId: string, matterId: string): Promise<void> {
  const { error } = await supabase.rpc('link_challenge_source_matter', { p_challenge_id: challengeId, p_matter_id: matterId });
  if (error) throw new Error(error.message);
}

/** Query string that prefills a new community challenge from a Matter. */
export function challengeFromMatterHref(matter: { id: string; title: string; description: string }): string {
  const params = new URLSearchParams({ matter: matter.id, title: matter.title.slice(0, 160), problem: matter.description.slice(0, 1200) });
  return `/contribute/challenges/new?${params.toString()}`;
}
