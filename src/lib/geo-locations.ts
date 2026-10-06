import { getCountryOptions } from '@/lib/countries';
import { getCountryCapitalName } from '@/lib/country-capitals';
import { GEO_CATALOG_DIR } from '@/lib/geo-catalog-build';

export type GeoRegionOption = {
  code: string;
  name: string;
};

export type GeoCapitalLocation = {
  city: string;
  regionCode: string | null;
};

type GeoCountryData = {
  regions: GeoRegionOption[];
  cities: Record<string, string[]>;
};

const EMPTY_COUNTRY: GeoCountryData = { regions: [], cities: {} };
const countryCache = new Map<string, Promise<GeoCountryData>>();

/**
 * One country's regions and cities, from the per-country files vite.config.ts writes to /geo.
 * A failed download is not cached, so the next call tries again.
 */
function loadCountry(countryCode: string): Promise<GeoCountryData> {
  let pending = countryCache.get(countryCode);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}${GEO_CATALOG_DIR}/${countryCode}.json`)
      .then((response) => (response.ok ? (response.json() as Promise<GeoCountryData>) : EMPTY_COUNTRY))
      .catch(() => {
        countryCache.delete(countryCode);
        return EMPTY_COUNTRY;
      });
    countryCache.set(countryCode, pending);
  }
  return pending;
}

function normalizePlaceName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function capitalMatchScore(cityName: string, capitalName: string): number {
  const city = normalizePlaceName(cityName);
  const capital = normalizePlaceName(capitalName);
  if (!city || !capital) return 0;
  if (city === capital) return 100;
  // Allow "Washington D C" style extensions, but not "Londonderry" for "London".
  const tokens = city.split(/\s+/).filter(Boolean);
  if (tokens[0] === capital && tokens.length > 1) return 85;
  return 0;
}

/** All ISO country codes used across Civizen (sorted by localized name). */
export function listGeoCountryCodes(locale: string): string[] {
  return getCountryOptions(locale).map((option) => option.code);
}

/** States / provinces for a country (ISO 3166-2 style codes). */
export async function listGeoRegions(countryCode: string): Promise<GeoRegionOption[]> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return [];

  const { regions } = await loadCountry(code);
  return [...regions].sort((left, right) => left.name.localeCompare(right.name));
}

/** Cities for a country + state/region code. */
export async function listGeoCities(countryCode: string, regionCode: string): Promise<string[]> {
  const country = countryCode.trim().toUpperCase();
  const region = regionCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country) || !region) return [];

  const { cities } = await loadCountry(country);
  const match = Object.keys(cities).find((key) => key.toUpperCase() === region);
  return match ? [...cities[match]].sort((left, right) => left.localeCompare(right)) : [];
}

/** Cities for a country (all states). Prefer listGeoCities when a region is known. */
export async function listGeoCitiesOfCountry(countryCode: string): Promise<string[]> {
  const country = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return [];

  const { cities } = await loadCountry(country);
  const names = Object.values(cities).flat();
  return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right));
}


/**
 * Resolve a country’s capital city and matching region/state code from the geo catalog.
 * Used when profile location cannot auto-fill after a country change.
 */
export async function resolveCountryCapitalLocation(
  countryCode: string,
): Promise<GeoCapitalLocation | null> {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;

  const capitalName = getCountryCapitalName(code);
  if (!capitalName) return null;

  const { cities } = await loadCountry(code);
  let best: { name: string; stateCode: string; score: number } | null = null;

  for (const [stateCode, names] of Object.entries(cities)) {
    for (const name of names) {
      const score = capitalMatchScore(name, capitalName);
      if (score <= 0) continue;
      if (!best || score > best.score || (score === best.score && name.length > best.name.length)) {
        best = { name, stateCode, score };
      }
    }
  }

  if (best) {
    return {
      city: best.name,
      regionCode: best.stateCode || null,
    };
  }

  // Capital known but not present in the city catalog — still show the capital name.
  return { city: capitalName, regionCode: null };
}

export function getGeoRegionName(
  regions: GeoRegionOption[],
  regionCode: string | null | undefined,
): string | null {
  if (!regionCode) return null;
  const match = regions.find((region) => region.code.toUpperCase() === regionCode.toUpperCase());
  return match?.name ?? null;
}
