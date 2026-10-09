/** Fetches a machine-translated catalog built once on the server (Phase 8 step 8.2); null means fall back to browser translation. */
export type ServerLanguagePack = { pack: Record<string, unknown>; version: string; stale: boolean };

export function parseServerLanguagePack(payload: unknown): ServerLanguagePack | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { ok?: unknown; pack?: unknown; version?: unknown; stale?: unknown; status?: unknown };
  if (body.ok !== true || !body.pack || typeof body.pack !== 'object' || Array.isArray(body.pack)) return null;
  if (Object.keys(body.pack as Record<string, unknown>).length === 0) return null;
  return { pack: body.pack as Record<string, unknown>, version: String(body.version ?? ''), stale: body.stale === true };
}

export async function fetchServerLanguagePack(language: string): Promise<ServerLanguagePack | null> {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!base || !key || typeof fetch !== 'function') return null;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 20_000) : null;
    const response = await fetch(`${base.replace(/\/$/, '')}/functions/v1/language-pack?lang=${encodeURIComponent(language)}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: controller?.signal,
    });
    if (timer) clearTimeout(timer);
    if (!response.ok) return null;
    return parseServerLanguagePack(await response.json());
  } catch {
    return null;
  }
}
