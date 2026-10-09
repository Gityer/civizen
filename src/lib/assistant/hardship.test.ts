import { describe, expect, it } from 'vitest';

import { isPersonalHardshipAsk, PERSONAL_HARDSHIP_REPLY } from '@/lib/assistant/hardship';
import { prepareCiviTurn } from '@/lib/assistant/orchestrator';
import type { HistoryTurn } from '@/lib/assistant/types';

function turn(content: string, history: HistoryTurn[] = []): HistoryTurn[] {
  return [...history, { role: 'user', content }];
}

describe('Civi personal hardship', () => {
  it('detects homelessness and similar immediate-need asks', () => {
    expect(isPersonalHardshipAsk("I'm homeless, can you help me?")).toBe(true);
    expect(isPersonalHardshipAsk('I have nowhere to sleep tonight.')).toBe(true);
    expect(isPersonalHardshipAsk('Can Civizen house me?')).toBe(true);
    expect(isPersonalHardshipAsk('How can I contribute?')).toBe(false);
    expect(isPersonalHardshipAsk('Can you help me create an agreement?')).toBe(false);
  });

  it('does not send a homelessness ask to Contribute volunteer lanes', () => {
    const prep = prepareCiviTurn(turn("I'm homeless, can you help me?"));
    expect(prep.skipLlm).toBe(true);
    expect(prep.groundedAnswer).toBe(PERSONAL_HARDSHIP_REPLY);
    expect(prep.groundedAnswer).not.toMatch(/Volunteer/i);
    expect(prep.groundedAnswer).not.toMatch(/how you want to help/i);
    expect(prep.groundedAnswer).toMatch(/not a shelter/i);
    expect(prep.groundedAnswer).toMatch(/Market > Jobs/);
  });

  it('still answers hardship after a Civizen conversation, instead of inheriting Contribute', () => {
    const history: HistoryTurn[] = [
      { role: 'user', content: 'What is Civizen?' },
      {
        role: 'assistant',
        content:
          'Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within.',
      },
    ];
    const prep = prepareCiviTurn(turn("I'm homeless, can you help me?", history));
    expect(prep.diagnostics.matchedFaqId).toBe('if_i_need_housing_or_emergency_help');
    expect(prep.groundedAnswer).toBe(PERSONAL_HARDSHIP_REPLY);
    expect(prep.groundedAnswer).not.toMatch(/Financial Support/i);
  });

  it('still routes genuine contribution questions to Contribute', () => {
    const prep = prepareCiviTurn(turn('How can I contribute?'));
    expect(prep.diagnostics.matchedFaqId).toBe('how_can_i_contribute');
    expect(prep.groundedAnswer).toMatch(/Open Contribute/i);
  });
});
