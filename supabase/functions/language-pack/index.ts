import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { baseTranslations, supportedLanguageCodes } from './base-bundle.js';

/**
 * language-pack: returns the machine-translated catalog for one language, built on the server in resumable batches
 * and cached in public.language_packs (Phase 8 step 8.2). Translation uses the project's Gemini key (free tier)
 * through the models in LANGUAGE_PACK_MODELS, in order: the free daily quota is counted per model, so the pack
 * builder uses gemini-3.5-flash-lite then gemini-3.5-flash, neither of them Civi's model (GEMINI_MODEL). 40 strings per model call,
 * placeholders preserved; a batch whose translations come back untranslated is not stored, so a provider outage
 * can never produce an "English" pack. A request translates at most BATCH strings,
 * keeps progress in public.language_pack_builds and answers 202 until the pack is complete; the browser falls back
 * to its own translation meanwhile. EN, HY and RU curated text is applied client-side.
 */
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const BATCH = 240;
const CHUNK = 40;
const CONCURRENCY = 2;

type Tree = Record<string, unknown>;

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra } });
}

async function baseVersion(): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(baseTranslations));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function placeholders(text: string): string[] {
  return (text.match(/\{[^}]+\}/g) ?? []).sort();
}

const LANGUAGE_NAMES: Record<string, string> = { hy: 'Eastern Armenian', ru: 'Russian', de: 'German', fr: 'French', es: 'Spanish', ar: 'Arabic', zh: 'Simplified Chinese', 'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese', pt: 'Portuguese', 'pt-BR': 'Brazilian Portuguese', it: 'Italian', tr: 'Turkish', fa: 'Persian', hi: 'Hindi', ja: 'Japanese', ko: 'Korean', uk: 'Ukrainian', pl: 'Polish', nl: 'Dutch', ka: 'Georgian', el: 'Greek', he: 'Hebrew', iw: 'Hebrew' };

const DEFAULT_MODELS = 'gemini-3.5-flash-lite,gemini-3.5-flash';
/** No new model call starts after this; the worker's wall clock would cancel the whole request and lose the batch. */
const TIME_BUDGET_MS = 8_000;
/** One model call may not run longer than this; the request deadline below caps it further. */
const CALL_TIMEOUT_MS = 30_000;
/** Everything (chunks, split retries, fallback models) must be answered by now: the worker's wall clock is 60 s. */
const REQUEST_DEADLINE_MS = 30_000;

/** Strips ```json fences a model may wrap around the array. */
function unfence(text: string): string {
  const m = text.match(/^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  return (m ? m[1] : text).trim();
}

/**
 * Translates one chunk with the first model that answers. An answer that does not line up is retried as two halves
 * (a shorter reply parses more reliably and isolates a problem string); null when every model fails.
 */
async function translateChunk(strings: string[], target: string, key: string, models: string[], deadline: number): Promise<string[] | null> {
  const timeLeft = () => Math.min(CALL_TIMEOUT_MS, deadline - Date.now());
  for (const model of models) {
    if (timeLeft() < 5_000) return null;
    const out = await translateWithModel(strings, target, key, model, timeLeft());
    if (out) return out;
    if (strings.length >= 8 && timeLeft() >= 5_000) {
      const half = Math.ceil(strings.length / 2);
      const [left, right] = await Promise.all([
        translateWithModel(strings.slice(0, half), target, key, model, timeLeft()),
        translateWithModel(strings.slice(half), target, key, model, timeLeft()),
      ]);
      if (left && right) return [...left, ...right];
    }
  }
  return null;
}

async function translateWithModel(strings: string[], target: string, key: string, model: string, timeoutMs: number): Promise<string[] | null> {
  const languageName = LANGUAGE_NAMES[target] ?? `the language with BCP-47 code "${target}"`;
  const prompt =
    `Translate each English user-interface string in the JSON array below into ${languageName}. ` +
    'Keep placeholders such as {count} or {title} exactly as they are, keep the product name "Civizen" and the assistant name "Civi" untranslated, ' +
    'keep punctuation and line breaks, do not add explanations. Reply with a JSON array of the same length, same order, strings only, nothing else.\n\n' +
    JSON.stringify(strings);
  const jsonMode = !model.startsWith('gemma');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 16384, ...(jsonMode ? { responseMimeType: 'application/json' } : {}) },
      }),
    });
    if (!response.ok) {
      console.error('[language-pack]', model, response.status, (await response.text()).replace(/\s+/g, ' ').slice(0, 300));
      return null;
    }
    const payload = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? '';
    const parsed = JSON.parse(unfence(text)) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== strings.length) return null;
    const out = parsed.map((v) => (typeof v === 'string' ? v : ''));
    // placeholders must survive; a chunk that came back mostly in English is a provider failure, not a translation
    let unchanged = 0;
    for (let i = 0; i < strings.length; i += 1) {
      if (!out[i]) return null;
      if (placeholders(out[i]).join('|') !== placeholders(strings[i]).join('|')) out[i] = strings[i];
      if (out[i] === strings[i] && strings[i].length > 3 && !/^[A-Z][A-Za-z]*$|Civizen|Civi\b|^[0-9.%:/ -]+$/.test(strings[i])) unchanged += 1;
    }
    if (unchanged > strings.length * 0.5) return null;
    return out;
  } catch (err) {
    console.error('[language-pack]', model, 'failed', (err as Error)?.message);
    return null;
  }
}

function collectStrings(node: unknown, out: Set<string>): void {
  if (typeof node === 'string') out.add(node);
  else if (Array.isArray(node)) node.forEach((item) => collectStrings(item, out));
  else if (node && typeof node === 'object') Object.values(node as Tree).forEach((value) => collectStrings(value, out));
}

function rebuild(node: unknown, map: Record<string, string>): unknown {
  if (typeof node === 'string') return map[node] ?? node;
  if (Array.isArray(node)) return node.map((item) => rebuild(item, map));
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node as Tree).map(([k, v]) => [k, rebuild(v, map)]));
  return node;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(request.url);
  const lang = (url.searchParams.get('lang') ?? '').trim();
  if (!lang || lang === 'en' || !(supportedLanguageCodes as readonly string[]).includes(lang)) return json(400, { error: 'unsupported_language' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const geminiKey = (Deno.env.get('GEMINI_API_KEY') ?? '').trim();
  const models = (Deno.env.get('LANGUAGE_PACK_MODELS') ?? DEFAULT_MODELS).split(',').map((m) => m.trim()).filter(Boolean);
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'server_not_configured' });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const version = await baseVersion();

  const { data: cached } = await admin.from('language_packs').select('base_version, pack, built_at').eq('language', lang).maybeSingle();
  if (cached && cached.base_version === version) {
    return json(200, { ok: true, language: lang, version, pack: cached.pack, built_at: cached.built_at }, { 'Cache-Control': 'public, max-age=3600' });
  }
  if (!geminiKey) return json(503, { error: 'translation_provider_unavailable' });

  const all = new Set<string>();
  collectStrings(baseTranslations, all);
  const strings = [...all];
  const { data: build } = await admin.from('language_pack_builds').select('base_version, translated').eq('language', lang).maybeSingle();
  const translated: Record<string, string> = build && build.base_version === version && build.translated && typeof build.translated === 'object'
    ? (build.translated as Record<string, string>)
    : {};
  const pending = strings.filter((s) => !(s in translated)).slice(0, BATCH);
  const chunks: string[][] = [];
  for (let i = 0; i < pending.length; i += CHUNK) chunks.push(pending.slice(i, i + CHUNK));
  let failed = 0;
  let index = 0;
  const started = Date.now();
  const saveProgress = () =>
    admin.from('language_pack_builds').upsert({ language: lang, base_version: version, translated, done_count: strings.filter((s) => s in translated).length, total_count: strings.length, updated_at: new Date().toISOString() });
  const deadline = started + REQUEST_DEADLINE_MS;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (index < chunks.length && Date.now() - started < TIME_BUDGET_MS) {
      const chunk = chunks[index];
      index += 1;
      const out = await translateChunk(chunk, lang, geminiKey, models, deadline);
      if (!out) {
        failed += 1;
        continue;
      }
      chunk.forEach((s, i) => {
        translated[s] = out[i];
      });
      // the worker's wall clock is per isolate: save after every chunk so a cancelled request loses at most one
      await saveProgress();
    }
  }));
  const done = strings.filter((s) => s in translated).length;
  await saveProgress();

  if (done >= strings.length) {
    const pack = rebuild(baseTranslations, translated) as Tree;
    await admin.from('language_packs').upsert({ language: lang, base_version: version, pack, string_count: strings.length, built_at: new Date().toISOString() });
    await admin.from('language_pack_builds').delete().eq('language', lang);
    return json(200, { ok: true, language: lang, version, pack });
  }
  if (failed > 0 && failed >= index && chunks.length > 0) return json(503, { error: 'translation_provider_failed', done, total: strings.length });
  if (cached) {
    return json(200, { ok: true, language: lang, version: cached.base_version, pack: cached.pack, stale: true, building: { done, total: strings.length } }, { 'Cache-Control': 'public, max-age=300' });
  }
  return json(202, { ok: true, language: lang, status: 'building', done, total: strings.length, failed_chunks: failed });
});
