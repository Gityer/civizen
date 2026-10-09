import { describe, expect, it } from 'vitest';

import { EMPTY_MATTER_LINKS, challengeFromMatterHref, mapMatterLinks } from './matter-links';

describe('matter links', () => {
  it('maps the AI-council problem and the community challenges', () => {
    const links = mapMatterLinks({
      solution_problem: { id: 'p1', title: 'Problem', status: 'debating' },
      challenges: [{ id: 'c1', title: 'Challenge', status: 'active' }, null],
    });
    expect(links.solutionProblem).toEqual({ id: 'p1', title: 'Problem', status: 'debating' });
    expect(links.challenges).toEqual([{ id: 'c1', title: 'Challenge', status: 'active' }]);
    expect(mapMatterLinks({ solution_problem: null, challenges: [] })).toEqual(EMPTY_MATTER_LINKS);
    expect(mapMatterLinks(null)).toEqual(EMPTY_MATTER_LINKS);
  });

  it('prefills a new challenge from the Matter', () => {
    const href = challengeFromMatterHref({ id: 'm1', title: 'Shade at bus stops', description: 'No shade in summer.' });
    const params = new URLSearchParams(href.split('?')[1]);
    expect(href.startsWith('/contribute/challenges/new?')).toBe(true);
    expect(params.get('matter')).toBe('m1');
    expect(params.get('title')).toBe('Shade at bus stops');
    expect(params.get('problem')).toBe('No shade in summer.');
  });
});
