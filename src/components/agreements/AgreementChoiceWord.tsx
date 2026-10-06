import { useEffect, useRef, useState } from 'react';

import { AgreementFitInput } from '@/components/agreements/AgreementInlineToken';
import { cn } from '@/lib/utils';
import type { AgreementChoiceOption } from '@/lib/agreements-templates';

type AgreementChoiceWordProps = {
  value: string;
  options: AgreementChoiceOption[];
  ariaLabel: string;
  allowRename?: boolean;
  className?: string;
  onChange: (label: string, optionId?: string) => void;
};

export function AgreementChoiceWord({
  value,
  options,
  ariaLabel,
  allowRename = true,
  className,
  onChange,
}: AgreementChoiceWordProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(value);
  const rootRef = useRef<HTMLSpanElement>(null);
  const pressTimer = useRef<number | null>(null);
  const openedByHold = useRef(false);

  const alternatives = options.filter((option) => option.label !== value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setRenaming(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const commitRename = () => {
    const next = draft.trim() || value;
    onChange(next);
    setRenaming(false);
    setOpen(false);
  };

  const startRename = () => {
    if (!allowRename) return;
    setOpen(false);
    setDraft(value);
    setRenaming(true);
  };

  const showAlternatives = () => {
    if (!alternatives.length) return;
    setOpen(true);
  };

  const clearPressTimer = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  if (renaming) {
    return (
      <span ref={rootRef} className={cn('inline align-baseline', className)}>
        <AgreementFitInput
          id={`agreement-choice-${ariaLabel.replace(/\s+/g, '-').toLowerCase()}`}
          testId="agreement-choice-rename"
          value={draft}
          placeholder={value}
          ariaLabel={ariaLabel}
          className={className}
          onChange={setDraft}
          autoFocus
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitRename();
            }
            if (event.key === 'Escape') {
              setDraft(value);
              setRenaming(false);
            }
          }}
        />
      </span>
    );
  }

  return (
    <span
      ref={rootRef}
      data-testid="agreement-choice-hover"
      className={cn('relative inline align-baseline', className)}
      onMouseEnter={showAlternatives}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup={alternatives.length ? 'listbox' : undefined}
        aria-expanded={alternatives.length ? open : undefined}
        aria-label={ariaLabel}
        data-testid="agreement-choice-word"
        className={cn(
          'inline border-0 border-b border-transparent bg-transparent p-0 font-[inherit] leading-[inherit] text-inherit hover:border-dashed hover:border-foreground/40 focus:border-dashed focus:border-foreground/40 focus:outline-none',
          className,
        )}
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
          openedByHold.current = false;
          clearPressTimer();
          pressTimer.current = window.setTimeout(() => {
            openedByHold.current = true;
            showAlternatives();
          }, 420);
        }}
        onPointerUp={clearPressTimer}
        onPointerCancel={clearPressTimer}
        onClick={() => {
          if (openedByHold.current) {
            openedByHold.current = false;
            return;
          }
          if (!allowRename) {
            showAlternatives();
            return;
          }
          startRename();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && alternatives.length) {
            event.preventDefault();
            showAlternatives();
          }
        }}
      >
        {value}
      </button>
      {open && alternatives.length ? (
        <ul
          role="listbox"
          className="absolute left-0 z-20 mt-1 min-w-48 overflow-hidden rounded-lg border border-border/70 bg-card py-1 text-left text-sm font-normal normal-case tracking-normal shadow-md"
        >
          {alternatives.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="block w-full px-3 py-1.5 text-left text-foreground/90 hover:bg-muted/50"
                onClick={() => {
                  onChange(option.label, option.id);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}
