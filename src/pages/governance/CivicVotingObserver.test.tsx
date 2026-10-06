import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CivicObserverSnapshot } from '@/lib/civic-voting/observer-metrics';
import { CivicVotingObserverPanel } from './CivicVotingObserver';

const consultation: CivicObserverSnapshot = {
  eligibleRosterCount: 0,
  ballotsCountable: 4,
  ballotsWithdrawn: 1,
  sessionsByStatus: { cast: 4, voided: 1 },
  averageAttemptsCast: 1,
  gateChecks: [],
  riskFindingsBySeverity: {},
  canvassSamples: 0,
  canvassReviewed: 0,
  eventsRecorded: 0,
  isSample: false,
};

describe('CivicVotingObserverPanel', () => {
  it('shows real ballot counts and says why turnout cannot be computed for a consultation', () => {
    render(<CivicVotingObserverPanel t={(k) => k} snapshot={consultation} />);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getByText('civicVoting.observer.countable')).toBeTruthy();
    expect(screen.getByText('civicVoting.observer.noRoster')).toBeTruthy();
    expect(screen.getByText('civicVoting.observer.noGates')).toBeTruthy();
    expect(screen.getByText('civicVoting.observer.noRisk')).toBeTruthy();
    expect(screen.getByText('civicVoting.observer.noCanvass')).toBeTruthy();
    expect(screen.queryByText(/50\.0%/)).toBeNull();
  });

  it('shows turnout and gate rates when a roster and checks exist', () => {
    render(
      <CivicVotingObserverPanel
        t={(k) => k}
        snapshot={{
          ...consultation,
          eligibleRosterCount: 100,
          sessionsByStatus: { cast: 25 },
          gateChecks: [
            { kind: 'liveness', result: 'passed', count: 9 },
            { kind: 'liveness', result: 'failed', count: 1 },
          ],
        }}
      />,
    );
    expect(screen.getByText('25.0%')).toBeTruthy();
    expect(screen.getByText(/10\.0% · 1\/10/)).toBeTruthy();
  });
});
