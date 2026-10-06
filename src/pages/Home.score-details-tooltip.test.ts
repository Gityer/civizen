import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { baseTranslations } from '@/lib/i18n.base';

const repoRoot = path.resolve(__dirname, '../..');

describe('Home Score Details tooltip', () => {
  it('includes View Score Details plus the formation-stage rating note', () => {
    expect(baseTranslations.home.viewScoreDetails).toBe('View Score Details');
    expect(baseTranslations.home.viewScoreDetailsFormationNote).toBe(
      'The Rating system is still in formation stage, so it may not reflect the correct or actual rating.',
    );
  });

  it('renders both lines in the Home Score Details tooltip', () => {
    // Home is split into src/pages/Home.tsx plus section components under src/pages/home/.
    const homeDir = path.join(repoRoot, 'src/pages/home');
    const homeSource = [
      readFileSync(path.join(repoRoot, 'src/pages/Home.tsx'), 'utf8'),
      ...readdirSync(homeDir).map((file) => readFileSync(path.join(homeDir, file), 'utf8')),
    ].join('\n');
    expect(homeSource).toContain("t('home.viewScoreDetails')");
    expect(homeSource).toContain("t('home.viewScoreDetailsFormationNote')");
    expect(homeSource).toMatch(/max-w-\[16rem\][\s\S]*viewScoreDetailsFormationNote/);
  });
});
