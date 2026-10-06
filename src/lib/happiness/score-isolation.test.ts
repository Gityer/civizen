import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('happiness must not feed Civizen Score', () => {
  it('keeps score modules free of happiness imports and wellbeing inputs', () => {
    const scoreFiles = [
      'src/lib/civizen-score.ts',
      'src/lib/civizen-score-model.ts',
      'src/lib/civizen-score-tiers.ts',
      'src/lib/civizen-contribution-score.ts',
    ];
    for (const file of scoreFiles) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/from ['"]@\/lib\/happiness/);
      expect(source).not.toMatch(/from ['"]@\/lib\/work-fulfillment/);
      expect(source).not.toMatch(/happiness_checkins|overall_internal/);
    }
  });

  it('keeps Home Score wiring free of Happiness calculation', () => {
    // Home is split into src/pages/Home.tsx plus the hooks and sections under src/pages/home/.
    const home = ['src/pages/Home.tsx', ...readdirSync('src/pages/home').map((file) => `src/pages/home/${file}`)]
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n');
    expect(home).toMatch(/HomeHappinessShortcut/);
    expect(home).not.toMatch(/deriveHappinessView|levelFromInternal|overallInternal/);
    expect(home).not.toMatch(/from ['"]@\/lib\/happiness\//);
  });
});
