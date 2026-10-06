import type { LucideIcon } from 'lucide-react';
import { BookOpen, Home, Landmark, MessageCircle, PlusCircle, Store } from 'lucide-react';

import type { NavigablePageId } from '@/lib/app-pages';

export type MainNavItem = {
  path: string;
  icon: LucideIcon;
  labelKey: string;
  /** Matching `appPageLinks` / pageRegistry id when one exists. */
  pageId?: NavigablePageId | 'home';
};

/** Primary bottom navigation — Home · Study · Contribute · Governance · Market · Messaging */
export const MAIN_NAV_ITEMS: readonly MainNavItem[] = [
  { path: '/', icon: Home, labelKey: 'common.home', pageId: 'home' },
  { path: '/study', icon: BookOpen, labelKey: 'common.study', pageId: 'study' },
  { path: '/contribute', icon: PlusCircle, labelKey: 'common.contribute', pageId: 'contribute' },
  { path: '/governance', icon: Landmark, labelKey: 'home.governanceHub' },
  { path: '/market', icon: Store, labelKey: 'common.market', pageId: 'market' },
  { path: '/messaging', icon: MessageCircle, labelKey: 'common.messaging', pageId: 'messaging' },
] as const;

/** Profile menu must not duplicate main-nav destinations, chrome entry points, or contextual flows. */
export const PROFILE_MENU_EXCLUDED_PAGE_IDS = new Set<NavigablePageId | 'home'>([
  'home',
  'study',
  'contribute',
  'market',
  'messaging',
  'downloads',
  'editProfile',
  'search',
  'endorse',
]);

export function isMainNavItemActive(pathname: string, itemPath: string) {
  if (itemPath === '/messaging') {
    return pathname === '/messaging' || pathname.startsWith('/messaging/');
  }
  if (itemPath === '/study') {
    return pathname === '/study' || pathname.startsWith('/study/');
  }
  if (itemPath === '/market') {
    return pathname === '/market' || pathname.startsWith('/market/');
  }
  if (itemPath === '/governance') {
    return pathname === '/governance' || pathname.startsWith('/governance/');
  }
  if (itemPath === '/contribute') {
    return pathname === '/contribute' || pathname.startsWith('/contribute/');
  }
  return pathname === itemPath;
}
