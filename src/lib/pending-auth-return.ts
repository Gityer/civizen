import { resolveAuthReturnPath } from '@/lib/auth-return-path';

const STORAGE_KEY = 'civizen.pendingAuthReturn';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type StoredReturn = { pathname: string; search: string; savedAt: number };

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Remembers where a visitor wanted to go (for example a ballot) so the return still works
 * when sign-up needs an email confirmation that opens in a fresh tab without router state.
 */
export function savePendingAuthReturn(state: unknown, now = Date.now()): string | null {
  const path = resolveAuthReturnPath(state, '');
  if (!path) return null;
  const [pathname, search = ''] = path.split('?');
  try {
    const payload: StoredReturn = { pathname, search: search ? `?${search}` : '', savedAt: now };
    storage()?.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage can be unavailable (private mode); router state still carries the path.
  }
  return path;
}

export function peekPendingAuthReturn(now = Date.now()): string | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredReturn>;
    if (typeof parsed.pathname !== 'string' || typeof parsed.savedAt !== 'number') return null;
    if (now - parsed.savedAt > MAX_AGE_MS) return null;
    // Re-validated on read: only safe in-app, non-auth paths are ever returned.
    return (
      resolveAuthReturnPath({ from: { pathname: parsed.pathname, search: parsed.search ?? '' } }, '') ||
      null
    );
  } catch {
    return null;
  }
}

export function clearPendingAuthReturn(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Return path after sign-in: router state first, then the remembered path, else the fallback. */
export function resolvePostAuthPath(state: unknown, fallback = '/'): string {
  const fromState = resolveAuthReturnPath(state, '');
  const target = fromState || peekPendingAuthReturn() || fallback;
  if (fromState || target !== fallback) clearPendingAuthReturn();
  return target;
}
