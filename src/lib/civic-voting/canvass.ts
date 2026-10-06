/**
 * Post-election canvass — random sample of process audits (never ballot content).
 */

export type CanvassEligibleSession = {
  sessionId: string;
  status: string;
};

export type CanvassSample = {
  sessionId: string;
  sampleBucket: 'random' | 'failed_gates' | 'high_risk';
};

export type CanvassPlan = {
  samples: CanvassSample[];
  targetCount: number;
  sampleRate: number;
};

/**
 * Deterministic-ish sampling using a provided RNG so tests can inject Math.random stubs.
 * Prefer sessions that completed a cast; optionally oversample failed/high-risk buckets.
 */
export function planCanvassSamples(input: {
  sessions: CanvassEligibleSession[];
  sampleRate?: number;
  failedSessionIds?: string[];
  highRiskSessionIds?: string[];
  random?: () => number;
}): CanvassPlan {
  const sampleRate = Math.max(0, Math.min(1, input.sampleRate ?? 0.05));
  const random = input.random ?? Math.random;
  const failed = new Set(input.failedSessionIds ?? []);
  const highRisk = new Set(input.highRiskSessionIds ?? []);

  const castSessions = input.sessions.filter((s) => s.status === 'cast');
  const targetCount = Math.max(
    castSessions.length === 0 ? 0 : 1,
    Math.ceil(castSessions.length * sampleRate),
  );

  const shuffled = [...castSessions].sort(() => random() - 0.5);
  const selected = new Map<string, CanvassSample>();

  for (const session of shuffled) {
    if (selected.size >= targetCount) break;
    let bucket: CanvassSample['sampleBucket'] = 'random';
    if (highRisk.has(session.sessionId)) bucket = 'high_risk';
    else if (failed.has(session.sessionId)) bucket = 'failed_gates';
    selected.set(session.sessionId, { sessionId: session.sessionId, sampleBucket: bucket });
  }

  // Ensure oversampled failed/high-risk are included when present.
  for (const sessionId of highRisk) {
    if (selected.size >= targetCount + 2) break;
    if (!selected.has(sessionId)) {
      selected.set(sessionId, { sessionId, sampleBucket: 'high_risk' });
    }
  }
  for (const sessionId of failed) {
    if (selected.size >= targetCount + 2) break;
    if (!selected.has(sessionId)) {
      selected.set(sessionId, { sessionId, sampleBucket: 'failed_gates' });
    }
  }

  return {
    samples: [...selected.values()],
    targetCount,
    sampleRate,
  };
}

export type CanvassReviewAction = 'clear' | 'escalate';

export function advanceCanvassSample(input: {
  status: 'selected' | 'in_review' | 'cleared' | 'escalated';
  action: 'start_review' | CanvassReviewAction;
}): { ok: true; nextStatus: 'in_review' | 'cleared' | 'escalated'; reason?: undefined } | { ok: false; reason: string } {
  if (input.action === 'start_review') {
    if (input.status !== 'selected') return { ok: false, reason: 'not_selected' };
    return { ok: true, nextStatus: 'in_review' };
  }
  if (input.status !== 'in_review' && input.status !== 'selected') {
    return { ok: false, reason: 'not_reviewable' };
  }
  return { ok: true, nextStatus: input.action === 'clear' ? 'cleared' : 'escalated' };
}

/** Canvass notes must never include ballot choice fields. */
export function sanitizeCanvassNotes(notes: string): string {
  return notes
    .replace(/\b(choice|candidate|selection|ciphertext|ballot payload)\b/gi, '[redacted]')
    .trim();
}
