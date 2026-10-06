import type { PublishedMarketListing } from '@/lib/use-market-published-listings';

export const MARKET_SORTS = ['newest', 'price_asc', 'price_desc'] as const;
export type MarketSort = (typeof MARKET_SORTS)[number];

/** Prices are entered in Luma; listings store hundredths (lumens). */
export type MarketFilters = {
  minLuma: number | null;
  maxLuma: number | null;
  sort: MarketSort;
  inStockOnly: boolean;
};

export const DEFAULT_MARKET_FILTERS: MarketFilters = { minLuma: null, maxLuma: null, sort: 'newest', inStockOnly: false };

export function countActiveMarketFilters(filters: MarketFilters): number {
  return (
    (filters.minLuma != null ? 1 : 0)
    + (filters.maxLuma != null ? 1 : 0)
    + (filters.sort !== 'newest' ? 1 : 0)
    + (filters.inStockOnly ? 1 : 0)
  );
}

/** Parses a price box; empty or invalid input means "no limit". */
export function parseLumaInput(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function applyMarketFilters(
  listings: PublishedMarketListing[],
  filters: MarketFilters,
): PublishedMarketListing[] {
  const min = filters.minLuma != null ? Math.round(filters.minLuma * 100) : null;
  const max = filters.maxLuma != null ? Math.round(filters.maxLuma * 100) : null;
  const kept = listings.filter((listing) => {
    if (min != null && listing.price_lumens < min) return false;
    if (max != null && listing.price_lumens > max) return false;
    if (filters.inStockOnly && listing.listing_kind === 'product' && listing.remaining_quantity <= 0) return false;
    return true;
  });
  if (filters.sort === 'price_asc') return [...kept].sort((a, b) => a.price_lumens - b.price_lumens);
  if (filters.sort === 'price_desc') return [...kept].sort((a, b) => b.price_lumens - a.price_lumens);
  // "Newest" keeps the feed's own order (already newest first, with any For you boosts applied).
  return kept;
}
