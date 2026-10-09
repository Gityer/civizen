import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { baseTranslations, supportedLanguageCodes } from './base-bundle.js';

/**
 * language-pack: returns the machine-translated catalog for one language, built once on the server and cached in
 * public.language_packs (Phase 8 step 8.2). The browser then downloads one JSON document instead of translating
 * thousands of strings itself. English (EN), Armenian (HY) and Russian (RU) curated text is applied client-side.
 */
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const CONCURRENCY = 6;

type Tree = Record<string, unknown>;

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra } });
}

async function baseVersion(): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(baseTranslations));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function translateText(input: string, target: string): Promise<string> {
  const placeholders: string[] = [];
  const protectedText = input.replace(/\{([^}]+)\}/g, (_m, token) => {
    const placeholder = `__PH_${placeholders.length}__`;
    placeholders.push(`{${token}}`);
    return placeholder;
  });
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', target);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', protectedText);
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (civizen language-pack)' } });
    if (!response.ok) return input;
    const payload = (await response.json()) as unknown[];
    const translated = Array.isArray(payload?.[0]) ? (payload[0] as Array<[string] | undefined>).map((part) => part?.[0] ?? '').join('') : '';
    return (translated || input).replace(/__PH_(\d+)__/g, (m, index) => placeholders[Number(index)] ?? m);
  } catch {
    return input;
  }
}

function collectStrings(node: unknown, out: Set<string>): void {
  if (typeof node === 'string') out.add(node);
  else if (Array.isArray(node)) node.forEach((item) => collectStrings(item, out));
  else if (node && typeof node === 'object') Object.values(node as Tree).forEach((value) => collectStrings(value, out));
}

function rebuild(node: unknown, map: Map<string, string>): unknown {
  if (typeof node === 'string') return map.get(node) ?? node;
  if (Array.isArray(node)) return node.map((item) => rebuild(item, map));
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node as Tree).map(([k, v]) => [k, rebuild(v, map)]));
  return node;
}

async function buildPack(target: string): Promise<{ pack: Tree; count: number }> {
  const strings = new Set<string>();
  collectStrings(baseTranslations, strings);
  const list = [...strings];
  const map = new Map<string, string>();
  let index = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (index < list.length) {
      const current = list[index];
      index += 1;
      map.set(current, await translateText(current, target));
    }
  }));
  return { pack: rebuild(baseTranslations, map) as Tree, count: list.length };
}

// deno-lint-ignore no-explicit-any
const building = new Map<string, Promise<any>>();

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(request.url);
  const lang = (url.searchParams.get('lang') ?? '').trim();
  if (!lang || lang === 'en' || !(supportedLanguageCodes as readonly string[]).includes(lang)) return json(400, { error: 'unsupported_language' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'server_not_configured' });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const version = await baseVersion();

  const { data: cached } = await admin.from('language_packs').select('base_version, pack, built_at').eq('language', lang).maybeSingle();
  if (cached && cached.base_version === version) {
    return json(200, { ok: true, language: lang, version, pack: cached.pack, built_at: cached.built_at }, { 'Cache-Control': 'public, max-age=3600' });
  }

  // Build once; later callers for the same language wait on the same promise or get the stale pack meanwhile.
  if (!building.has(lang)) {
    const task = buildPack(lang)
      .then(async ({ pack, count }) => {
        await admin.from('language_packs').upsert({ language: lang, base_version: version, pack, string_count: count, built_at: new Date().toISOString() });
        return pack;
      })
      .finally(() => building.delete(lang));
    building.set(lang, task);
    // deno-lint-ignore no-explicit-any
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) runtime.waitUntil(task);
  }
  if (cached) {
    return json(200, { ok: true, language: lang, version: cached.base_version, pack: cached.pack, stale: true }, { 'Cache-Control': 'public, max-age=300' });
  }
  try {
    const pack = await Promise.race([building.get(lang)!, new Promise((resolve) => setTimeout(() => resolve(null), 110_000))]);
    if (!pack) return json(202, { ok: true, language: lang, status: 'building' });
    return json(200, { ok: true, language: lang, version, pack });
  } catch (err) {
    console.error('[language-pack] build failed', lang, (err as Error)?.message);
    return json(500, { error: 'build_failed' });
  }
});
