import { supabase } from '@/integrations/supabase/client';

/** user_notifications is not in the generated Database types yet. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const SELECT = 'id, notification_type, title, body, entity_type, entity_id, read_at, created_at, metadata';

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.notification_type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at,
    metadata: (row.metadata && typeof row.metadata === 'object' ? row.metadata : {}) as Record<string, unknown>,
  };
}

/** Where tapping a notification should take the member, or null when it has no page. */
export function notificationRoute(notification: Pick<AppNotification, 'entityType' | 'entityId' | 'metadata'>): string | null {
  const id = notification.entityId;
  switch (notification.entityType) {
    case 'civic_election':
      return id ? `/governance/voting/${id}` : '/governance/voting';
    case 'civic_voting_proposal':
      return id ? `/governance/voting/proposals/${id}` : '/governance/workspace?tab=proposals';
    case 'matter':
      return id ? `/contribute/matters/${id}` : '/contribute/matters';
    case 'agreement':
      return id ? `/agreements/${id}` : '/agreements';
    case 'post':
      return '/';
    default:
      return null;
  }
}

export async function listNotifications(limit = 50): Promise<{ rows: AppNotification[]; error: string | null }> {
  const { data, error } = await db
    .from('user_notifications')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { rows: [], error: error.message };
  return { rows: ((data || []) as NotificationRow[]).map(mapRow), error: null };
}

export async function unreadNotificationCount(): Promise<number> {
  const { count, error } = await db
    .from('user_notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) return 0;
  return Number(count) || 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await db
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await db
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw new Error(error.message);
}
