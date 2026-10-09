import { invokeSolutionsCouncil, type SolutionTurn } from '@/lib/solutions-api';
import type { SolutionSpeaker } from '@/lib/solutions-constants';

export type CouncilErrorCode =
  | 'not_allowed'
  | 'busy'
  | 'rate_limited'
  | 'no_providers'
  | 'providers_failed'
  | 'failed';

const KNOWN_CODES: readonly CouncilErrorCode[] = ['not_allowed', 'busy', 'rate_limited', 'no_providers', 'providers_failed', 'failed'];

/** Reads the machine code the council function puts in its JSON error body (FunctionsHttpError keeps the Response in `context`). */
export async function councilErrorCode(error: unknown): Promise<CouncilErrorCode> {
  const context = (error as { context?: unknown } | null)?.context;
  if (context && typeof (context as Response).clone === 'function') {
    try {
      const body = (await (context as Response).clone().json()) as { code?: unknown };
      if (typeof body?.code === 'string' && (KNOWN_CODES as readonly string[]).includes(body.code)) return body.code as CouncilErrorCode;
    } catch {
      /* not JSON */
    }
  }
  return 'failed';
}

export function councilErrorMessageKey(code: CouncilErrorCode): string {
  switch (code) {
    case 'not_allowed': return 'solutions.councilNotAllowed';
    case 'busy': return 'solutions.councilBusy';
    case 'rate_limited': return 'solutions.councilRateLimited';
    case 'no_providers': return 'solutions.councilNoProviders';
    case 'providers_failed': return 'solutions.councilProvidersFailed';
    default: return 'solutions.continueFailed';
  }
}

/** Runs or continues the council and resolves to the error code (null when it started). */
export async function runSolutionsCouncil(problemId: string, options?: { continue?: boolean }): Promise<CouncilErrorCode | null> {
  const { error } = await invokeSolutionsCouncil(problemId, options);
  if (!error) return null;
  return councilErrorCode(error);
}

/** Agents that reported themselves unavailable in the latest round (missing key or provider error). */
export function unavailableSpeakersInLatestRound(turns: readonly SolutionTurn[]): SolutionSpeaker[] {
  const agentTurns = turns.filter((turn) => turn.speaker !== 'citizen');
  if (agentTurns.length === 0) return [];
  const latestRound = Math.max(...agentTurns.map((turn) => turn.round));
  return agentTurns
    .filter((turn) => turn.round === latestRound && (turn.stance as { dissent_reason?: unknown }).dissent_reason === 'provider_unavailable')
    .map((turn) => turn.speaker);
}
