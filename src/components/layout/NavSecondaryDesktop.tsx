import { useEffect, useRef } from 'react';

import { MarketCategoryIcon } from '@/components/market/MarketCategoryIcon';
import { usePageSecondaryNavContext } from '@/contexts/PageSecondaryNavContext';
import { cn } from '@/lib/utils';

/**
 * Large-screen secondary section strip.
 * Replaces the phone arc/strip above the bottom bar with a top content band.
 * When a page registers secondary sections, they stay visible on desktop.
 */
export function NavSecondaryDesktop() {
  const { config } = usePageSecondaryNavContext();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);
  const items = config?.items ?? [];

  useEffect(() => {
    if (!activeItemRef.current) return;
    activeItemRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [config?.value]);

  if (!config || items.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="nav-secondary-desktop"
      data-secondary-nav-chrome
      className="sticky top-0 z-[45] border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85"
    >
      <div
        ref={scrollRef}
        role="listbox"
        aria-label="Section navigation"
        aria-activedescendant={config.value}
        className="flex items-center gap-0 overflow-x-auto overscroll-x-contain px-4 py-2.5 lg:pr-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.id === config.value;

          return (
            <div key={item.id} className="flex shrink-0 items-center">
              {index > 0 ? (
                <span className="px-1.5 text-sm font-semibold text-muted-foreground/80" aria-hidden>
                  ·
                </span>
              ) : null}
              <button
                ref={isActive ? activeItemRef : undefined}
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={item.disabled}
                title={item.title}
                onClick={() => {
                  if (!item.disabled && item.id !== config.value) {
                    config.onChange(item.id);
                  }
                }}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-left transition-colors',
                  'text-xs font-semibold leading-tight',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border/40 bg-background/70 text-foreground hover:bg-muted/50',
                  item.disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                {Icon ? (
                  <MarketCategoryIcon icon={Icon} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                ) : null}
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
