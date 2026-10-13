type LocationLike = { pathname: string; search: string; state?: unknown };

/**
 * Router state for a link or navigation to /login or /signup (v2 step B1). A pending return path (the protected page
 * that sent the visitor here) is always kept; with `returnHere`, the current page becomes the return path.
 */
export function authLinkState(location: LocationLike, returnHere = false): { from: unknown } | undefined {
  const existing = location.state as { from?: unknown } | null | undefined;
  if (existing && typeof existing === 'object' && existing.from) return { from: existing.from };
  return returnHere ? { from: { pathname: location.pathname, search: location.search } } : undefined;
}
