import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  EMPTY_HIDDEN_FEED_FILTER,
  hidePostForViewer,
  loadHiddenFeedFilter,
  type HiddenFeedFilter,
} from '@/lib/post-hides';

/** Posts the viewer hid and people they blocked, kept out of the Home feed. */
export function useHomeHiddenPosts(profileId: string | null | undefined, t: (key: string) => string) {
  const [hiddenFeedFilter, setHiddenFeedFilter] = useState<HiddenFeedFilter>(EMPTY_HIDDEN_FEED_FILTER);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    void loadHiddenFeedFilter(profileId).then((filter) => {
      if (!cancelled) setHiddenFeedFilter(filter);
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const hidePostForMe = useCallback(async (postId: string) => {
    if (!profileId) return;
    setHiddenFeedFilter((current) => ({ ...current, hiddenPostIds: new Set([...current.hiddenPostIds, postId]) }));
    const { error } = await hidePostForViewer(profileId, postId);
    if (error) {
      setHiddenFeedFilter((current) => {
        const hiddenPostIds = new Set(current.hiddenPostIds);
        hiddenPostIds.delete(postId);
        return { ...current, hiddenPostIds };
      });
      toast.error(t('home.hidePostFailed'));
      return;
    }
    toast.success(t('home.postHidden'));
  }, [profileId, t]);

  return { hiddenFeedFilter, hidePostForMe };
}
