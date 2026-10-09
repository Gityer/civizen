import { describe, expect, it } from 'vitest';

import { isPeaceCooperationAsk, PEACE_COOPERATION_REPLY } from '@/lib/assistant/peace';
import { prepareCiviTurn } from '@/lib/assistant/orchestrator';
import type { HistoryTurn } from '@/lib/assistant/types';

function turn(content: string, history: HistoryTurn[] = []): HistoryTurn[] {
  return [...history, { role: 'user', content }];
}

describe('Civi peace and cooperation', () => {
  it('detects how-to-stop-wars and similar civic asks', () => {
    expect(isPeaceCooperationAsk('How can we stop wars?')).toBe(true);
    expect(isPeaceCooperationAsk('How do we achieve peace?')).toBe(true);
    expect(isPeaceCooperationAsk('How can I contribute?')).toBe(false);
    expect(isPeaceCooperationAsk('Can you help me create an agreement?')).toBe(false);
  });

  it('answers a first-message peace ask with practical Civizen steps, not manifesto recap', () => {
    const prep = prepareCiviTurn(turn('How can we stop wars?'), { audience: 'guest' });
    expect(prep.inScope).toBe(true);
    expect(prep.skipLlm).toBe(true);
    expect(prep.groundedAnswer).toBe(PEACE_COOPERATION_REPLY);
    expect(prep.groundedAnswer).not.toMatch(/^Yes\./);
    expect(prep.groundedAnswer).toMatch(/unite around shared human responsibility/i);
    expect(prep.groundedAnswer).toMatch(/Unity does not require uniformity/i);
    expect(prep.groundedAnswer).toMatch(/signing up/);
    expect(prep.groundedAnswer).toMatch(/make a contribution/);
    expect(prep.groundedAnswer).toMatch(/\bStudy\b/);
    expect(prep.groundedAnswer).toMatch(/Governance/);
    expect(prep.groundedAnswer).not.toMatch(/learn in Study/i);
    expect(prep.groundedAnswer).not.toMatch(/Start with Sign up\./);
    expect(prep.groundedAnswer).not.toMatch(/unites only when disaster/i);
    expect(prep.groundedAnswer).not.toMatch(/Volunteer/i);
  });

  it('keeps the peace answer after a Civizen conversation', () => {
    const history: HistoryTurn[] = [
      { role: 'user', content: 'What is Civizen?' },
      {
        role: 'assistant',
        content:
          'Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within.',
      },
    ];
    const prep = prepareCiviTurn(turn('How can we stop wars?', history), { audience: 'guest' });
    expect(prep.diagnostics.matchedFaqId).toBe('how_can_we_stop_wars');
    expect(prep.groundedAnswer).toBe(PEACE_COOPERATION_REPLY);
  });
});
