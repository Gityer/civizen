import { describe, expect, it } from 'vitest';

import type { AgreementRow } from '@/lib/agreements';
import {
  filterSellerEarningsRows,
  sellerEarningsKindFromAgreement,
  summarizeSellerEarnings,
} from '@/lib/seller-earnings';

function row(partial: Partial<AgreementRow> & Pick<AgreementRow, 'id' | 'status' | 'listing_kind_snapshot'>): AgreementRow {
  return {
    activated_at: null,
    agreement_type: null,
    amends_agreement_id: null,
    body_markdown: '',
    buyer_profile_id: 'buyer',
    buyer_signed_at: null,
    completed_at: null,
    created_at: '2026-08-01T00:00:00Z',
    current_version_id: null,
    effective_at: null,
    end_at: null,
    executed_at: null,
    executed_version_id: null,
    execution_method: null,
    initiator_profile_id: 'buyer',
    listing_price_lumens_snapshot: 100,
    listing_title_snapshot: 'Sample',
    market_listing_id: null,
    owner_profile_id: null,
    party_reference: null,
    reference_code: null,
    seller_profile_id: 'seller',
    seller_signed_at: null,
    signed_at: null,
    signed_snapshot: null,
    summary: null,
    template_key: 'product',
    terminated_at: null,
    termination_reason: null,
    title: null,
    updated_at: '2026-08-01T00:00:00Z',
    ...partial,
  };
}

describe('seller-earnings', () => {
  it('classifies product vs service from listing kind snapshot', () => {
    expect(sellerEarningsKindFromAgreement(row({ id: '1', status: 'signed', listing_kind_snapshot: 'service' }))).toBe(
      'service',
    );
    expect(sellerEarningsKindFromAgreement(row({ id: '2', status: 'signed', listing_kind_snapshot: 'product' }))).toBe(
      'product',
    );
  });

  it('summarizes signed sales and pending agreements', () => {
    const summary = summarizeSellerEarnings([
      row({ id: '1', status: 'signed', listing_kind_snapshot: 'product', listing_price_lumens_snapshot: 200 }),
      row({ id: '2', status: 'signed', listing_kind_snapshot: 'service', listing_price_lumens_snapshot: 50 }),
      row({ id: '3', status: 'pending_counterparty', listing_kind_snapshot: 'product', listing_price_lumens_snapshot: 999 }),
      row({ id: '4', status: 'draft', listing_kind_snapshot: 'service', listing_price_lumens_snapshot: 10 }),
      row({ id: '5', status: 'cancelled', listing_kind_snapshot: 'product', listing_price_lumens_snapshot: 10 }),
    ]);

    expect(summary.productsSold).toBe(1);
    expect(summary.servicesSold).toBe(1);
    expect(summary.pendingCount).toBe(2);
    expect(summary.signedIllustrativeLumens).toBe(250);
  });

  it('filters rows by kind and status', () => {
    const rows = [
      row({ id: '1', status: 'signed', listing_kind_snapshot: 'product' }),
      row({ id: '2', status: 'signed', listing_kind_snapshot: 'service' }),
      row({ id: '3', status: 'draft', listing_kind_snapshot: 'product' }),
    ];
    expect(filterSellerEarningsRows(rows, 'service').map((r) => r.id)).toEqual(['2']);
    expect(filterSellerEarningsRows(rows, 'signed').map((r) => r.id)).toEqual(['1', '2']);
    expect(filterSellerEarningsRows(rows, 'pending').map((r) => r.id)).toEqual(['3']);
  });
});
