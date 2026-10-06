import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { PublicHomeLogo } from '@/components/public/PublicHomeLogo';
import { PublicPageToolbar } from '@/components/public/PublicPageToolbar';
import { PublicPrimaryNav } from '@/components/public/PublicPrimaryNav';
import {
  PublicSectionTrail,
  type PublicSectionTrailItem,
} from '@/components/public/PublicSectionTrail';
import { PUBLIC_CHROME_MAX_CLASS } from '@/lib/responsive-layout';
import { useShowOnScrollUp } from '@/hooks/useShowOnScrollUp';
import { cn } from '@/lib/utils';

type PublicPageHeaderProps = {
  className?: string;
  maxWidthClass?: string;
  /**
   * Section path.
   * Single segment sits beside the logo.
   * Multi-segment path stays on row 2 when it fits; if it overflows, root lifts beside the logo.
   */
  sectionTrail?: readonly PublicSectionTrailItem[];
  /** Passed to the default toolbar: hide its large-screen Sign in / Join while the page shows its own. */
  hideGuestAuthActions?: boolean;
  children?: ReactNode;
};

function trailPlainText(items: readonly PublicSectionTrailItem[]): string {
  return items.map((item) => item.label.trim()).filter(Boolean).join(' > ');
}

/** Public chrome: logo (+ section) on row 1; deeper trails on row 2 when needed. */
export function PublicPageHeader({
  className,
  maxWidthClass = PUBLIC_CHROME_MAX_CLASS,
  sectionTrail,
  hideGuestAuthActions = false,
  children,
}: PublicPageHeaderProps) {
  const { visible, scrolled } = useShowOnScrollUp();
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const trail = useMemo(
    () => sectionTrail?.filter((item) => item.label.trim().length > 0) ?? [],
    [sectionTrail],
  );
  const trailSlotRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [liftRoot, setLiftRoot] = useState(false);
  const singleSegment = trail.length === 1;

  useLayoutEffect(() => {
    const update = () => {
      if (trail.length < 2) {
        setLiftRoot(false);
        return;
      }
      const slot = trailSlotRef.current;
      const measure = measureRef.current;
      if (!slot || !measure) {
        setLiftRoot(false);
        return;
      }
      const available = slot.clientWidth;
      const needed = measure.scrollWidth;
      setLiftRoot(needed > available + 1);
    };

    update();

    const slot = trailSlotRef.current;
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && slot ? new ResizeObserver(update) : null;
    if (slot) resizeObserver?.observe(slot);
    window.addEventListener('resize', update);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [trail]);

  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) return;

    const syncHeight = () => setHeaderHeight(node.offsetHeight);
    syncHeight();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncHeight) : null;
    resizeObserver?.observe(node);
    window.addEventListener('resize', syncHeight);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [trail, liftRoot, singleSegment]);

  const root = singleSegment || liftRoot ? trail[0] : null;
  const visibleTrail = singleSegment ? [] : liftRoot ? trail.slice(1) : trail;

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          'fixed inset-x-0 top-0 z-40 pt-[max(0.5rem,var(--safe-area-top))] transition-transform duration-300 ease-out motion-reduce:transition-none',
          visible ? 'translate-y-0' : '-translate-y-full pointer-events-none',
          scrolled
            ? 'border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80'
            : 'bg-transparent',
        )}
      >
        <div className={cn('relative mx-auto w-full px-6 pb-3 pt-4 sm:px-8', maxWidthClass, className)}>
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <PublicHomeLogo sectionLabel={root?.label} sectionHref={root?.href} />
              <PublicPrimaryNav className="min-w-0 flex-1 justify-center" />
            </div>
            {children ?? <PublicPageToolbar hideGuestAuthActions={hideGuestAuthActions} />}
          </div>
          {trail.length >= 2 ? (
            <div ref={trailSlotRef} className="relative mt-2.5 min-w-0">
              <span
                ref={measureRef}
                aria-hidden
                className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap text-xs font-semibold"
              >
                {trailPlainText(trail)}
              </span>
              {visibleTrail.length > 0 ? <PublicSectionTrail items={visibleTrail} /> : null}
            </div>
          ) : null}
        </div>
      </header>
      <div aria-hidden className="shrink-0" style={{ height: headerHeight }} />
    </>
  );
}
