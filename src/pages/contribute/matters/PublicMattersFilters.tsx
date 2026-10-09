import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCountryName } from '@/lib/countries';
import { MATTER_TYPES, type MatterType } from '@/lib/matters';
import type { PublicMattersFilterValue } from '@/pages/contribute/matters/public-matters-filter';

const ANY = '__any__';

/** Search box plus Area, country and type selects for the public Matters list. */
export function PublicMattersFilters({
  value,
  onChange,
  areas,
  countryOptions,
  language,
  t,
}: {
  value: PublicMattersFilterValue;
  onChange: (next: PublicMattersFilterValue) => void;
  areas: ReadonlyArray<{ id: string; displayName: string }>;
  countryOptions: readonly string[];
  language: string;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-2" data-testid="public-matters-filters">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
          placeholder={t('contribute.matters.publicSearchPlaceholder')}
          aria-label={t('contribute.matters.publicSearchPlaceholder')}
          className="pl-9"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Select value={value.areaNodeId || ANY} onValueChange={(next) => onChange({ ...value, areaNodeId: next === ANY ? '' : next })}>
          <SelectTrigger aria-label={t('contribute.matters.areaLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('contribute.matters.filterAllAreas')}</SelectItem>
            {areas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.scopeCountryCode || ANY}
          onValueChange={(next) => onChange({ ...value, scopeCountryCode: next === ANY ? '' : next })}
        >
          <SelectTrigger aria-label={t('contribute.matters.scopeCountryLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('contribute.matters.filterAllCountries')}</SelectItem>
            {countryOptions.map((code) => (
              <SelectItem key={code} value={code}>
                {getCountryName(code, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.matterType || ANY}
          onValueChange={(next) => onChange({ ...value, matterType: next === ANY ? '' : (next as MatterType) })}
        >
          <SelectTrigger aria-label={t('contribute.matters.typeLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t('contribute.matters.filterAllTypes')}</SelectItem>
            {MATTER_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`contribute.matters.types.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
