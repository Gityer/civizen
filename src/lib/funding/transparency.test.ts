// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { mapInterestLaneToLedgerLane } from './transparency';

describe('mapInterestLaneToLedgerLane', () => {
  it('maps institutional interest to grant lane', () => {
    expect(mapInterestLaneToLedgerLane('institutional')).toBe('grant');
  });

  it('maps donation and investor 1:1', () => {
    expect(mapInterestLaneToLedgerLane('donation')).toBe('donation');
    expect(mapInterestLaneToLedgerLane('investor')).toBe('investor');
  });
});
