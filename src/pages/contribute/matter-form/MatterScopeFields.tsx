import { useEffect, useState } from 'react';

import { OutlinedField } from '@/components/ui/outlined-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCountryName } from '@/lib/countries';
import { listGeoCities, listGeoRegions, type GeoRegionOption } from '@/lib/geo-locations';
import { MATTER_SCOPE_KINDS, type MatterScopeKind } from '@/lib/matters';
import type { MatterScopeValue } from '@/pages/contribute/matter-form/matter-scope';

/**
 * Geographic scope of a Matter: global, one country, one region of it, or one city. Region and
 * city lists come from the shared geo catalog, so what the member picks is what the server stores.
 */
export function MatterScopeFields({
  value,
  onChange,
  countryOptions,
  language,
  t,
}: {
  value: MatterScopeValue;
  onChange: (next: MatterScopeValue) => void;
  countryOptions: readonly string[];
  language: string;
  t: (key: string) => string;
}) {
  const [regions, setRegions] = useState<GeoRegionOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const needsCountry = value.scopeKind !== 'global';
  const needsRegion = value.scopeKind === 'region' || value.scopeKind === 'locality';
  const needsCity = value.scopeKind === 'locality';

  useEffect(() => {
    if (!needsRegion || !value.scopeCountryCode) {
      setRegions([]);
      return;
    }
    let active = true;
    void listGeoRegions(value.scopeCountryCode).then((rows) => {
      if (active) setRegions(rows);
    });
    return () => {
      active = false;
    };
  }, [needsRegion, value.scopeCountryCode]);

  useEffect(() => {
    if (!needsCity || !value.scopeCountryCode || !value.scopeRegionCode) {
      setCities([]);
      return;
    }
    let active = true;
    void listGeoCities(value.scopeCountryCode, value.scopeRegionCode).then((rows) => {
      if (active) setCities(rows);
    });
    return () => {
      active = false;
    };
  }, [needsCity, value.scopeCountryCode, value.scopeRegionCode]);

  return (
    <>
      <OutlinedField label={t('contribute.matters.scopeLabel')}>
        <Select
          value={value.scopeKind}
          onValueChange={(next) => {
            const scopeKind = next as MatterScopeKind;
            onChange({
              scopeKind,
              scopeCountryCode: scopeKind === 'global' ? '' : value.scopeCountryCode,
              scopeRegionCode: scopeKind === 'region' || scopeKind === 'locality' ? value.scopeRegionCode : '',
              scopeLocalityCode: scopeKind === 'locality' ? value.scopeLocalityCode : '',
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MATTER_SCOPE_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t(`contribute.matters.scope.${kind}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </OutlinedField>
      {needsCountry ? (
        <OutlinedField label={t('contribute.matters.scopeCountryLabel')}>
          <Select
            value={value.scopeCountryCode || 'none'}
            onValueChange={(next) =>
              onChange({ ...value, scopeCountryCode: next === 'none' ? '' : next, scopeRegionCode: '', scopeLocalityCode: '' })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('contribute.matters.scopeCountryHint')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('contribute.matters.scopeCountryHint')}</SelectItem>
              {countryOptions.map((code) => (
                <SelectItem key={code} value={code}>
                  {getCountryName(code, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OutlinedField>
      ) : null}
      {needsRegion && value.scopeCountryCode ? (
        <OutlinedField label={t('contribute.matters.scopeRegionLabel')}>
          <Select
            value={value.scopeRegionCode || 'none'}
            onValueChange={(next) => onChange({ ...value, scopeRegionCode: next === 'none' ? '' : next, scopeLocalityCode: '' })}
          >
            <SelectTrigger data-testid="matter-scope-region">
              <SelectValue placeholder={t('contribute.matters.scopeRegionHint')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('contribute.matters.scopeRegionHint')}</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.code} value={region.code}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OutlinedField>
      ) : null}
      {needsCity && value.scopeRegionCode ? (
        <OutlinedField label={t('contribute.matters.scopeLocalityLabel')}>
          <Select
            value={value.scopeLocalityCode || 'none'}
            onValueChange={(next) => onChange({ ...value, scopeLocalityCode: next === 'none' ? '' : next })}
          >
            <SelectTrigger data-testid="matter-scope-locality">
              <SelectValue placeholder={t('contribute.matters.scopeLocalityHint')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('contribute.matters.scopeLocalityHint')}</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OutlinedField>
      ) : null}
    </>
  );
}
