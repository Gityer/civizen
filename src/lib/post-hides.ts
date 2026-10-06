import { supabaseUntyped } from '@/integrations/supabase/untyped';
import { readBlockRows } from '@/lib/profile-blocks';
import type { HomeFeedItem } from '@/lib/post-reposts';

/** What the viewer chose not to see on Home: posts they hid and everything from people they blocked. */
export type HiddenFeedFilter = {
  hiddenPostIds: ReadonlySet<string>;
  blockedProfileIds: ReadonlySet<string>;
};

export const EMPTY_HIDDEN_FEED_FILTER: HiddenFeedFilter = {
  hiddenPostIds: new Set(),
  blockedProfileIds: new Set(),
};

export function filterHiddenFeedItems(items: HomeFeedItem[], filter: HiddenFeedFilter): HomeFeedItem[] {
  if (filter.hiddenPostIds.size === 0 && filter.blockedProfileIds.size === 0) return items;
  return items.filter((item) => {
    const postIds = [item.post.id, item.interactionPostId, item.repostTargetPostId, item.embeddedOriginal?.id];
    if (postIds.some((id) => id && filter.hiddenPostIds.has(id))) return false;
    const authorIds = [item.post.author_id, item.embeddedOriginal?.author_id, item.repost?.reposter_profile_id];
    return !authorIds.some((id) => id && filter.blockedProfileIds.has(id));
  });
}

export async function loadHiddenFeedFilter(profileId: string): Promise<HiddenFeedFilter> {
  const [hides, blocks] = await Promise.all([
    supabaseUntyped.from('post_hides').select('post_id').eq('profile_id', profileId),
    supabaseUntyped.rpc('private_list_my_blocked_profiles'),
  ]);
  const hiddenRows = (hides.error ? [] : hides.data ?? []) as { post_id: string }[];
  return {
    hiddenPostIds: new Set(hiddenRows.map((row) => row.post_id)),
    blockedProfileIds: new Set(blocks.error ? [] : readBlockRows(blocks.data).map((row) => row.profileId)),
  };
}

export async function hidePostForViewer(profileId: string, postId: string) {
  const { error } = await supabaseUntyped
    .from('post_hides')
    .upsert({ profile_id: profileId, post_id: postId }, { onConflict: 'profile_id,post_id', ignoreDuplicates: true });
  return { error };
}
