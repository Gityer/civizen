import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/solutions-api', () => ({ invokeSolutionsCouncil: vi.fn() }));

import { councilErrorCode, councilErrorMessageKey, unavailableSpeakersInLatestRound } from './solutions-council-client';
import type { SolutionTurn } from '@/lib/solutions-api';

const turn = (speaker: SolutionTurn['speaker'], round: number, dissent: string | null = null): SolutionTurn => ({
  id: `${speaker}-${round}`,
  problemId: 'p1',
  speaker,
  speakerProfileId: null,
  content: 'x',
  stance: { action: dissent ? 'dissent' : 'propose', dissent_reason: dissent } as SolutionTurn['stance'],
  round,
  createdAt: '2026-10-09T00:00:00Z',
});

describe('solutions council client', () => {
  it('reads the machine code from the function error body', async () => {
    const context = new Response(JSON.stringify({ error: 'x', code: 'rate_limited' }), { status: 429 });
    expect(await councilErrorCode({ context })).toBe('rate_limited');
    expect(await councilErrorCode({ context: new Response('nope', { status: 500 }) })).toBe('failed');
    expect(await councilErrorCode(new Error('network'))).toBe('failed');
  });

  it('maps codes to copy keys', () => {
    expect(councilErrorMessageKey('not_allowed')).toBe('solutions.councilNotAllowed');
    expect(councilErrorMessageKey('no_providers')).toBe('solutions.councilNoProviders');
    expect(councilErrorMessageKey('failed')).toBe('solutions.continueFailed');
  });

  it('lists the agents that were unavailable in the latest round only', () => {
    const turns = [turn('chatgpt', 1, 'provider_unavailable'), turn('gemini', 1), turn('claude', 2, 'provider_unavailable'), turn('gemini', 2), turn('citizen', 2)];
    expect(unavailableSpeakersInLatestRound(turns)).toEqual(['claude']);
    expect(unavailableSpeakersInLatestRound([turn('citizen', 1)])).toEqual([]);
  });
});
