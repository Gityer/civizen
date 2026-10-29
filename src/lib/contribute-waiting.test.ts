import { describe, expect, it } from 'vitest';
import { parseContributeWaiting } from './contribute-waiting';

describe('parseContributeWaiting', () => {
  it('reads the counts and treats anything else as zero', () => {
    expect(parseContributeWaiting({ actions_due: 2, proposals_to_support: 1, ballots_open: 3, challenges: 4, knowledge: 5, position_items: 6 }))
      .toEqual({ actionsDue: 2, proposalsToSupport: 1, ballotsOpen: 3, challenges: 4, knowledge: 5, positionItems: 6 });
    expect(parseContributeWaiting(null)).toEqual({ actionsDue: 0, proposalsToSupport: 0, ballotsOpen: 0, challenges: 0, knowledge: 0, positionItems: 0 });
    expect(parseContributeWaiting({ actions_due: '7', ballots_open: -1 }).actionsDue).toBe(0);
  });
});
