// Writes one small JSON file per country into public/geo/v1/<CC>.json (states and cities) from the
// country-state-city package, so the app fetches only the country a member picks instead of bundling every city in
// the world (an 8.7 MB chunk before v2 plan step B2). Deterministic output (sorted), regenerated only when the
// package version changes. Used by the Vite plugin in vite.config.ts and runnable as `node scripts/geo-data.mjs`.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'geo', 'v1');
const STAMP = join(OUT_DIR, '.version');

export async function writeGeoData({ force = false } = {}) {
  const require = createRequire(import.meta.url);
  const pkg = JSON.parse(readFileSync(require.resolve('country-state-city/package.json'), 'utf8'));
  const stamp = `country-state-city@${pkg.version}`;
  if (!force && existsSync(STAMP) && readFileSync(STAMP, 'utf8').trim() === stamp) return { skipped: true };

  const { Country, State, City } = await import('country-state-city');
  mkdirSync(OUT_DIR, { recursive: true });
  let files = 0;
  for (const country of Country.getAllCountries()) {
    const code = country.isoCode.toUpperCase();
    const states = State.getStatesOfCountry(code)
      .map((state) => [state.isoCode, state.name])
      .sort((a, b) => a[1].localeCompare(b[1], 'en'));
    const cities = (City.getCitiesOfCountry(code) ?? [])
      .map((city) => [city.name, city.stateCode])
      .sort((a, b) => a[0].localeCompare(b[0], 'en') || String(a[1]).localeCompare(String(b[1]), 'en'));
    writeFileSync(join(OUT_DIR, `${code}.json`), JSON.stringify({ s: states, c: cities }));
    files += 1;
  }
  writeFileSync(STAMP, `${stamp}\n`);
  return { skipped: false, files };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeGeoData({ force: process.argv.includes('--force') }).then((result) => {
    console.log(result.skipped ? 'geo data up to date' : `geo data written: ${result.files} countries`);
  });
}
