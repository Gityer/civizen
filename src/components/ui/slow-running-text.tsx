import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type SlowRunningTextProps = {
  text: string;
  className?: string;
  /** When true, marquee only if the text does not fit on one line. */
  onlyWhenOverflow?: boolean;
};

/** Single-line slow marquee; static when reduced motion is preferred. */
export function SlowRunningText({
  text,
  className,
  onlyWhenOverflow = false,
}: SlowRunningTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    if (!onlyWhenOverflow) {
      setOverflowing(false);
      return;
    }

    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const update = () => {
      setOverflowing(measure.scrollWidth > container.clientWidth + 1);
    };

    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [text, onlyWhenOverflow, className]);

  const shouldMarquee = !onlyWhenOverflow || overflowing;

  return (
    <span
      ref={containerRef}
      className={cn('relative block min-w-0 overflow-hidden whitespace-nowrap', className)}
      title={text}
      aria-label={text}
    >
      {onlyWhenOverflow ? (
        <span
          ref={measureRef}
          className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
          aria-hidden
        >
          {text}
        </span>
      ) : null}

      <span className={cn(!shouldMarquee ? 'block truncate' : 'hidden motion-reduce:block truncate')}>
        {text}
      </span>

      {shouldMarquee ? (
        <span
          className={cn(
            'flex w-max motion-reduce:hidden',
            'animate-marquee-slow hover:paused',
          )}
        >
          <span className="pr-10">{text}</span>
          <span className="pr-10" aria-hidden>
            {text}
          </span>
        </span>
      ) : null}
    </span>
  );
}
