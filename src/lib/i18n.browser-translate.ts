import type { LanguageCode } from './i18n.languages';

/**
 * Browser-side machine translation: the fallback when no server-built language pack exists (see
 * `i18n.runtime.ts`). Strings the curated catalog already covers are kept as they are, and at most
 * BROWSER_TRANSLATE_CONCURRENCY requests run at once — translating the whole catalog in parallel used to
 * open thousands of connections, which starved the page (ERR_INSUFFICIENT_RESOURCES) and broke reloads.
 */
const BROWSER_TRANSLATE_CONCURRENCY = 6;
const FALLBACK_LANGUAGE: LanguageCode = 'en';

type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

export function createLimiter(limit: number): Limiter {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function translateText(input: string, targetLanguage: LanguageCode, cache: Map<string, string>): Promise<string> {
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

/**
 * Translates `node` (the English base tree) into `targetLanguage`. Where `curated` holds a different string for the
 * same path, that reviewed text wins and nothing is requested for it.
 */
export async function translateTree(
  node: unknown,
  targetLanguage: LanguageCode,
  cache: Map<string, string>,
  curated?: unknown,
  limiter: Limiter = createLimiter(BROWSER_TRANSLATE_CONCURRENCY),
): Promise<unknown> {
  if (typeof node === 'string') {
    if (typeof curated === 'string' && curated !== node) return curated;
    return limiter(() => translateText(node, targetLanguage, cache));
  }

  if (Array.isArray(node)) {
    const curatedList = Array.isArray(curated) ? curated : [];
    return Promise.all(node.map((item, index) => translateTree(item, targetLanguage, cache, curatedList[index], limiter)));
  }

  if (isObject(node)) {
    const curatedObject = isObject(curated) ? curated : {};
    const entries = await Promise.all(
      Object.entries(node).map(
        async ([key, value]) => [key, await translateTree(value, targetLanguage, cache, curatedObject[key], limiter)] as const,
      ),
    );
    return Object.fromEntries(entries);
  }

  return node;
}
