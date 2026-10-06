import { supabase } from '@/integrations/supabase/client';
import { supabaseUntyped } from '@/integrations/supabase/untyped';

/** People the signed-in member has blocked from private messaging, with display names. */
export type BlockedProfile = {
  profileId: string;
  blockedAt: string | null;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

type BlockRow = { blocked_profile_id?: unknown; blocked_at?: unknown };

export function readBlockRows(rows: unknown): { profileId: string; blockedAt: string | null }[] {
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row: BlockRow) => (
    typeof row?.blocked_profile_id === 'string'
      ? [{ profileId: row.blocked_profile_id, blockedAt: typeof row.blocked_at === 'string' ? row.blocked_at : null }]
      : []
  ));
}

export async function listBlockedProfiles(): Promise<{ data: BlockedProfile[]; error: unknown }> {
  const { data, error } = await supabaseUntyped.rpc('private_list_my_blocked_profiles');
  if (error) return { data: [], error };
  const blocks = readBlockRows(data);
  if (blocks.length === 0) return { data: [], error: null };

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .in('id', blocks.map((block) => block.profileId));
  if (profilesError) return { data: [], error: profilesError };

  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return {
    data: blocks.map((block) => {
      const profile = byId.get(block.profileId);
      return {
        ...block,
        fullName: profile?.full_name ?? null,
        username: profile?.username ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      };
    }),
    error: null,
  };
}

export async function blockProfile(profileId: string) {
  const { error } = await supabaseUntyped.rpc('private_block_profile', { target_profile_id: profileId });
  return { error };
}

export async function unblockProfile(profileId: string) {
  const { error } = await supabaseUntyped.rpc('private_unblock_profile', { target_profile_id: profileId });
  return { error };
}
