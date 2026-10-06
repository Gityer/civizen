// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { fundingCommitmentsToCsv } from './ledger';
import type { FundingCommitmentRow } from './types';

describe('fundingCommitmentsToCsv', () => {
  it('includes funder legal name and escapes commas', () => {
    const rows: FundingCommitmentRow[] = [
      {
        id: 'c1',
        funder_id: 'f1',
        lane: 'donation',
        amount_original: 5000,
        currency: 'USD',
        amount_usd: 5000,
        payment_method: 'wire',
        status: 'received',
        restrictions: 'Education only, no investor use',
        restriction_code: 'EDU',
        agreement_id: null,
        receipt_id: 'R-1',
        date_pledged: null,
        date_received: '2026-07-18',
        notes: null,
        created_at: '2026-07-18T00:00:00.000Z',
        funders: {
          legal_name: 'Ada, Foundation',
          public_display_name: 'Ada',
          funder_type: 'foundation',
          country: 'US',
          email: null,
        },
      },
    ];

    const csv = fundingCommitmentsToCsv(rows);
    expect(csv).toContain('"Ada, Foundation"');
    expect(csv).toContain('"Education only, no investor use"');
  });
});
