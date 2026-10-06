import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PEACE_COOPERATION_REPLY } from '@/lib/assistant/peace';
import { askCiviPublic, sanitizeCiviPublicHistory } from '@/lib/civi-public';

const invoke = vi.fn(async (..._args: unknown[]) => ({
  data: { reply: 'Humanity often unites only when disaster forces us to.' },
  error: null,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: [], error: null })),
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
  },
}));

describe('sanitizeCiviPublicHistory', () => {
  it('keeps only recent user and assistant turns', () => {
    const history = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `turn ${index}`,
    }));
    const next = sanitizeCiviPublicHistory(history);
    expect(next).toHaveLength(12);
    expect(next[0]?.content).toBe('turn 8');
    expect(next.at(-1)?.content).toBe('turn 19');
  });

  it('drops empty and invalid turns', () => {
    const next = sanitizeCiviPublicHistory([
      { role: 'user', content: '  ' },
      { role: 'assistant', content: 'Civizen is a participatory system.' },
      { role: 'user', content: 'What is Civizen?' },
    ]);
    expect(next.map((turn) => turn.content)).toEqual([
      'Civizen is a participatory system.',
      'What is Civizen?',
    ]);
  });
});

describe('askCiviPublic', () => {
  beforeEach(() => {
    invoke.mockClear();
  });

  it('answers a peace question from this build instead of the live manifesto reply', async () => {
    const reply = await askCiviPublic('How can we stop wars?');
    expect(reply).toBe(PEACE_COOPERATION_REPLY);
    expect(reply).not.toMatch(/unites only when disaster/i);
    expect(invoke).not.toHaveBeenCalled();
  });
});
