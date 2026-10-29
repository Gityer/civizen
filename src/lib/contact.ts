/**
 * The address on /contact. The owner sets it at build time with `VITE_CONTACT_EMAIL`; until then the page says the
 * address is being set up and points to the in-app routes (Moderation, Report, Civi, Settings › Privacy).
 */
export function contactEmail(env: Record<string, string | undefined> = import.meta.env): string | null {
  const value = env.VITE_CONTACT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}
