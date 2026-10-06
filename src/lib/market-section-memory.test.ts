// @vitest-environment jsdom
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  forYouHasUnseenListings,
  MARKET_FALLBACK_SECTION,
  readLastMarketSection,
  resolveMarketSection,
  writeForYouSeenAt,
  writeLastMarketSection,
} from '@/lib/market-section-memory';

describe('market-section-memory', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('remembers the last section and falls back to jobs', () => {
    expect(readLastMarketSection()).toBeNull();
    expect(resolveMarketSection({ sectionParam: null })).toBe(MARKET_FALLBACK_SECTION);

    writeLastMarketSection('local');
    expect(readLastMarketSection()).toBe('local');
    expect(resolveMarketSection({ sectionParam: null })).toBe('local');
  });

  it('prefers an explicit section query over memory', () => {
    writeLastMarketSection('local');
    expect(resolveMarketSection({ sectionParam: 'vehicles' })).toBe('vehicles');
  });

  it('opens For you when there are unseen listings', () => {
    writeLastMarketSection('jobs');
    writeForYouSeenAt('2026-01-01T00:00:00.000Z');

    expect(
      forYouHasUnseenListings([{ created_at: '2026-08-01T00:00:00.000Z' }], '2026-01-01T00:00:00.000Z'),
    ).toBe(true);

    expect(
      resolveMarketSection({
        sectionParam: null,
        listingsReady: true,
        listings: [{ created_at: '2026-08-01T00:00:00.000Z' }],
      }),
    ).toBe('for-you');
  });

  it('keeps the remembered section when For you has nothing new', () => {
    writeLastMarketSection('local');
    writeForYouSeenAt('2026-08-04T00:00:00.000Z');

    expect(
      resolveMarketSection({
        sectionParam: null,
        listingsReady: true,
        listings: [{ created_at: '2026-08-01T00:00:00.000Z' }],
      }),
    ).toBe('local');
  });
});
