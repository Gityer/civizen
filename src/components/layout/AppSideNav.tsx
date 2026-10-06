import { Plus } from 'lucide-react';
import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useLanguage } from '@/contexts/LanguageContext';
import { usePageSecondaryNavContext } from '@/contexts/PageSecondaryNavContext';
import { MAIN_NAV_ITEMS, isMainNavItemActive } from '@/lib/main-nav';
import { cn } from '@/lib/utils';

function matchesSecondaryNavRoute(pathname: string, itemPath: string) {
  return isMainNavItemActive(pathname, itemPath);
}

const ACTIVE_NAV_DOUBLE_TAP_MS = 400;

/**
 * Signed-in primary navigation for large screens.
 * Same destinations as the phone bottom bar; secondary sections stay in NavSecondaryDesktop.
 */
export function AppSideNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { config, setCarouselVisible, cancelCarouselHide } = usePageSecondaryNavContext();
  const lastActiveNavTapRef = useRef<{ path: string; at: number } | null>(null);

  const revealSecondaryForActiveItem = (itemPath: string) => {
    if (!config || !matchesSecondaryNavRoute(location.pathname, itemPath)) return;
    setCarouselVisible(true);
    cancelCarouselHide();
  };

  const handleNavItemPress = (itemPath: string, isActive: boolean, hasSecondaryNav: boolean) => {
    if (isActive && hasSecondaryNav) {
      const now = Date.now();
      const lastTap = lastActiveNavTapRef.current;
      if (
        lastTap?.path === itemPath &&
        now - lastTap.at < ACTIVE_NAV_DOUBLE_TAP_MS &&
        config?.defaultValue
      ) {
        lastActiveNavTapRef.current = null;
        config.onChange(config.defaultValue);
        revealSecondaryForActiveItem(itemPath);
        return;
      }
      lastActiveNavTapRef.current = { path: itemPath, at: now };
      revealSecondaryForActiveItem(itemPath);
      return;
    }
    lastActiveNavTapRef.current = null;
    navigate(itemPath);
  };

  return (
    <aside
      data-testid="app-side-nav"
      className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border/50 bg-card/90 backdrop-blur-xl"
    >
      <div className="flex flex-1 flex-col gap-1 px-3 pb-4 pt-[max(1rem,var(--safe-area-top))]">
        <p className="mb-2 truncate px-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t('common.appName')}
        </p>
        <nav aria-label={t('common.appName')} className="flex flex-col gap-1">
          {MAIN_NAV_ITEMS.map((item) => {
            const isActive = isMainNavItemActive(location.pathname, item.path);
            const hasSecondaryNav =
              Boolean(config) && matchesSecondaryNavRoute(location.pathname, item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavItemPress(item.path, isActive, hasSecondaryNav)}
                onPointerEnter={() => {
                  if (isActive && hasSecondaryNav) {
                    revealSecondaryForActiveItem(item.path);
                  }
                }}
                onFocus={() => {
                  if (isActive && hasSecondaryNav) {
                    revealSecondaryForActiveItem(item.path);
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="truncate">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {config?.fab ? (
        <div className="border-t border-border/40 p-3">
          <button
            type="button"
            onClick={() => config.fab?.onClick()}
            aria-label={config.fab.ariaLabel}
            title={config.fab.label}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-background/90 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:border-primary/65 hover:bg-primary/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{config.fab.label}</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}
