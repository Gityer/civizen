import { describe, expect, it } from 'vitest';

import { memoryQuestionKey, reviewLlmAnswerForLearning } from '@/lib/assistant/learned-memory';
import { prepareCiviTurn } from '@/lib/assistant/orchestrator';
import type { CiviLearnedMemory, HistoryTurn, CiviTurnPrep } from '@/lib/assistant/types';

function turn(content: string): HistoryTurn[] {
  return [{ role: 'user', content }];
}

function stubPrep(overrides: Partial<CiviTurnPrep> & { resourcePlan?: CiviTurnPrep['resourcePlan'] }): CiviTurnPrep {
  const base = prepareCiviTurn(turn('What is participatory budgeting?'));
  return {
    ...base,
    ...overrides,
    resourcePlan: overrides.resourcePlan ?? base.resourcePlan,
    diagnostics: {
      ...base.diagnostics,
      ...overrides.diagnostics,
      usedLearnedMemoryKey: overrides.diagnostics?.usedLearnedMemoryKey ?? base.diagnostics.usedLearnedMemoryKey,
    },
  };
}

describe('Civi learned memory', () => {
  it('normalizes a question key', () => {
    expect(memoryQuestionKey('What is participatory budgeting?')).toBe('participatory budgeting');
  });

  it('reuses a checked general answer and skips the model', () => {
    const memories: CiviLearnedMemory[] = [
      {
        questionKey: 'participatory budgeting',
        question: 'What is participatory budgeting?',
        answer:
          'Participatory budgeting is a process where residents help decide how part of a public budget is spent. Civizen does not currently include it as a live feature.',
        kind: 'general',
      },
    ];
    const prep = prepareCiviTurn(turn('What is participatory budgeting?'), { learnedMemories: memories });
    expect(prep.diagnostics.usedLearnedMemoryKey).toBe('participatory budgeting');
    expect(prep.skipLlm).toBe(true);
    expect(prep.groundedAnswer).toMatch(/residents help decide/i);
  });

  it('does not let learned memory override Civizen identity', () => {
    const memories: CiviLearnedMemory[] = [
      {
        questionKey: 'civizen',
        question: 'What is Civizen?',
        answer: 'Civizen is mainly a social network for hobbies.',
        kind: 'general',
      },
    ];
    const prep = prepareCiviTurn(turn("What's Civizen in one sentence?"), { learnedMemories: memories });
    expect(prep.diagnostics.usedLearnedMemoryKey).toBeNull();
    expect(prep.groundedAnswer).toMatch(/open participatory system/i);
    expect(prep.groundedAnswer).not.toMatch(/social network for hobbies/i);
  });

  it('learns a general Gemini answer after a check', () => {
    const prep = stubPrep({});
    const decision = reviewLlmAnswerForLearning({
      question: 'What is participatory budgeting?',
      llmAnswer:
        'Participatory budgeting lets residents propose and vote on how a portion of public money is spent. It is a civic process, not a current Civizen feature.',
      prep: { ...prep, skipLlm: false, inScope: true },
    });
    expect(decision).toMatchObject({ action: 'learn' });
    if (decision.action === 'learn') {
      expect(decision.kind).toBe('general');
      expect(decision.questionKey).toBe('participatory budgeting');
    }
  });

  it('rejects Gemini answers that invent a Civizen capability', () => {
    const prep = prepareCiviTurn(turn('Does Civizen support legally binding PKI notary stamps?'));
    const decision = reviewLlmAnswerForLearning({
      question: 'Does Civizen support legally binding PKI notary stamps?',
      llmAnswer: 'Yes. Civizen has legally binding PKI notary stamps and lets you certify any contract instantly.',
      prep: { ...prep, skipLlm: false },
    });
    expect(decision.action).toBe('skip');
  });

  it('does not store personal records or one-off drafts', () => {
    const personal = prepareCiviTurn(turn('What Opportunities have I applied to?'));
    expect(
      reviewLlmAnswerForLearning({
        question: 'What Opportunities have I applied to?',
        llmAnswer: 'You have two open applications in Contribute.',
        prep: { ...personal, skipLlm: false },
      }).action,
    ).toBe('skip');

    const draft = prepareCiviTurn(turn('Help me draft a partnership proposal to a university.'));
    expect(
      reviewLlmAnswerForLearning({
        question: 'Help me draft a partnership proposal to a university.',
        llmAnswer: 'Here is a full proposal draft with sections for purpose, terms, and next steps.',
        prep: { ...draft, skipLlm: false },
      }).action,
    ).toBe('skip');
  });

  it('does not learn when Civi already had the answer', () => {
    const prep = prepareCiviTurn(turn("What's Civizen in one sentence?"));
    const decision = reviewLlmAnswerForLearning({
      question: "What's Civizen in one sentence?",
      llmAnswer: 'Civizen is an open participatory system.',
      prep,
    });
    expect(decision.action).toBe('skip');
  });
});
