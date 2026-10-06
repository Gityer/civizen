import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { MarketCategoryIcon } from '@/components/market/MarketCategoryIcon';
import { usePageSecondaryNavContext } from '@/contexts/PageSecondaryNavContext';
import { cn } from '@/lib/utils';

export function NavSecondaryStrip() {
  const {
    config,
    carouselVisible,
    cancelCarouselHide,
    scheduleCarouselHide,
  } = usePageSecondaryNavContext();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  const items = config?.items ?? [];
  const hasFab = Boolean(config?.fab);

  useEffect(() => {
    if (!carouselVisible || !activeItemRef.current) return;
    activeItemRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [carouselVisible, config?.value]);

  if (!config || items.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {carouselVisible ? (
        <motion.div
          key="nav-secondary-strip"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'pointer-events-none fixed inset-x-0 z-60',
            hasFab
              ? 'bottom-[calc(6.35rem+env(safe-area-inset-bottom,0px))]'
              : 'bottom-20',
          )}
        >
          <div
            className="pointer-events-auto w-full pb-2 -mb-2"
            onPointerEnter={cancelCarouselHide}
            onPointerLeave={scheduleCarouselHide}
          >
            <div
              ref={scrollRef}
              role="listbox"
              aria-label="Section navigation"
              aria-activedescendant={config.value}
              className="flex items-center gap-0 overflow-x-auto overscroll-x-contain px-3 py-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
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
                        scheduleCarouselHide();
                      }}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-left transition-colors',
                        'text-xs font-semibold leading-tight',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        isActive
                          ? 'border-primary/50 bg-primary/10 text-primary'
                          : 'border-border/40 bg-background/70 text-foreground hover:bg-muted/50',
                        item.disabled && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      {Icon ? <MarketCategoryIcon icon={Icon} className="h-6 w-6" iconClassName="h-3.5 w-3.5" /> : null}
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
