import type { AppNotification } from '@/lib/notifications';

type Translate = (key: string, params?: Record<string, string>) => string;

/**
 * Notification text comes from i18n keys (`notificationTypes.<type>.title|body`) with the
 * parameters the sender stored in `metadata`; rows whose type has no key, or older rows, fall back
 * to the English title and body stored by the database (Phase 2 step 2.5).
 */
export function describeNotification(
  row: Pick<AppNotification, 'type' | 'title' | 'body' | 'metadata'>,
  t: Translate,
): { title: string; body: string | null } {
  const type = row.type.replace(/\./g, '_');
  const params: Record<string, string> = { title: String(row.metadata?.title ?? row.title ?? '') };
  for (const [key, value] of Object.entries(row.metadata ?? {})) {
    if (typeof value === 'string' || typeof value === 'number') params[key] = String(value);
  }
  const titleKey = `notificationTypes.${type}.title`;
  const bodyKey = `notificationTypes.${type}.body`;
  const title = t(titleKey, params);
  if (title === titleKey) return { title: row.title, body: row.body };
  const body = t(bodyKey, params);
  return { title, body: body === bodyKey ? row.body : body };
}
