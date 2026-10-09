import { getCountryName } from './countries';
import type { BaseTranslations } from './i18n.base';
import { applyCuratedTranslations } from './i18n/curated';
import { fetchServerLanguagePack } from './i18n.server-pack';
import type { LanguageCode, LanguageOption } from './i18n.languages';

export type TranslationTree = Record<string, unknown>;
export type LocalePreferences = {
  languageCode: LanguageCode;
  countryCode: string;
  country: string;
};

export const bootstrapTranslations = {
  common: {
    appName: 'Civizen',
    loading: 'Loading...',
  },
} satisfies TranslationTree;

const FALLBACK_LANGUAGE = 'en' as LanguageCode;
const LANGUAGE_PACK_PREFIX = 'civizen-i18n-pack';
/** Bump when English brand copy changes so stale machine-translated packs are discarded. */
const LANGUAGE_PACK_VERSION = '228';
const rtlLanguages = new Set<LanguageCode | string>([
  'ar',
  'fa',
  'he',
  'iw',
  'ps',
  'ur',
  'yi',
  'sd',
  'ug',
  'pa-Arab',
  'ms-Arab',
]);

let baseTranslationsCache: TranslationTree | null = null;
let baseTranslationsPromise: Promise<TranslationTree> | null = null;
let languageOptionsCache: readonly LanguageOption[] | null = null;
let languageOptionsPromise: Promise<readonly LanguageOption[]> | null = null;
const inFlightLanguageLoads = new Map<LanguageCode, Promise<TranslationTree>>();
const cachedLanguagePacks = new Map<LanguageCode, TranslationTree>();

function normalizeLocaleCode(value: string): string {
  return value.trim().replace(/_/g, '-');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolvePath(object: unknown, path: string): unknown {
  if (!isObject(object)) return undefined;
  if (path in object) return object[path];

  const [head, ...rest] = path.split('.');
  if (!(head in object)) return undefined;
  if (rest.length === 0) return object[head];

  return resolvePath(object[head], rest.join('.'));
}

function getBrowserLocale(): string {
  if (typeof navigator === 'undefined') return 'en-US';
  return navigator.languages?.[0] || navigator.language || 'en-US';
}

function getLanguageStorageKey(language: LanguageCode): string {
  return `${LANGUAGE_PACK_PREFIX}:${LANGUAGE_PACK_VERSION}:${language}`;
}

/** Replace leftover pre-rebrand brand tokens inside cached/translated strings. */
function scrubLegacyBrandText(input: string): string {
  return input
    .replace(/did:levela:/gi, 'did:civizen:')
    .replace(/Levela/g, 'Civizen')
    .replace(/levela/g, 'civizen');
}

function scrubLegacyBrandTree(node: unknown): unknown {
  if (typeof node === 'string') return scrubLegacyBrandText(node);
  if (Array.isArray(node)) return node.map((item) => scrubLegacyBrandTree(item));
  if (isObject(node)) {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, scrubLegacyBrandTree(value)]),
    );
  }
  return node;
}

function capitalizeDisplayLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;

  const first = trimmed[0];
  if (first.toLocaleLowerCase() === first.toLocaleUpperCase()) {
    return trimmed;
  }

  return `${first.toLocaleUpperCase()}${trimmed.slice(1)}`;
}

function coerceLanguageCode(value: string | null | undefined): LanguageCode | null {
  if (!value) return null;
  const normalized = normalizeLocaleCode(value);
  if (!normalized) return null;
  return normalized as LanguageCode;
}

export function getStoredLanguage(value: string | null | undefined): LanguageCode | null {
  return coerceLanguageCode(value);
}

export function detectLanguageCode(locale = getBrowserLocale()): LanguageCode {
  const normalized = normalizeLocaleCode(locale);
  if (!normalized) return FALLBACK_LANGUAGE;

  const base = normalized.split('-')[0];
  if (!base) return FALLBACK_LANGUAGE;

  if (normalized.toLowerCase().startsWith('en')) return FALLBACK_LANGUAGE;
  return (coerceLanguageCode(normalized) || coerceLanguageCode(base) || FALLBACK_LANGUAGE) as LanguageCode;
}

const timezoneCountryFallbacks: Record<string, string> = {
  'America/Anchorage': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Detroit': 'US',
  'America/Los_Angeles': 'US',
  'America/New_York': 'US',
  'America/Phoenix': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'Europe/Berlin': 'DE',
  'Europe/London': 'GB',
  'Europe/Madrid': 'ES',
  'Europe/Paris': 'FR',
  'Europe/Rome': 'IT',
  'Europe/Warsaw': 'PL',
  'Europe/Kyiv': 'UA',
  'Europe/Moscow': 'RU',
  'Asia/Dubai': 'AE',
  'Asia/Jerusalem': 'IL',
  'Asia/Kolkata': 'IN',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Australia/Melbourne': 'AU',
  'Australia/Sydney': 'AU',
  'Pacific/Auckland': 'NZ',
};

export function detectCountryCode(locale = getBrowserLocale()): string {
  const normalized = normalizeLocaleCode(locale);

  try {
    if (typeof Intl !== 'undefined' && 'Locale' in Intl) {
      const region = new Intl.Locale(normalized).region;
      if (region) return region.toUpperCase();
    }
  } catch {
    // fall through
  }

  const parts = normalized.split('-');
  const region = parts.find(
    (part, index) =>
      index > 0 && ((part.length === 2 && /^[A-Za-z]{2}$/.test(part)) || (part.length === 3 && /^\d{3}$/.test(part))),
  );
  if (region) return region.toUpperCase();

  if (typeof Intl !== 'undefined') {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && timezoneCountryFallbacks[timezone]) {
      return timezoneCountryFallbacks[timezone];
    }
  }

  return detectLanguageCode(locale) === 'es' ? 'ES' : 'US';
}

/**
 * Representative ISO 3166-1 alpha-2 country for a language/locale code (UI flags).
 * Uses locale region when present, otherwise Intl likely-subtags maximize().
 * Non-country locales (e.g. Esperanto) return '' so callers can show a world fallback.
 */
const LANGUAGE_FLAG_REGION_OVERRIDES: Record<string, string> = {
  // UN M.49 “Latin America” — no single flag; Mexico is a common LatAm Spanish stand-in.
  'es-419': 'MX',
  // Esperanto is not tied to a country.
  eo: '',
};

export function getLanguageFlagCountryCode(languageCode: string): string {
  const normalized = normalizeLocaleCode(languageCode);
  const overrideKey = normalized.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(LANGUAGE_FLAG_REGION_OVERRIDES, overrideKey)) {
    return LANGUAGE_FLAG_REGION_OVERRIDES[overrideKey];
  }

  try {
    if (typeof Intl !== 'undefined' && 'Locale' in Intl) {
      const locale = new Intl.Locale(normalized);
      const region = (locale.region || locale.maximize().region || '').toUpperCase();
      if (/^[A-Z]{2}$/.test(region)) return region;
    }
  } catch {
    // fall through
  }

  const parts = normalized.split('-');
  for (let index = parts.length - 1; index >= 1; index -= 1) {
    const part = parts[index];
    if (part.length === 2 && /^[A-Za-z]{2}$/.test(part)) {
      return part.toUpperCase();
    }
  }

  return '';
}

export function detectLocalePreferences(): LocalePreferences {
  const locale = getBrowserLocale();
  const languageCode = detectLanguageCode(locale);
  const countryCode = detectCountryCode(locale);
  return {
    languageCode,
    countryCode,
    country: getCountryName(countryCode, languageCode),
  };
}

export function isRtlLanguage(language: LanguageCode): boolean {
  const normalized = language.toLowerCase();
  return rtlLanguages.has(normalized) || rtlLanguages.has(normalized.split('-')[0]);
}

export async function loadBaseTranslations(): Promise<TranslationTree> {
  if (baseTranslationsCache) return baseTranslationsCache;
  if (!baseTranslationsPromise) {
    baseTranslationsPromise = import('./i18n.base').then((module) => {
      baseTranslationsCache = module.baseTranslations as TranslationTree;
      return baseTranslationsCache;
    });
  }
  return baseTranslationsPromise;
}

/** Sync peek for first paint after a prefetch in `main.tsx`. */
export function peekBaseTranslations(): TranslationTree | null {
  return baseTranslationsCache;
}

export async function loadLanguageOptions(): Promise<readonly LanguageOption[]> {
  if (languageOptionsCache) return languageOptionsCache;
  if (!languageOptionsPromise) {
    languageOptionsPromise = import('./i18n.languages').then((module) => {
      languageOptionsCache = module.languageOptions.map((option) => ({
        ...option,
        label: capitalizeDisplayLabel(option.label),
      })) as readonly LanguageOption[];
      return languageOptionsCache;
    });
  }
  return languageOptionsPromise;
}

function readPackedLanguage(language: LanguageCode): TranslationTree | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getLanguageStorageKey(language));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TranslationTree;
    return scrubLegacyBrandTree(parsed) as TranslationTree;
  } catch {
    return null;
  }
}

function persistPackedLanguage(language: LanguageCode, messages: TranslationTree) {
  if (typeof window === 'undefined') return;
  try {
    const scrubbed = scrubLegacyBrandTree(messages) as TranslationTree;
    window.localStorage.setItem(getLanguageStorageKey(language), JSON.stringify(scrubbed));
  } catch {
    // Ignore quota / serialization issues.
  }
}

function translateText(input: string, targetLanguage: LanguageCode, cache: Map<string, string>): Promise<string> {
  if (targetLanguage === FALLBACK_LANGUAGE) return Promise.resolve(input);
  if (cache.has(input)) return Promise.resolve(cache.get(input) as string);

  const placeholders: string[] = [];
  const protectedText = input.replace(/\{([^}]+)\}/g, (_match, token) => {
    const placeholder = `__PH_${placeholders.length}__`;
    placeholders.push(`{${token}}`);
    return placeholder;
  });

  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', targetLanguage);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', protectedText);

  return fetch(url)
    .then((response) => response.json())
    .then((payload) => {
      const translated = Array.isArray(payload?.[0])
        ? payload[0].map((part: [string] | undefined) => part?.[0] ?? '').join('')
        : '';
      const restored = (translated || input).replace(/__PH_(\d+)__/g, (_match, index) => placeholders[Number(index)] ?? _match);
      cache.set(input, restored);
      return restored;
    })
    .catch(() => input);
}

async function translateTree(node: unknown, targetLanguage: LanguageCode, cache: Map<string, string>): Promise<unknown> {
  if (typeof node === 'string') {
    return translateText(node, targetLanguage, cache);
  }

  if (Array.isArray(node)) {
    return Promise.all(node.map((item) => translateTree(item, targetLanguage, cache)));
  }

  if (isObject(node)) {
    const entries = await Promise.all(
      Object.entries(node).map(async ([key, value]) => [key, await translateTree(value, targetLanguage, cache)] as const),
    );
    return Object.fromEntries(entries);
  }

  return node;
}

export async function loadLanguagePack(language: LanguageCode): Promise<TranslationTree> {
  const baseTranslations = await loadBaseTranslations();
  if (language === FALLBACK_LANGUAGE) return baseTranslations;

  const cached = cachedLanguagePacks.get(language) || readPackedLanguage(language);
  if (cached) {
    const curatedCached = applyCuratedTranslations(language, cached);
    cachedLanguagePacks.set(language, curatedCached);
    return curatedCached;
  }

  const inFlight = inFlightLanguageLoads.get(language);
  if (inFlight) return inFlight;

  // One server-built pack first (step 8.2); the per-string browser translation stays as the fallback.
  const promise = fetchServerLanguagePack(language)
    .then((server) => (server ? (server.pack as TranslationTree) : translateTree(baseTranslations, language, new Map())))
    .then((messages) => {
      const tree = applyCuratedTranslations(language, scrubLegacyBrandTree(messages) as TranslationTree);
      cachedLanguagePacks.set(language, tree);
      persistPackedLanguage(language, tree);
      return tree;
    })
    .catch((error) => {
      console.error(`Failed to load language pack for ${language}:`, error);
      return applyCuratedTranslations(language, baseTranslations);
    })
    .finally(() => {
      inFlightLanguageLoads.delete(language);
    });

  inFlightLanguageLoads.set(language, promise);
  return promise;
}

export function getTranslationNode(messages: TranslationTree, key: string): unknown {
  return resolvePath(messages, key) ?? resolvePath(baseTranslationsCache ?? bootstrapTranslations, key);
}

export function translateMessage(messages: TranslationTree, key: string, vars?: Record<string, string | number>): string {
  const template = resolvePath(messages, key) ?? resolvePath(baseTranslationsCache ?? bootstrapTranslations, key) ?? key;
  if (typeof template !== 'string') return key;

  const resolved = template.replace(/\{(\w+)\}/g, (_match, token) => {
    const value = vars?.[token];
    return value === undefined || value === null ? `{${token}}` : String(value);
  });
  return scrubLegacyBrandText(resolved);
}

export type { BaseTranslations, LanguageCode, LanguageOption };
