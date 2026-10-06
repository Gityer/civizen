import { supabaseUntyped } from '@/integrations/supabase/untyped';

/** Kinds of notification a member can turn off; each matches a notification_preferences column. */
export const NOTIFICATION_CATEGORIES = ['messages', 'endorsements', 'comments', 'governance'] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
export type NotificationPreferences = Record<NotificationCategory, boolean>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  messages: true,
  endorsements: true,
  comments: true,
  governance: true,
};

export function toNotificationPreferences(row: unknown): NotificationPreferences {
  if (!row || typeof row !== 'object') return DEFAULT_NOTIFICATION_PREFERENCES;
  const value = row as Partial<Record<NotificationCategory, unknown>>;
  return Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => [category, value[category] !== false]),
  ) as NotificationPreferences;
}

export async function loadNotificationPreferences(profileId: string): Promise<NotificationPreferences> {
  const { data } = await supabaseUntyped
    .from('notification_preferences')
    .select(NOTIFICATION_CATEGORIES.join(', '))
    .eq('profile_id', profileId)
    .maybeSingle();
  return toNotificationPreferences(data);
}

export async function saveNotificationPreferences(profileId: string, preferences: NotificationPreferences) {
  const { error } = await supabaseUntyped
    .from('notification_preferences')
    .upsert({ profile_id: profileId, ...preferences, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' });
  return { error };
}
