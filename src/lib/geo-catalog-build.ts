/**
 * Splits the country-state-city data into one small file per country, so the app downloads a
 * country's regions and cities only when someone picks that country. Runs at build time
 * (vite.config.ts) and in tests; the app itself reads the files with fetch.
 */

/** Rows as stored in country-state-city's state.json and city.json. */
export type RawState = { name: string; isoCode: string; countryCode: string };
export type RawCity = [name: string, countryCode: string, stateCode: string, ...rest: unknown[]];

export type GeoCountryCatalog = {
  regions: { code: string; name: string }[];
  /** City names by region code. */
  cities: Record<string, string[]>;
};

export const GEO_CATALOG_DIR = 'geo';

export function buildGeoCatalog(states: RawState[], cities: RawCity[]): Map<string, GeoCountryCatalog> {
  const catalog = new Map<string, GeoCountryCatalog>();
  const entry = (country: string) => {
    let value = catalog.get(country);
    if (!value) {
      value = { regions: [], cities: {} };
      catalog.set(country, value);
    }
    return value;
  };

  for (const state of states) {
    entry(state.countryCode).regions.push({ code: state.isoCode, name: state.name });
  }
  for (const [name, country, region] of cities) {
    const byRegion = entry(country).cities;
    (byRegion[region] ??= []).push(name);
  }
  return catalog;
}
