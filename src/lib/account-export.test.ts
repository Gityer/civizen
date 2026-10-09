import { describe, expect, it } from 'vitest';

import { exportFileName } from './account-export';

describe('exportFileName', () => {
  const day = new Date('2026-10-09T12:00:00Z');

  it('uses the username and the date', () => {
    expect(exportFileName('Jane_Smith', day)).toBe('civizen-export-jane_smith-2026-10-09.json');
  });

  it('falls back to member and strips unsafe characters', () => {
    expect(exportFileName(null, day)).toBe('civizen-export-member-2026-10-09.json');
    expect(exportFileName('  ünsafe/name!! ', day)).toBe('civizen-export-nsafe-name-2026-10-09.json');
  });
});
