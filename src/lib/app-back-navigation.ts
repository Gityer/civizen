/**
 * Shared back-navigation rules for `AppPageHeader` (same-line Back + title).
 * Bottom-nav hubs rely on tab switching; other AppLayout routes show Back beside the title.
 */

const MAIN_NAV_HUB_PATHS = new Set(['/', '/study', '/contribute', '/governance', '/market', '/messaging']);

export function shouldShowAppBack(pathname: string): boolean {
  if (!pathname) return false;
  if (MAIN_NAV_HUB_PATHS.has(pathname)) return false;
  return true;
}

/** Fallback when there is no in-app history entry to pop. */
export function getAppBackFallback(pathname: string): string {
  if (pathname.startsWith('/settings/')) return '/settings';
  if (pathname.startsWith('/messaging/')) return '/messaging';
  if (pathname.startsWith('/study/')) return '/study';
  if (pathname.startsWith('/market/')) return '/market';
  if (pathname.startsWith('/governance/')) return '/governance';
  if (pathname.startsWith('/fund/')) return '/fund';
  if (pathname.startsWith('/documents/')) return '/documents';
  if (pathname.startsWith('/contribute/') && pathname !== '/contribute/policy') {
    return '/contribute';
  }
  if (pathname.startsWith('/happiness/')) return '/happiness';
  if (pathname.startsWith('/wellbeing-insights/')) return '/wellbeing-insights';
  if (pathname.startsWith('/agreements/')) return '/agreements';
  if (pathname.startsWith('/u/')) return '/search';
  return '/';
}

export function canPopAppHistory(): boolean {
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === 'number' && state.idx > 0;
}
