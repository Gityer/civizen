// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import {
  formatMaskedPhone,
  formatPayDisplay,
  formatPostedOn,
  listingMatchesFilters,
  listingModeForViewer,
  type PublicMarketJobListing,
} from '@/lib/market-job-listings';

const listing: PublicMarketJobListing = {
  id: '1',
  created_at: '2026-08-14T12:00:00.000Z',
  mode: 'seeker',
  job_types: ['Driver', 'Cook'],
  city: 'Yerevan',
  region_code: null,
  country_code: 'AM',
  age: '30',
  pay_amount: '200000',
  pay_period: 'Monthly pay',
  display_name: 'Benyamin A.',
  phone_country_code: 'AM',
  has_phone: true,
  is_own: false,
};

describe('market-job-listings helpers', () => {
  it('maps the opposite listing mode for the public board', () => {
    expect(listingModeForViewer('seeker')).toBe('employer');
    expect(listingModeForViewer('employer')).toBe('seeker');
  });

  it('masks phone numbers with a country dial code and no digits', () => {
    expect(formatMaskedPhone('AM', true)).toBe('+374 ·· ······');
    expect(formatMaskedPhone('AM', false)).toBe('—');
  });

  it('formats pay with a short period', () => {
    expect(formatPayDisplay('200000', 'Monthly pay')).toBe('200000 /M');
    expect(formatPayDisplay('', 'Monthly pay')).toBe('—');
  });

  it('formats posted-on dates as day month year', () => {
    expect(formatPostedOn('2026-07-31T10:00:00.000Z')).toMatch(/31 Jul 26/);
  });

  it('filters by selected job types, country, and city', () => {
    expect(listingMatchesFilters(listing, { jobTypes: ['Cook'] })).toBe(true);
    expect(listingMatchesFilters(listing, { jobTypes: ['Electrician'] })).toBe(false);
    expect(listingMatchesFilters(listing, { countryCode: 'AM' })).toBe(true);
    expect(listingMatchesFilters(listing, { countryCode: 'US' })).toBe(false);
    expect(listingMatchesFilters(listing, { city: 'Yerevan' })).toBe(true);
  });
});
