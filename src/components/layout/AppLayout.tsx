import { ReactNode } from 'react';

import { AppSideNav } from './AppSideNav';
import { AppTopChrome } from './AppTopChrome';
import { MobileNav } from './MobileNav';
import { NavSecondaryDesktop } from './NavSecondaryDesktop';
import { useIsDesktopLayout } from '@/hooks/useIsDesktopLayout';
import { APP_SIDE_NAV_OFFSET_CLASS } from '@/lib/responsive-layout';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  /**
   * Hide floating Search + Profile chrome.
   * Use on hubs that already own those controls in the page header (e.g. Market).
   */
  hideTopChrome?: boolean;
  /** Optional control(s) rendered in top chrome immediately before the Search icon. */
  topChromeBeforeSearch?: ReactNode;
}

export function AppLayout({
  children,
  hideNav = false,
  hideTopChrome = false,
  topChromeBeforeSearch,
}: AppLayoutProps) {
  const isDesktop = useIsDesktopLayout();
  const showDesktopNav = !hideNav && isDesktop;
  const showPhoneNav = !hideNav && !isDesktop;

  return (
    <div className="min-h-screen bg-background">
      {showDesktopNav ? <AppSideNav /> : null}
      {hideTopChrome ? null : <AppTopChrome beforeSearch={topChromeBeforeSearch} />}
      <main
        data-build-root="true"
        className={cn(
          showPhoneNav && 'pb-20',
          showDesktopNav && APP_SIDE_NAV_OFFSET_CLASS,
        )}
      >
        {showDesktopNav ? <NavSecondaryDesktop /> : null}
        {children}
      </main>
      {showPhoneNav ? <MobileNav /> : null}
    </div>
  );
}
