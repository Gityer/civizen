import { describe, expect, it, vi } from 'vitest';
import { applyMatterHandling, challengeFormPathForMatter } from './matter-handling';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@/lib/solutions-api', () => ({ createSolutionProblem: vi.fn() }));

const base = { matterId: 'm1', title: 'Broken bridge', description: 'The bridge on Main street is closed.', authorId: 'p1' };

describe('matter handling', () => {
  it('a community discussion stays on the Matter', async () => {
    const result = await applyMatterHandling({ ...base, handling: 'discussion' });
    expect(result).toEqual({ nextPath: '/contribute/matters/m1', linkedProblemId: null, warning: null });
  });

  it('a community project continues to the challenge form prefilled from the Matter', async () => {
    const result = await applyMatterHandling({ ...base, handling: 'community_project' });
    expect(result.nextPath).toBe(challengeFormPathForMatter('m1', base.title, base.description));
    const url = new URL(result.nextPath, 'https://civizen.world');
    expect(url.pathname).toBe('/contribute/challenges/new');
    expect(url.searchParams.get('matter')).toBe('m1');
    expect(url.searchParams.get('title')).toBe('Broken bridge');
  });

  it('the AI council opens a Solutions problem and links it to the Matter', async () => {
    const createProblem = vi.fn(async () => ({ problem: { id: 'sp1' }, error: null })) as never;
    const linkProblem = vi.fn(async () => undefined);
    const result = await applyMatterHandling({ ...base, handling: 'ai_council' }, { createProblem, linkProblem });
    expect(createProblem).toHaveBeenCalledWith({ authorId: 'p1', title: base.title, body: base.description, mode: 'discuss' });
    expect(linkProblem).toHaveBeenCalledWith('sp1', 'm1');
    expect(result).toEqual({ nextPath: '/contribute/matters/m1', linkedProblemId: 'sp1', warning: null });
  });

  it('a failed AI council step keeps the Matter and reports a warning instead of throwing', async () => {
    const createProblem = vi.fn(async () => ({ problem: null, error: { message: 'down' } })) as never;
    const result = await applyMatterHandling({ ...base, handling: 'ai_council' }, { createProblem });
    expect(result).toEqual({ nextPath: '/contribute/matters/m1', linkedProblemId: null, warning: 'ai_council_failed' });
    const throwing = vi.fn(async () => { throw new Error('boom'); }) as never;
    expect((await applyMatterHandling({ ...base, handling: 'ai_council' }, { createProblem: throwing })).warning).toBe('ai_council_failed');
  });
});
