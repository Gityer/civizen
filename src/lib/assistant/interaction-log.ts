import type { CiviTurnPrep } from '@/lib/assistant/types';

export const CIVI_DEV_REVIEW_ROLES = ['founder', 'admin', 'system'] as const;

export type CiviInteractionAudience = 'guest' | 'member';
export type CiviInteractionChannel = 'public' | 'messaging';
export type CiviInteractionSource = 'knowledge' | 'memory' | 'model' | 'refusal' | 'greeting';

export type CiviInteractionRow = {
  id: string;
  createdAt: string;
  audience: CiviInteractionAudience;
  channel: CiviInteractionChannel;
  question: string;
  answer: string;
  source: CiviInteractionSource;
  remembered: boolean;
  actorName: string | null;
  actorUsername: string | null;
};

export type CiviInteractionDayGroup = {
  key: string;
  labelKind: 'today' | 'yesterday' | 'date';
  date: Date;
  rows: CiviInteractionRow[];
};

const INTERACTION_SOURCES = new Set<CiviInteractionSource>([
  'knowledge',
  'memory',
  'model',
  'refusal',
  'greeting',
]);

export function canViewCiviAgentSettings(role: string | null | undefined): boolean {
  return role === 'founder' || role === 'admin' || role === 'system';
}

export function classifyCiviInteractionSource(args: {
  prep: CiviTurnPrep | null;
  usedModel: boolean;
  abused?: boolean;
}): CiviInteractionSource {
  if (args.abused) return 'refusal';
  if (!args.prep) return 'refusal';
  if (args.prep.isGreeting) return 'greeting';
  if (!args.prep.inScope) return 'refusal';
  if (args.prep.diagnostics.usedLearnedMemoryKey) return 'memory';
  if (args.usedModel) return 'model';
  return 'knowledge';
}

export function shouldRecordCiviInteraction(args: {
  question: string;
  source: CiviInteractionSource;
}): boolean {
  if (args.source === 'greeting') return false;
  return args.question.trim().length > 0;
}

export function redactSensitiveCiviQuestion(question: string, abused: boolean): string {
  if (abused) return '[Blocked]';
  return question.trim();
}

export function interactionRowFromRpc(row: Record<string, unknown> | null | undefined): CiviInteractionRow | null {
  if (!row || typeof row.id !== 'string') return null;
  const audience = row.audience === 'member' ? 'member' : row.audience === 'guest' ? 'guest' : null;
  const channel = row.channel === 'messaging' ? 'messaging' : row.channel === 'public' ? 'public' : null;
  const source = typeof row.answer_source === 'string' && INTERACTION_SOURCES.has(row.answer_source as CiviInteractionSource)
    ? (row.answer_source as CiviInteractionSource)
    : null;
  const question = typeof row.question === 'string' ? row.question.trim() : '';
  const answer = typeof row.answer === 'string' ? row.answer.trim() : '';
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null;
  if (!audience || !channel || !source || !question || !answer || !createdAt) return null;
  return {
    id: row.id,
    createdAt,
    audience,
    channel,
    question,
    answer,
    source,
    remembered: row.remembered === true,
    actorName: typeof row.actor_name === 'string' && row.actor_name.trim() ? row.actor_name.trim() : null,
    actorUsername: typeof row.actor_username === 'string' && row.actor_username.trim() ? row.actor_username.trim() : null,
  };
}

function startOfLocalDay(value: Date): number {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function groupCiviInteractionsByDay(
  rows: CiviInteractionRow[],
  now = new Date(),
): CiviInteractionDayGroup[] {
  const today = startOfLocalDay(now);
  const yesterday = today - 24 * 60 * 60 * 1000;
  const groups = new Map<string, CiviInteractionDayGroup>();

  for (const row of rows) {
    const date = new Date(row.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const dayStart = startOfLocalDay(date);
    const key = new Date(dayStart).toISOString();
    const existing = groups.get(key);
    const labelKind: CiviInteractionDayGroup['labelKind'] =
      dayStart === today ? 'today' : dayStart === yesterday ? 'yesterday' : 'date';
    if (existing) {
      existing.rows.push(row);
      continue;
    }
    groups.set(key, { key, labelKind, date: new Date(dayStart), rows: [row] });
  }

  return [...groups.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function filterCiviInteractions(
  rows: CiviInteractionRow[],
  query: string,
): CiviInteractionRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => {
    const actor = `${row.actorName ?? ''} ${row.actorUsername ?? ''}`.toLowerCase();
    return (
      row.question.toLowerCase().includes(needle) ||
      row.answer.toLowerCase().includes(needle) ||
      actor.includes(needle)
    );
  });
}
