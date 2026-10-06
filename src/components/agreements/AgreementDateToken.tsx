import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { formatAgreementDate, localIsoDate, parseAgreementIsoDate } from '@/lib/agreements-model';
import { fitAgreementDatePicker } from '@/components/agreements/agreement-date-fit';

type AgreementDateTokenProps = {
  id: string;
  value: string;
  placeholder: string;
  ariaLabel?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
};

export function AgreementDateToken({
  id,
  value,
  placeholder,
  ariaLabel,
  invalid,
  onChange,
}: AgreementDateTokenProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const hoverCloses = useRef(true);
  const closeTimer = useRef<number | null>(null);
  const selected = parseAgreementIsoDate(value);
  const empty = !selected;
  const label = selected ? formatAgreementDate(value) : placeholder;

  const clearClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    if (!hoverCloses.current) return;
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => () => clearClose(), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || pickerRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    const place = () => {
      const trigger = rootRef.current?.getBoundingClientRect();
      const picker = pickerRef.current?.getBoundingClientRect();
      if (!trigger || !picker || picker.width === 0) return;
      setCoords(fitAgreementDatePicker({
        trigger,
        size: { width: picker.width, height: picker.height },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }));
      setReady(true);
    };
    place();
    const frame = window.requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  return (
    <span
      ref={rootRef}
      className="relative inline align-baseline"
      onMouseEnter={() => {
        clearClose();
        if (hoverCloses.current) setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        id={`agreement-token-${id}`}
        data-testid={`agreement-token-${id}`}
        data-iso-date={value || undefined}
        data-agreement-missing={invalid || undefined}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        className={cn(
          'inline border-0 border-b border-dashed bg-transparent p-0 font-[inherit] leading-[inherit] outline-none hover:border-foreground/40 focus:border-dashed focus:border-foreground/40 focus:outline-none',
          empty
            ? 'border-primary/70 font-medium text-primary'
            : 'border-foreground/40 font-medium text-foreground',
          invalid && 'rounded-sm ring-2 ring-destructive/70',
        )}
        onPointerDown={(event) => {
          if (event.pointerType === 'touch' || event.pointerType === 'pen') {
            hoverCloses.current = false;
          }
        }}
        onClick={() => {
          clearClose();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        {label}
      </button>
      {open && typeof document !== 'undefined' ? createPortal(
        <div
          ref={pickerRef}
          role="dialog"
          aria-label={`${ariaLabel || placeholder} calendar`}
          data-testid="agreement-date-picker"
          className="fixed z-50"
          style={{ left: coords.left, top: coords.top, visibility: ready ? 'visible' : 'hidden' }}
          onMouseEnter={clearClose}
          onMouseLeave={scheduleClose}
        >
          <div className="rounded-[18px] border border-border/60 bg-card p-2 shadow-xl">
            <Calendar
              mode="single"
              selected={selected}
              defaultMonth={selected}
              showOutsideDays
              formatters={{
                formatWeekdayName: (day) => (
                  ['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.getDay()]
                ),
              }}
              className="p-1"
              classNames={{
                caption_label: 'text-[13px] font-semibold tracking-tight',
                weekday: 'w-8 text-[11px] font-medium text-muted-foreground',
                day: 'h-8 w-8 p-0',
                day_button: 'h-8 w-8 rounded-full p-0 font-normal hover:bg-muted',
                selected:
                  '[&>button]:rounded-full [&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground [&>button:focus]:bg-primary [&>button:focus]:text-primary-foreground',
                today: '[&>button]:rounded-full [&>button]:bg-transparent [&>button]:font-semibold [&>button]:text-primary [&>button[aria-selected=true]]:text-primary-foreground',
                button_previous: 'h-7 w-7 rounded-full border-0 bg-transparent opacity-60 hover:bg-muted hover:opacity-100',
                button_next: 'h-7 w-7 rounded-full border-0 bg-transparent opacity-60 hover:bg-muted hover:opacity-100',
              }}
              onSelect={(date) => {
                if (!date) return;
                onChange(localIsoDate(date));
                setOpen(false);
              }}
            />
          </div>
        </div>,
        document.body,
      ) : null}
    </span>
  );
}
