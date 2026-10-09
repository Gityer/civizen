import { describe, expect, it } from 'vitest';

import {
  FUNDING_ADMIN_DEFAULT_SECTION,
  FUNDING_SOURCE_WORK_PANELS,
  fundingAdminPath,
  fundingAdminSectionFromLegacyPath,
  parseFundingSourceWorkPanel,
  resolveFundingAdminSection,
  visibleFundingAdminSections,
} from '@/lib/funding/admin-sections';

describe('funding admin sections', () => {
  it('defaults to budget and places economics after program plan', () => {
    expect(FUNDING_ADMIN_DEFAULT_SECTION).toBe('budget');
    expect(visibleFundingAdminSections()).toEqual(['budget', 'program-plan', 'economics', 'overview', 'sources', 'interest']);
    expect(fundingAdminPath('budget')).toBe('/settings/admin/funding');
    expect(fundingAdminPath('program-plan')).toContain('section=program-plan');
    expect(fundingAdminPath('overview')).toContain('section=overview');
  });

  it('has no legacy sections any more; retired names fall back to budget and old paths land on sources', () => {
    expect(visibleFundingAdminSections()).not.toContain('ledger');
    const retired = resolveFundingAdminSection({ sectionParam: 'ledger' });
    expect(retired.section).toBe('budget');
    expect(retired.redirected).toBe(true);
    expect(resolveFundingAdminSection({ sectionParam: 'economics' })).toEqual({ section: 'economics', redirected: false });
    expect(resolveFundingAdminSection({ sectionParam: null })).toEqual({ section: 'budget', redirected: false });
    expect(fundingAdminSectionFromLegacyPath('/settings/admin/funding-ledger')).toBe('sources');
    expect(fundingAdminSectionFromLegacyPath('/settings/admin/funding-interest')).toBe('interest');
  });

  it('parses source work panels for progressive disclosure', () => {
    expect(FUNDING_SOURCE_WORK_PANELS).toEqual(['outreach', 'commitments', 'receipts', 'allocations', 'fees']);
    expect(parseFundingSourceWorkPanel('fees')).toBe('fees');
    expect(parseFundingSourceWorkPanel('nope')).toBe('outreach');
  });
});
