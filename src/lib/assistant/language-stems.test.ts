import { describe, expect, it } from 'vitest';

import { englishConceptTerms } from './language';

describe('Civi language stems', () => {
  // The "matter" stems once held literal backspace bytes (0x08) and never matched (commit f64cf7d, 9 Oct 2026).
  it('maps the Armenian word for matter', () => {
    expect(englishConceptTerms('Ինչպե՞ս բացել հարցը', 'hy').join(' ')).toContain('matter');
  });

  it('maps the Russian word for matter', () => {
    expect(englishConceptTerms('Где мои вопросы?', 'ru').join(' ')).toContain('matter');
  });
});
