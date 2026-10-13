import { describe, expect, it } from 'vitest';

import { m_messages_moderation } from '@/lib/i18n/base/messages-moderation';
import { firstStepsHy } from '@/lib/i18n/curated/first-steps.hy';
import { firstStepsRu } from '@/lib/i18n/curated/first-steps.ru';

import { firstSteps, mapFirstSteps } from './first-steps';

const none = mapFirstSteps({ open_election_id: 'e1' })!;

describe('first steps', () => {
  it('lists every step for a newcomer, with the open consultation linked', () => {
    const steps = firstSteps(none);
    expect(steps.map((s) => s.key)).toEqual(['lesson', 'vote', 'matter', 'verify', 'profile']);
    expect(steps.find((s) => s.key === 'vote')?.href).toBe('/governance/voting/e1');
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it('leaves out the vote step when nothing is open and the member never voted', () => {
    const steps = firstSteps(mapFirstSteps({ open_election_id: null })!);
    expect(steps.map((s) => s.key)).not.toContain('vote');
  });

  it('marks steps done from the server answer', () => {
    const steps = firstSteps(mapFirstSteps({ lesson: true, voted: true, matter: true, verification_started: true, profile: true, open_election_id: 'e1' })!);
    expect(steps.every((s) => s.done)).toBe(true);
  });

  it('has text for every step in English, Armenian and Russian', () => {
    for (const tree of [m_messages_moderation.firstSteps, firstStepsHy.firstSteps, firstStepsRu.firstSteps]) {
      for (const step of firstSteps(none)) {
        expect(tree.steps[step.key].title).toBeTruthy();
        expect(tree.steps[step.key].hint).toBeTruthy();
      }
    }
  });
});
