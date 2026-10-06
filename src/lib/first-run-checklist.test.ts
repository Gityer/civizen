// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { buildFirstRunSteps, dismissFirstRun, isFirstRunComplete, isFirstRunDismissed } from '@/lib/first-run-checklist';

const empty = { avatarUrl: null, bio: '  ', skillCount: 0, experienceCount: 0, postCount: 0, endorsementsGivenCount: 0 };

describe('first-run checklist', () => {
  beforeEach(() => window.localStorage.clear());

  it('marks nothing done for a brand new member', () => {
    const steps = buildFirstRunSteps(empty);
    expect(steps.map((step) => step.id)).toEqual(['photo', 'bio', 'background', 'post', 'endorse']);
    expect(steps.some((step) => step.done)).toBe(false);
    expect(isFirstRunComplete(steps)).toBe(false);
  });

  it('counts either skills or experience as background', () => {
    const steps = buildFirstRunSteps({ ...empty, experienceCount: 1 });
    expect(steps.find((step) => step.id === 'background')?.done).toBe(true);
  });

  it('is complete once every step is done', () => {
    const steps = buildFirstRunSteps({
      avatarUrl: 'https://x/a.png', bio: 'Hi', skillCount: 2, experienceCount: 0, postCount: 1, endorsementsGivenCount: 1,
    });
    expect(isFirstRunComplete(steps)).toBe(true);
  });

  it('remembers a dismissal per profile', () => {
    dismissFirstRun('p1');
    expect(isFirstRunDismissed('p1')).toBe(true);
    expect(isFirstRunDismissed('p2')).toBe(false);
  });
});
