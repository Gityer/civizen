import { supabase } from '@/integrations/supabase/client';
import { createSolutionProblem } from '@/lib/solutions-api';

/**
 * One way to raise a problem (Phase 4 step 4.1). A Matter is always created first; the handling decides what else
 * happens: nothing more for a community discussion, a linked Solutions problem for the AI council, or a jump to the
 * challenge form for a community project. The Matter page already shows both links back.
 */
export const MATTER_HANDLINGS = ['discussion', 'ai_council', 'community_project'] as const;
export type MatterHandling = (typeof MATTER_HANDLINGS)[number];

export type MatterHandlingInput = {
  handling: MatterHandling;
  matterId: string;
  title: string;
  description: string;
  authorId: string;
};

export type MatterHandlingResult = { nextPath: string; linkedProblemId: string | null; warning: 'ai_council_failed' | null };

type Deps = {
  createProblem?: typeof createSolutionProblem;
  linkProblem?: (problemId: string, matterId: string) => Promise<void>;
};

async function defaultLinkProblem(problemId: string, matterId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('link_solution_problem_matter', { p_problem_id: problemId, p_matter_id: matterId });
  if (error) throw new Error(error.message);
}

export function challengeFormPathForMatter(matterId: string, title: string, description: string): string {
  const params = new URLSearchParams({ matter: matterId, title: title.slice(0, 160), problem: description.slice(0, 2000) });
  return `/contribute/challenges/new?${params.toString()}`;
}

/** Applies the chosen handling after the Matter exists; never throws, the Matter page is always a valid fallback. */
export async function applyMatterHandling(input: MatterHandlingInput, deps: Deps = {}): Promise<MatterHandlingResult> {
  const matterPath = `/contribute/matters/${input.matterId}`;
  if (input.handling === 'community_project') {
    return { nextPath: challengeFormPathForMatter(input.matterId, input.title, input.description), linkedProblemId: null, warning: null };
  }
  if (input.handling !== 'ai_council') return { nextPath: matterPath, linkedProblemId: null, warning: null };
  try {
    const created = await (deps.createProblem ?? createSolutionProblem)({ authorId: input.authorId, title: input.title, body: input.description, mode: 'discuss' });
    const problemId = created.problem?.id ?? null;
    if (!problemId || created.error) return { nextPath: matterPath, linkedProblemId: null, warning: 'ai_council_failed' };
    await (deps.linkProblem ?? defaultLinkProblem)(problemId, input.matterId);
    return { nextPath: matterPath, linkedProblemId: problemId, warning: null };
  } catch {
    return { nextPath: matterPath, linkedProblemId: null, warning: 'ai_council_failed' };
  }
}
