import { describe, expect, it } from 'vitest';

import {
  SINGLE_WORLD_CITIZENSHIP_BODY,
  SINGLE_WORLD_CITIZENSHIP_EXCLUDED_TOPICS,
  SINGLE_WORLD_CITIZENSHIP_KEY,
  SINGLE_WORLD_CITIZENSHIP_QUESTION,
  SINGLE_WORLD_CITIZENSHIP_TITLE,
  singleWorldCitizenshipCopyIsNeutral,
} from './single-world-citizenship';

describe('single world citizenship consultation copy', () => {
  it('keeps the approved title, question, and nonbinding explanation', () => {
    expect(SINGLE_WORLD_CITIZENSHIP_KEY).toBe('single-world-citizenship');
    expect(SINGLE_WORLD_CITIZENSHIP_TITLE).toBe('A Single World Citizenship');
    expect(SINGLE_WORLD_CITIZENSHIP_QUESTION).toBe(
      'Should humanity work toward establishing a single world citizenship, shared by all people regardless of nationality?',
    );
    expect(SINGLE_WORLD_CITIZENSHIP_BODY).toContain('This consultation is nonbinding.');
    expect(SINGLE_WORLD_CITIZENSHIP_BODY).toContain(
      'does not itself create a new citizenship',
    );
    expect(SINGLE_WORLD_CITIZENSHIP_BODY).toContain('An Oppose vote expresses opposition');
    expect(SINGLE_WORLD_CITIZENSHIP_BODY).toContain(
      'Abstain records participation without supporting either position.',
    );
  });

  it('does not bundle later questions or favor Support', () => {
    const copy = [
      SINGLE_WORLD_CITIZENSHIP_TITLE,
      SINGLE_WORLD_CITIZENSHIP_QUESTION,
      SINGLE_WORLD_CITIZENSHIP_BODY,
    ].join('\n');
    expect(singleWorldCitizenshipCopyIsNeutral(copy)).toBe(true);
    for (const topic of SINGLE_WORLD_CITIZENSHIP_EXCLUDED_TOPICS) {
      expect(copy.toLowerCase().includes(topic.toLowerCase())).toBe(false);
    }
  });
});
