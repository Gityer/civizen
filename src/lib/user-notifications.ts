import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';

/**
 * In-app notifications. Rows are written by the database (agreements, reposts, matters) into
 * `user_notifications`; members can read and mark their own as read (RLS: recipient only).
 */

type Client = SupabaseClient<Database>;

export type UserNotification = {
  id: string;
  notificationType: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export const NOTIFICATIONS_PAGE_SIZE = 50;

type NotificationRow = Database['public']['Tables']['user_notifications']['Row'];

export function toUserNotification(row: NotificationRow): UserNotification {
  return {
    id: row.id,
    notificationType: row.notification_type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/** Where a notification leads in the app, or null when it has no page of its own. */
export function notificationLink(notification: Pick<UserNotification, 'entityType' | 'entityId'>): string | null {
  const { entityType, entityId } = notification;
  if (!entityType) return null;
  switch (entityType) {
    case 'agreement':
      return entityId ? `/agreements/${entityId}` : '/agreements';
    case 'matter':
      return entityId ? `/contribute/matters/${entityId}` : '/contribute/matters';
    case 'post':
      return '/';
    default:
      return null;
  }
}

export function countUnread(notifications: Pick<UserNotification, 'readAt'>[]): number {
  return notifications.reduce((total, item) => (item.readAt ? total : total + 1), 0);
}

export async function fetchUserNotifications(client: Client, profileId: string) {
  const { data, error } = await client
    .from('user_notifications')
    .select('id, recipient_profile_id, notification_type, title, body, entity_type, entity_id, read_at, metadata, created_at')
    .eq('recipient_profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_PAGE_SIZE);
  return { data: (data ?? []).map(toUserNotification), error };
}

export async function markNotificationsRead(client: Client, profileId: string, ids?: string[]) {
  let query = client
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_profile_id', profileId)
    .is('read_at', null);
  if (ids && ids.length > 0) {
    query = query.in('id', ids);
  }
  const { error } = await query;
  return { error };
}

export async function countUnreadNotifications(client: Client, profileId: string) {
  const { count, error } = await client
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_profile_id', profileId)
    .is('read_at', null);
  return { count: count ?? 0, error };
}

/** Badge text for the bell; large counts collapse so the badge stays round. */
export function formatUnreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}
