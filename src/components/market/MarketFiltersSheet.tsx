import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_MARKET_FILTERS,
  MARKET_SORTS,
  parseLumaInput,
  type MarketFilters,
  type MarketSort,
} from '@/lib/market-filters';

type MarketFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
  value: MarketFilters;
  onChange: (next: MarketFilters) => void;
};

const SORT_LABEL_KEYS: Record<MarketSort, string> = {
  newest: 'market.filtersSortNewest',
  price_asc: 'market.filtersSortPriceAsc',
  price_desc: 'market.filtersSortPriceDesc',
};

/** Price range, sort order and stock filters for Market listings. */
export function MarketFiltersSheet({ open, onOpenChange, t, value, onChange }: MarketFiltersSheetProps) {
  const [minDraft, setMinDraft] = useState('');
  const [maxDraft, setMaxDraft] = useState('');
  const [sort, setSort] = useState<MarketSort>(value.sort);
  const [inStockOnly, setInStockOnly] = useState(value.inStockOnly);

  useEffect(() => {
    if (!open) return;
    setMinDraft(value.minLuma != null ? String(value.minLuma) : '');
    setMaxDraft(value.maxLuma != null ? String(value.maxLuma) : '');
    setSort(value.sort);
    setInStockOnly(value.inStockOnly);
  }, [open, value]);

  const apply = () => {
    let minLuma = parseLumaInput(minDraft);
    let maxLuma = parseLumaInput(maxDraft);
    if (minLuma != null && maxLuma != null && minLuma > maxLuma) [minLuma, maxLuma] = [maxLuma, minLuma];
    onChange({ minLuma, maxLuma, sort, inStockOnly });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader>
          <SheetTitle>{t('market.filtersTitle')}</SheetTitle>
          <SheetDescription>{t('market.filtersSubtitle')}</SheetDescription>
        </SheetHeader>
        <div className="mx-auto mt-4 w-full max-w-md space-y-5 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="market-filter-min">{t('market.filtersMinPrice')}</Label>
              <Input id="market-filter-min" inputMode="decimal" value={minDraft} onChange={(e) => setMinDraft(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="market-filter-max">{t('market.filtersMaxPrice')}</Label>
              <Input id="market-filter-max" inputMode="decimal" value={maxDraft} onChange={(e) => setMaxDraft(e.target.value)} placeholder="—" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="market-filter-sort">{t('market.filtersSort')}</Label>
            <Select value={sort} onValueChange={(next) => setSort(next as MarketSort)}>
              <SelectTrigger id="market-filter-sort"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MARKET_SORTS.map((option) => (
                  <SelectItem key={option} value={option}>{t(SORT_LABEL_KEYS[option])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="market-filter-stock" className="font-normal">{t('market.filtersInStock')}</Label>
            <Switch id="market-filter-stock" checked={inStockOnly} onCheckedChange={setInStockOnly} />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => { onChange(DEFAULT_MARKET_FILTERS); onOpenChange(false); }}>
              {t('market.filtersReset')}
            </Button>
            <Button type="button" className="flex-1" onClick={apply}>{t('market.filtersApply')}</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
