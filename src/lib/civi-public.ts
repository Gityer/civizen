import { supabase } from '@/integrations/supabase/client';
import {
  classifyCiviInteractionSource,
  shouldRecordCiviInteraction,
} from '@/lib/assistant/interaction-log';
import { learnedMemoryFromRow } from '@/lib/assistant/learned-memory';
import type { CiviLearnedMemory, HistoryTurn, NelaTurnPrep } from '@/lib/assistant/types';

export const CIVI_PUBLIC_HISTORY_LIMIT = 12;
export const CIVI_PUBLIC_MESSAGE_MAX = 2000;

export function sanitizeCiviPublicHistory(history: HistoryTurn[]): HistoryTurn[] {
  return history
    .filter((turn) => (turn.role === 'user' || turn.role === 'assistant') && typeof turn.content === 'string')
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, CIVI_PUBLIC_MESSAGE_MAX),
    }))
    .filter((turn) => turn.content.length > 0)
    .slice(-CIVI_PUBLIC_HISTORY_LIMIT);
}

export async function listCiviLearnedMemories(): Promise<CiviLearnedMemory[]> {
  try {
    const { data, error } = await supabase.rpc('list_civi_learned_memories', { p_limit: 200 });
    if (error || !Array.isArray(data)) return [];
    return data.map(learnedMemoryFromRow).filter((row): row is CiviLearnedMemory => Boolean(row));
  } catch {
    return [];
  }
}

async function recordPublicFallbackInteraction(question: string, prep: NelaTurnPrep) {
  const source = classifyCiviInteractionSource({ prep, usedModel: false });
  if (!shouldRecordCiviInteraction({ question, source })) return;
  try {
    await supabase.rpc('ingest_civi_interaction', {
      p_audience: 'guest',
      p_channel: 'public',
      p_question: question.slice(0, CIVI_PUBLIC_MESSAGE_MAX),
      p_answer: prep.groundedAnswer.slice(0, 8000),
      p_answer_source: source,
      p_remembered: false,
    });
  } catch {
    /* review log is best-effort */
  }
}

export async function askCiviPublic(message: string, history: HistoryTurn[] = []): Promise<string> {
  const trimmed = message.trim().slice(0, CIVI_PUBLIC_MESSAGE_MAX);
  if (!trimmed) return '';

  const safeHistory = sanitizeCiviPublicHistory(history);
  const memories = await listCiviLearnedMemories();
  const { prepareNelaTurn } = await import('@/lib/assistant/orchestrator');
  const prep = prepareNelaTurn([...safeHistory, { role: 'user', content: trimmed }], {
    audience: 'guest',
    learnedMemories: memories,
  });

  // Peace, hardship, greetings, and other grounded replies must not wait on the live model.
  if (prep.skipLlm || import.meta.env.DEV) {
    await recordPublicFallbackInteraction(trimmed, prep);
    return prep.groundedAnswer;
  }

  const { data, error } = await supabase.functions.invoke('messaging-agent-reply', {
    body: {
      public: true,
      message: trimmed,
      history: safeHistory,
    },
  });

  const reply = typeof data?.reply === 'string' ? data.reply.trim() : '';
  if (!error && reply) return reply;

  await recordPublicFallbackInteraction(trimmed, prep);
  return prep.groundedAnswer;
}

