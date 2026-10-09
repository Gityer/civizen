import { supabase } from '@/integrations/supabase/client';

/** Civic voting RPCs are not yet in generated Database types. */
const db = supabase;

/** Real aggregate counts for one election, as returned by `civic_election_observer_metrics`. */
export type CivicObserverSnapshot = {
  eligibleRosterCount: number;
  ballotsCountable: number;
  ballotsWithdrawn: number;
  sessionsByStatus: Record<string, number>;
  averageAttemptsCast: number | null;
  gateChecks: Array<{ kind: string; result: string; count: number }>;
  riskFindingsBySeverity: Record<string, number>;
  canvassSamples: number;
  canvassReviewed: number;
  eventsRecorded: number;
  isSample: boolean;
};

export type CivicObserverSummary = {
  /** null when the election has no eligibility roster (ordinary consultations). */
  turnoutRate: number | null;
  sessionsCast: number;
  sessionsVoided: number;
  sessionsMissed: number;
  sessionsFailed: number;
  sessionsExhausted: number;
  hasSessions: boolean;
  gateFailRates: Array<{ kind: string; failed: number; total: number; rate: number }>;
  riskTotal: number;
  hasCanvass: boolean;
};

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const numRecord = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, count]) => [key, num(count)]),
  );
};

export function parseObserverSnapshot(raw: unknown): CivicObserverSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const gateChecks = Array.isArray(row.gate_checks)
    ? (row.gate_checks as Array<Record<string, unknown>>).map((check) => ({
        kind: String(check.kind ?? ''),
        result: String(check.result ?? ''),
        count: num(check.count),
      }))
    : [];
  return {
    eligibleRosterCount: num(row.eligible_roster_count),
    ballotsCountable: num(row.ballots_countable),
    ballotsWithdrawn: num(row.ballots_withdrawn),
    sessionsByStatus: numRecord(row.sessions_by_status),
    averageAttemptsCast:
      row.average_attempts_cast === null || row.average_attempts_cast === undefined
        ? null
        : num(row.average_attempts_cast),
    gateChecks,
    riskFindingsBySeverity: numRecord(row.risk_findings_by_severity),
    canvassSamples: num(row.canvass_samples),
    canvassReviewed: num(row.canvass_reviewed),
    eventsRecorded: num(row.events_recorded),
    isSample: Boolean(row.is_sample),
  };
}

export function summarizeObserverSnapshot(snapshot: CivicObserverSnapshot): CivicObserverSummary {
  const status = (key: string) => snapshot.sessionsByStatus[key] ?? 0;
  const sessionsCast = status('cast');
  const totals = new Map<string, { failed: number; total: number }>();
  for (const check of snapshot.gateChecks) {
    const entry = totals.get(check.kind) ?? { failed: 0, total: 0 };
    entry.total += check.count;
    if (check.result === 'failed') entry.failed += check.count;
    totals.set(check.kind, entry);
  }
  const gateFailRates = [...totals.entries()].map(([kind, { failed, total }]) => ({
    kind,
    failed,
    total,
    rate: total === 0 ? 0 : failed / total,
  }));
  const riskTotal = Object.values(snapshot.riskFindingsBySeverity).reduce((sum, n) => sum + n, 0);
  return {
    turnoutRate:
      snapshot.eligibleRosterCount > 0 ? sessionsCast / snapshot.eligibleRosterCount : null,
    sessionsCast,
    sessionsVoided: status('voided'),
    sessionsMissed: status('missed'),
    sessionsFailed: status('failed'),
    sessionsExhausted: status('exhausted'),
    hasSessions: Object.values(snapshot.sessionsByStatus).some((n) => n > 0),
    gateFailRates,
    riskTotal,
    hasCanvass: snapshot.canvassSamples > 0,
  };
}

export async function loadCivicElectionObserverMetrics(electionId: string): Promise<{
  snapshot: CivicObserverSnapshot | null;
  error: string | null;
}> {
  const { data, error } = await db.rpc('civic_election_observer_metrics', {
    p_election_id: electionId,
  });
  if (error) return { snapshot: null, error: error.message };
  return { snapshot: parseObserverSnapshot(data), error: null };
}
