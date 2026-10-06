import { useMemo } from 'react';

import { filterHiddenFeedItems } from '@/lib/post-hides';
import { useHomeCore } from '@/pages/home/useHomeCore';
import { useHomeFeed } from '@/pages/home/useHomeFeed';
import { useHomeHiddenPosts } from '@/pages/home/useHomeHiddenPosts';
import { useHomePostActions } from '@/pages/home/useHomePostActions';
import { useHomeContent } from '@/pages/home/useHomeContent';
import { useHomeEngagement } from '@/pages/home/useHomeEngagement';

export function useHome() {
  const a = useHomeCore();
  const b = useHomeFeed({ ...a });
  const c = useHomePostActions({ ...a, ...b });
  const d = useHomeContent({ ...a, ...b, ...c });
  const e = useHomeEngagement({ ...a, ...b });
  const f = useHomeHiddenPosts(a.profile?.id, a.t);
  const feedItems = useMemo(
    () => filterHiddenFeedItems(c.feedItems, f.hiddenFeedFilter),
    [c.feedItems, f.hiddenFeedFilter],
  );
  return { ...a, ...b, ...c, ...d, ...e, ...f, feedItems };
}
