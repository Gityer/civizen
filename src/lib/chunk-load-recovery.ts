/**
 * Detect Vite/Rollup "stale chunk after deploy" failures and recover by
 * loading a fresh document (new index.html → new hashed assets).
 */

const BOOT_RECOVERY_SESSION_KEY = 'civizen-boot-recovery-attempted';

export function getErrorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

export function isChunkLoadError(reason: unknown): boolean {
  const message = getErrorMessage(reason).toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module')
    || message.includes('importing a module script failed')
    || message.includes('loading chunk')
    || message.includes('chunkloaderror')
    || message.includes('error loading dynamically imported module')
  );
}

/**
 * One automatic reload per window: a second stale-chunk failure within this time is not reloaded again (no loops),
 * but after it the tab may recover once more. Before, one failed recovery during a deploy left the tab unrecoverable
 * for its whole life, so a member could sit on a page that never finished starting.
 */
export const BOOT_RECOVERY_RETRY_MS = 2 * 60 * 1000;

function hasAttemptedRecovery(now = Date.now()): boolean {
  try {
    const raw = window.sessionStorage.getItem(BOOT_RECOVERY_SESSION_KEY);
    if (!raw) return false;
    const at = Number(raw);
    // Legacy value '1' (no time) counts as an old attempt, so recovery may run again.
    if (!Number.isFinite(at) || at < 1e12) return false;
    return now - at < BOOT_RECOVERY_RETRY_MS;
  } catch {
    return false;
  }
}

function markRecoveryAttempted(now = Date.now()): void {
  try {
    window.sessionStorage.setItem(BOOT_RECOVERY_SESSION_KEY, String(now));
  } catch {
    // Ignore storage failures.
  }
}

export function clearChunkRecoveryFlag(): void {
  try {
    window.sessionStorage.removeItem(BOOT_RECOVERY_SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Hard-navigate so the browser refetches index.html and the new asset graph.
 * Returns false if recovery was already attempted this tab session.
 */
export function reloadForNewDeployment(reason?: unknown): boolean {
  if (typeof window === 'undefined') return false;
  if (hasAttemptedRecovery()) return false;

  markRecoveryAttempted();

  if (reason) {
    console.warn('Civizen: recovering from stale deploy chunk', getErrorMessage(reason));
  }

  try {
    const url = new URL(window.location.href);
    url.searchParams.set('boot_recovery', Date.now().toString());
    // Drop leftover cache-bust keys from older recoveries so the bar stays clean.
    url.searchParams.delete('boot_reload');
    window.location.replace(url.toString());
    return true;
  } catch {
    window.location.reload();
    return true;
  }
}
