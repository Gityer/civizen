import { describe, expect, it } from 'vitest';

import {
  classifyCiviInteractionSource,
  filterCiviInteractions,
  groupCiviInteractionsByDay,
  interactionRowFromRpc,
  shouldRecordCiviInteraction,
  type CiviInteractionRow,
} from '@/lib/assistant/interaction-log';
import { prepareCiviTurn } from '@/lib/assistant/orchestrator';
import type { HistoryTurn } from '@/lib/assistant/types';

function turn(content: string): HistoryTurn[] {
  return [{ role: 'user', content }];
}

function row(overrides: Partial<CiviInteractionRow> & { id: string; createdAt: string }): CiviInteractionRow {
  return {
    audience: 'guest',
    channel: 'public',
    question: 'What is Civizen?',
    answer: 'Civizen is an open participatory system.',
    source: 'knowledge',
    remembered: false,
    actorName: null,
    actorUsername: null,
    ...overrides,
  };
}

describe('Civi interaction log helpers', () => {
  it('classifies knowledge, memory, model, and refusal sources', () => {
    const knowledge = prepareCiviTurn(turn("What's Civizen in one sentence?"));
    expect(classifyCiviInteractionSource({ prep: knowledge, usedModel: false })).toBe('knowledge');

    const memoryPrep = {
      ...knowledge,
      diagnostics: { ...knowledge.diagnostics, usedLearnedMemoryKey: 'participatory budgeting' },
    };
    expect(classifyCiviInteractionSource({ prep: memoryPrep, usedModel: false })).toBe('memory');

    const offTopic = prepareCiviTurn(turn('What is the capital of France?'));
    expect(classifyCiviInteractionSource({ prep: offTopic, usedModel: false })).toBe('refusal');

    expect(classifyCiviInteractionSource({ prep: knowledge, usedModel: true })).toBe('model');
    expect(classifyCiviInteractionSource({ prep: null, usedModel: false, abused: true })).toBe('refusal');
  });

  it('skips greetings and empty questions', () => {
    const greeting = prepareCiviTurn(turn('Hello'));
    const source = classifyCiviInteractionSource({ prep: greeting, usedModel: false });
    expect(source).toBe('greeting');
    expect(shouldRecordCiviInteraction({ question: 'Hello', source })).toBe(false);
    expect(shouldRecordCiviInteraction({ question: '  ', source: 'knowledge' })).toBe(false);
    expect(shouldRecordCiviInteraction({ question: 'What is Civizen?', source: 'knowledge' })).toBe(true);
  });

  it('groups rows by local day and filters by question text', () => {
    const rows = [
      row({ id: '1', createdAt: '2026-08-16T18:00:00.000Z', question: 'What are Agreements?' }),
      row({ id: '2', createdAt: '2026-08-16T10:00:00.000Z', question: 'What is Civizen?' }),
      row({ id: '3', createdAt: '2026-08-15T12:00:00.000Z', question: 'How do Jobs work?' }),
    ];
    const groups = groupCiviInteractionsByDay(rows, new Date('2026-08-16T20:00:00.000Z'));
    expect(groups[0]?.labelKind).toBe('today');
    expect(groups[0]?.rows.map((item) => item.id)).toEqual(['1', '2']);
    expect(groups[1]?.labelKind).toBe('yesterday');
    expect(filterCiviInteractions(rows, 'jobs').map((item) => item.id)).toEqual(['3']);
  });

  it('maps RPC rows and drops incomplete records', () => {
    const mapped = interactionRowFromRpc({
      id: 'row-1',
      created_at: '2026-08-16T12:00:00.000Z',
      audience: 'member',
      channel: 'messaging',
      question: 'Can I create an agreement?',
      answer: 'Yes. Open Market > Agreements.',
      answer_source: 'knowledge',
      remembered: false,
      actor_name: 'Dana',
      actor_username: 'dana',
    });
    expect(mapped).toMatchObject({
      id: 'row-1',
      audience: 'member',
      source: 'knowledge',
      actorName: 'Dana',
    });
    expect(interactionRowFromRpc({ id: 'row-2', question: 'Hi' })).toBeNull();
  });
});
