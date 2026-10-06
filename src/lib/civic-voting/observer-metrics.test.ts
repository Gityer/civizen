import { describe, expect, it } from 'vitest';

import { parseObserverSnapshot, summarizeObserverSnapshot } from './observer-metrics';

describe('observer metrics', () => {
  it('parses the RPC payload and tolerates missing fields', () => {
    const snapshot = parseObserverSnapshot({
      eligible_roster_count: '0',
      ballots_countable: 3,
      ballots_withdrawn: '1',
      sessions_by_status: { cast: 3, voided: '1' },
      average_attempts_cast: 1,
      gate_checks: [{ kind: 'liveness', result: 'failed', count: 2 }],
      risk_findings_by_severity: {},
      canvass_samples: 0,
      canvass_reviewed: 0,
      events_recorded: 0,
      is_sample: false,
    });
    expect(snapshot).not.toBeNull();
    expect(snapshot?.ballotsWithdrawn).toBe(1);
    expect(snapshot?.sessionsByStatus.voided).toBe(1);
    expect(parseObserverSnapshot(null)).toBeNull();
  });

  it('reports no turnout when the election has no eligibility roster', () => {
    const summary = summarizeObserverSnapshot({
      eligibleRosterCount: 0,
      ballotsCountable: 2,
      ballotsWithdrawn: 0,
      sessionsByStatus: { cast: 2 },
      averageAttemptsCast: 1,
      gateChecks: [],
      riskFindingsBySeverity: {},
      canvassSamples: 0,
      canvassReviewed: 0,
      eventsRecorded: 0,
      isSample: false,
    });
    expect(summary.turnoutRate).toBeNull();
    expect(summary.sessionsCast).toBe(2);
    expect(summary.hasSessions).toBe(true);
    expect(summary.gateFailRates).toEqual([]);
    expect(summary.hasCanvass).toBe(false);
  });

  it('computes turnout and gate fail rates from real counts', () => {
    const summary = summarizeObserverSnapshot({
      eligibleRosterCount: 200,
      ballotsCountable: 50,
      ballotsWithdrawn: 0,
      sessionsByStatus: { cast: 50, missed: 10 },
      averageAttemptsCast: 1.2,
      gateChecks: [
        { kind: 'liveness', result: 'passed', count: 45 },
        { kind: 'liveness', result: 'failed', count: 5 },
      ],
      riskFindingsBySeverity: { low: 2 },
      canvassSamples: 3,
      canvassReviewed: 1,
      eventsRecorded: 60,
      isSample: false,
    });
    expect(summary.turnoutRate).toBeCloseTo(0.25);
    expect(summary.gateFailRates).toEqual([{ kind: 'liveness', failed: 5, total: 50, rate: 0.1 }]);
    expect(summary.riskTotal).toBe(2);
    expect(summary.hasCanvass).toBe(true);
  });
});
