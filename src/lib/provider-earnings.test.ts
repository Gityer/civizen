import { describe, expect, it } from 'vitest';

import type { AgreementListItem } from '@/lib/agreements-api';
import { counterpartyNames, earningsStage, filterEarningsRows, providesInAgreement, summarizeEarnings } from './provider-earnings';

const base: Omit<AgreementListItem, 'id' | 'status' | 'bucket' | 'parties'> = {
  referenceCode: null, partyReference: null, title: 'A', agreementType: 'employment', summary: null, marketListingId: null,
  createdAt: '2026-10-01T00:00:00Z', effectiveAt: null, endAt: null, executionMethod: null, needsAction: false,
};
const row = (id: string, status: string, bucket: AgreementListItem['bucket'], parties: AgreementListItem['parties']): AgreementListItem => ({ ...base, id, status, bucket, parties });

const ME = 'me';
const rows = [
  row('1', 'active', 'active', [{ displayName: 'Org', profileId: 'org', roleInAgreement: 'employer' }, { displayName: 'Me', profileId: ME, roleInAgreement: 'Employee' }]),
  row('2', 'active', 'active', [{ displayName: 'Me', profileId: ME, roleInAgreement: 'buyer' }, { displayName: 'Shop', profileId: 'shop', roleInAgreement: 'seller' }]),
  row('3', 'proposed', 'needs_action', [{ displayName: 'Me', profileId: ME, roleInAgreement: 'seller' }]),
  row('4', 'completed', 'completed', [{ displayName: 'Me', profileId: ME, roleInAgreement: 'contractor' }]),
  row('5', 'draft', 'draft', [{ displayName: 'Me', profileId: ME, roleInAgreement: 'seller' }]),
];

describe('provider earnings', () => {
  it('knows when the member provides', () => {
    expect(providesInAgreement(rows[0], ME)).toBe(true);
    expect(providesInAgreement(rows[1], ME)).toBe(false);
    expect(providesInAgreement({ parties: [{ displayName: 'Me', profileId: ME, roleInAgreement: null }] }, ME)).toBe(false);
  });

  it('summarizes and filters by stage', () => {
    expect(summarizeEarnings(rows, ME)).toEqual({ providing: 2, active: 2, awaiting: 1, completed: 1 });
    expect(filterEarningsRows(rows, 'providing', ME).map((r) => r.id)).toEqual(['1', '3', '4']);
    expect(filterEarningsRows(rows, 'active', ME).map((r) => r.id)).toEqual(['1', '2']);
    expect(filterEarningsRows(rows, 'awaiting', ME).map((r) => r.id)).toEqual(['3']);
    expect(filterEarningsRows(rows, 'all', ME)).toHaveLength(5);
    expect(earningsStage(rows[4])).toBe('other');
  });

  it('lists the other parties', () => {
    expect(counterpartyNames(rows[0], ME)).toEqual(['Org']);
  });
});
