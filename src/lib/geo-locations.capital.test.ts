import { readFileSync } from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { buildGeoCatalog, type RawCity, type RawState } from '@/lib/geo-catalog-build';
import { listGeoCities, listGeoRegions, resolveCountryCapitalLocation } from '@/lib/geo-locations';

// Serve the per-country files the build writes, straight from the package data.
beforeAll(() => {
  const assets = path.resolve(process.cwd(), 'node_modules/country-state-city/lib/assets');
  const states = JSON.parse(readFileSync(path.join(assets, 'state.json'), 'utf8')) as RawState[];
  const cities = JSON.parse(readFileSync(path.join(assets, 'city.json'), 'utf8')) as RawCity[];
  const catalog = buildGeoCatalog(states, cities);
  vi.stubGlobal('fetch', async (url: string) => {
    const code = /([A-Z]{2})\.json$/.exec(url)?.[1];
    const data = code ? catalog.get(code) : undefined;
    return { ok: Boolean(data), json: async () => data };
  });
});

describe('resolveCountryCapitalLocation', () => {
  it('resolves Armenia to Yerevan and its region', async () => {
    const location = await resolveCountryCapitalLocation('AM');
    expect(location?.city).toMatch(/Yerevan/i);
    expect(location?.regionCode).toBeTruthy();
  });

  it('resolves US to Washington, D.C. in DC', async () => {
    const location = await resolveCountryCapitalLocation('US');
    expect(location?.city.toLowerCase()).toContain('washington');
    expect(location?.regionCode).toBe('DC');
  });
});

describe('per-country catalog', () => {
  it('lists regions and cities for a country', async () => {
    const regions = await listGeoRegions('us');
    expect(regions.find((region) => region.code === 'CA')?.name).toBe('California');
    expect(await listGeoCities('US', 'ca')).toContain('Bakersfield');
  });

  it('returns nothing for an unknown country', async () => {
    expect(await listGeoRegions('ZZ')).toEqual([]);
  });
});
