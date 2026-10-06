import { supabaseUntyped } from '@/integrations/supabase/untyped';

export const MESSAGE_PERMISSIONS = ['everyone', 'endorsement_ties', 'nobody'] as const;
export type MessagePermission = (typeof MESSAGE_PERMISSIONS)[number];

export type ProfilePrivacySettings = {
  hideFromDirectory: boolean;
  messagePermission: MessagePermission;
};

export const DEFAULT_PROFILE_PRIVACY: ProfilePrivacySettings = { hideFromDirectory: false, messagePermission: 'everyone' };

export function toProfilePrivacy(row: unknown): ProfilePrivacySettings {
  if (!row || typeof row !== 'object') return DEFAULT_PROFILE_PRIVACY;
  const value = row as { hide_from_directory?: unknown; message_permission?: unknown };
  const permission = MESSAGE_PERMISSIONS.find((option) => option === value.message_permission) ?? 'everyone';
  return { hideFromDirectory: value.hide_from_directory === true, messagePermission: permission };
}

export async function loadProfilePrivacy(profileId: string): Promise<ProfilePrivacySettings> {
  const { data } = await supabaseUntyped
    .from('profile_privacy_settings')
    .select('hide_from_directory, message_permission')
    .eq('profile_id', profileId)
    .maybeSingle();
  return toProfilePrivacy(data);
}

export async function saveProfilePrivacy(profileId: string, settings: ProfilePrivacySettings) {
  const { error } = await supabaseUntyped.from('profile_privacy_settings').upsert(
    {
      profile_id: profileId,
      hide_from_directory: settings.hideFromDirectory,
      message_permission: settings.messagePermission,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' },
  );
  return { error };
}
