import { describe, expect, it } from 'vitest';

import { fitAgreementDatePicker } from '@/components/agreements/agreement-date-fit';

describe('fitAgreementDatePicker', () => {
  it('shifts left when the calendar would overflow the right edge', () => {
    const placed = fitAgreementDatePicker({
      trigger: { left: 250, right: 360, top: 400, bottom: 420 },
      size: { width: 280, height: 300 },
      viewport: { width: 390, height: 844 },
    });
    expect(placed.left + 280).toBeLessThanOrEqual(390 - 8);
    expect(placed.left).toBeGreaterThanOrEqual(8);
  });

  it('opens above the date when there is not enough room below', () => {
    const placed = fitAgreementDatePicker({
      trigger: { left: 24, right: 120, top: 720, bottom: 740 },
      size: { width: 280, height: 300 },
      viewport: { width: 390, height: 844 },
    });
    expect(placed.top + 300).toBeLessThanOrEqual(844 - 8);
    expect(placed.top).toBeLessThan(720);
  });
});
