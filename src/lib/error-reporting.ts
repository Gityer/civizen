import { APP_RELEASE_ID, APP_VERSION } from '@/lib/app-release';

export type ErrorReportKind = 'render' | 'window' | 'promise';

export type ErrorReport = {
  kind: ErrorReportKind;
  message: string;
  /** First lines of the stack, never more than STACK_LINES. */
  stack: string | null;
  /** Pathname only: no query string or hash, so nothing personal leaks. */
  route: string;
  appVersion: string;
  releaseId: string;
  at: string;
};

const STACK_LINES = 8;
const DEDUPE_WINDOW_MS = 60_000;
const recent = new Map<string, number>();

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || 'Error';
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error).slice(0, 500);
  } catch {
    return String(error);
  }
}

export function buildErrorReport(
  error: unknown,
  kind: ErrorReportKind,
  route: string,
  now: Date = new Date(),
): ErrorReport {
  const stack = error instanceof Error && error.stack
    ? error.stack.split('\n').slice(0, STACK_LINES).join('\n')
    : null;
  return {
    kind,
    message: messageOf(error).slice(0, 1000),
    stack,
    route: route.split(/[?#]/)[0] || '/',
    appVersion: APP_VERSION,
    releaseId: APP_RELEASE_ID,
    at: now.toISOString(),
  };
}

/** True the first time a given kind+message is seen within the dedupe window. */
export function shouldReport(report: Pick<ErrorReport, 'kind' | 'message'>, nowMs: number = Date.now()): boolean {
  const key = `${report.kind}|${report.message}`;
  const last = recent.get(key);
  if (last !== undefined && nowMs - last < DEDUPE_WINDOW_MS) return false;
  recent.set(key, nowMs);
  return true;
}

export function resetErrorReportDedupe(): void {
  recent.clear();
}

function endpoint(): string | null {
  const value = (import.meta.env?.VITE_ERROR_REPORT_ENDPOINT as string | undefined)?.trim();
  return value ? value : null;
}

/**
 * Records an unexpected error. Always logs to the console; when
 * `VITE_ERROR_REPORT_ENDPOINT` is set, also POSTs a small, non-personal JSON report there
 * (keepalive so it survives navigation). Never throws.
 */
export function reportError(error: unknown, kind: ErrorReportKind): void {
  try {
    const route = typeof window !== 'undefined' ? window.location.pathname : '/';
    const report = buildErrorReport(error, kind, route);
    if (!shouldReport(report)) return;
    console.error(`[civizen:${kind}]`, report.message, error);
    const url = endpoint();
    if (!url || typeof fetch !== 'function') return;
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never break the app.
  }
}
