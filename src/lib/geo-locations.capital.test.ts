import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { resolveCountryCapitalLocation, setGeoFetcher } from '@/lib/geo-locations';

beforeAll(async () => {
  const { writeGeoData } = await import('../../scripts/geo-data.mjs');
  await writeGeoData();
  setGeoFetcher(async (code) => JSON.parse(readFileSync(join(process.cwd(), 'public/geo/v1', `${code}.json`), 'utf8')));
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
