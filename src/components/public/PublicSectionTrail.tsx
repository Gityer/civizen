import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export type PublicSectionTrailItem = {
  label: string;
  /** Omit href (or leave undefined) for the current segment. */
  href?: string;
};

type PublicSectionTrailProps = {
  items: readonly PublicSectionTrailItem[];
  className?: string;
  'aria-label'?: string;
};

/**
 * Joined section path: `Label > Label` with one space around `>`.
 * Separator uses `whitespace-pre` so flex layout does not collapse those spaces.
 * Scrolls horizontally when needed, keeps the last segment fully visible,
 * and shows a leading `...` when earlier segments are off-screen to the left.
 */
export function PublicSectionTrail({
  items,
  className,
  'aria-label': ariaLabel = 'Section',
}: PublicSectionTrailProps) {
  const scrollerRef = useRef<HTMLOListElement | null>(null);
  const [showLeadingEllipsis, setShowLeadingEllipsis] = useState(false);

  const syncScrollState = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const overflows = node.scrollWidth > node.clientWidth + 1;
    setShowLeadingEllipsis(overflows && node.scrollLeft > 1);
  }, []);

  const scrollToEnd = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
    syncScrollState();
  }, [syncScrollState]);

  useLayoutEffect(() => {
    scrollToEnd();
  }, [items, scrollToEnd]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;

    const onScroll = () => syncScrollState();
    node.addEventListener('scroll', onScroll, { passive: true });

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => scrollToEnd()) : null;
    resizeObserver?.observe(node);

    window.addEventListener('resize', scrollToEnd);
    return () => {
      node.removeEventListener('scroll', onScroll);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scrollToEnd);
    };
  }, [items, scrollToEnd, syncScrollState]);

  if (items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={cn('relative min-w-0', className)}>
      {showLeadingEllipsis ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-background via-background/95 to-transparent pl-0.5 pr-5 text-xs font-semibold text-muted-foreground"
        >
          …
        </span>
      ) : null}
      <ol
        ref={scrollerRef}
        className="flex min-w-0 max-w-full items-center overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const segmentClass = cn(
            'inline-flex items-center whitespace-nowrap text-xs',
            isLast
              ? 'shrink-0 font-semibold text-primary'
              : 'max-w-[9rem] truncate font-medium text-muted-foreground hover:text-foreground sm:max-w-[12rem]',
          );

          return (
            <li key={`${item.label}-${index}`} className="flex shrink-0 items-center">
              {index > 0 ? (
                <span
                  className="shrink-0 select-none whitespace-pre text-xs text-muted-foreground/80"
                  aria-hidden
                >
                  {' > '}
                </span>
              ) : null}
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className={segmentClass} title={item.label}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.href} className={segmentClass} title={item.label}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
