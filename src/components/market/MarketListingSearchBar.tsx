import { Search } from 'lucide-react';
import type { Ref } from 'react';

import { Input } from '@/components/ui/input';
import type { MarketListingKind } from '@/lib/use-market-published-listings';

interface MarketListingSearchBarProps {
  inputRef: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  listingKind: MarketListingKind;
  t: (key: string) => string;
}

export function MarketListingSearchBar({ inputRef, value, onChange, listingKind, t }: MarketListingSearchBarProps) {
  const placeholder =
    listingKind === 'service' ? t('market.searchBarPlaceholderServices') : t('market.searchBarPlaceholder');

  return (
    <div className="mt-3 px-3" data-testid="market-listing-search-bar">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 rounded-full border-border/70 bg-muted/40 pl-9 pr-3 text-sm"
          aria-label={placeholder}
        />
      </div>
    </div>
  );
}
