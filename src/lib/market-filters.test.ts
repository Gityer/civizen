import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MARKET_FILTERS,
  applyMarketFilters,
  countActiveMarketFilters,
  parseLumaInput,
} from '@/lib/market-filters';
import type { PublishedMarketListing } from '@/lib/use-market-published-listings';

function listing(id: string, priceLumens: number, createdAt: string, extra: Partial<PublishedMarketListing> = {}) {
  return {
    id,
    title: id,
    description: null,
    price_lumens: priceLumens,
    remaining_quantity: 1,
    created_at: createdAt,
    seller_profile_id: 's',
    listing_kind: 'product',
    profiles: null,
    ...extra,
  } as PublishedMarketListing;
}

const items = [
  listing('cheap', 500, '2026-10-01'),
  listing('mid', 2500, '2026-10-03'),
  listing('dear', 9000, '2026-10-02', { remaining_quantity: 0 }),
];

describe('market filters', () => {
  it('keeps everything in the feed order by default', () => {
    expect(applyMarketFilters(items, DEFAULT_MARKET_FILTERS).map((l) => l.id)).toEqual(['cheap', 'mid', 'dear']);
    expect(countActiveMarketFilters(DEFAULT_MARKET_FILTERS)).toBe(0);
  });

  it('filters by price in Luma and sorts by price', () => {
    const filters = { ...DEFAULT_MARKET_FILTERS, minLuma: 10, maxLuma: 100, sort: 'price_desc' as const };
    expect(applyMarketFilters(items, filters).map((l) => l.id)).toEqual(['dear', 'mid']);
    expect(countActiveMarketFilters(filters)).toBe(3);
  });

  it('hides sold-out products when asked', () => {
    const filters = { ...DEFAULT_MARKET_FILTERS, inStockOnly: true, sort: 'price_asc' as const };
    expect(applyMarketFilters(items, filters).map((l) => l.id)).toEqual(['cheap', 'mid']);
  });

  it('reads price boxes leniently', () => {
    expect(parseLumaInput('')).toBeNull();
    expect(parseLumaInput('12,5')).toBe(12.5);
    expect(parseLumaInput('-3')).toBeNull();
    expect(parseLumaInput('abc')).toBeNull();
  });
});
