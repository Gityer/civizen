import { useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { type SentenceTokenProps, canHoverOpen } from '@/components/market/market-jobs-form-shared';

export function SentenceToken({
  open,
  onOpenChange,
  ariaLabel,
  empty,
  dimWhenEmpty = true,
  emphasis = 'primary',
  children,
  panel,
  contentClassName,
  triggerClassName,
  onHoverChange,
}: SentenceTokenProps) {
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    onOpenChange(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => onOpenChange(false), 160);
  };

  const setHovered = (hovered: boolean) => {
    onHoverChange?.(hovered);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer();
        onOpenChange(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          data-token-emphasis={emphasis}
          className={cn(
            'ml-0.5 mr-0.5 inline-flex max-w-[min(22rem,calc(100vw-6rem))] items-center rounded-sm border-b border-dashed px-0.5 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            emphasis === 'secondary'
              ? 'border-primary/35 font-normal text-primary/55 hover:border-primary/70 hover:text-primary'
              : 'border-primary/55 font-medium text-primary hover:border-primary',
            empty && dimWhenEmpty && 'text-muted-foreground',
            triggerClassName,
          )}
          onMouseEnter={() => {
            setHovered(true);
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            setHovered(false);
            if (canHoverOpen()) scheduleClose();
          }}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
        >
          <span className="inline-flex items-center gap-1.5 whitespace-normal leading-none">{children}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn('w-[min(18rem,calc(100vw-2rem))] p-0', contentClassName)}
        onMouseEnter={() => {
          setHovered(true);
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          setHovered(false);
          if (canHoverOpen()) scheduleClose();
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

export function CyclingOptionsLabel({
  options,
  index,
  active,
  fallback,
}: {
  options: readonly string[];
  index: number;
  active: boolean;
  fallback: string;
}) {
  if (!active || options.length === 0) return <>{fallback}</>;
  const label = options[((index % options.length) + options.length) % options.length] ?? fallback;
  return (
    <span className="inline-block min-w-[4.5ch] font-semibold text-primary transition-opacity duration-300" aria-hidden>
      {label}
    </span>
  );
}

export function ChoicePanel({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(
            'rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-primary/10',
            option === value && 'bg-primary/15 font-medium text-primary',
          )}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
