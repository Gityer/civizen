import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type AgreementFitTextareaProps = {
  value: string;
  ariaLabel: string;
  testId: string;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onCancel: () => void;
};

function fitTextareaToContent(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}

/** Native paragraph editor that grows with its text and never scrolls. */
export function AgreementFitTextarea({
  value,
  ariaLabel,
  testId,
  autoFocus,
  onChange,
  onBlur,
  onCancel,
}: AgreementFitTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    fitTextareaToContent(ref.current);
  }, [value]);

  return (
    <textarea
      ref={ref}
      data-testid={testId}
      aria-label={ariaLabel}
      value={value}
      autoFocus={autoFocus}
      rows={1}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      onInput={(event) => fitTextareaToContent(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      className="block w-full resize-none overflow-hidden border-0 border-b border-dashed border-foreground/40 bg-transparent p-0 leading-[inherit] text-foreground outline-none field-sizing-content"
    />
  );
}

type AgreementEditableWordingProps = {
  value: string;
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
};

/** Looks like document text until clicked, then a native input. */
export function AgreementEditableWording({
  value,
  ariaLabel,
  className,
  onChange,
}: AgreementEditableWordingProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const snapshot = useRef(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  if (editing) {
    return (
      <AgreementFitTextarea
        value={draft}
        ariaLabel={ariaLabel}
        testId="agreement-paragraph-editor"
        autoFocus
        onChange={setDraft}
        onBlur={() => {
          onChange(draft);
          setEditing(false);
        }}
        onCancel={() => {
          setDraft(snapshot.current);
          onChange(snapshot.current);
          setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      data-testid="agreement-paragraph-wording"
      aria-label={ariaLabel}
      className={cn(
        'block w-full border-0 border-b border-transparent bg-transparent p-0 text-left font-[inherit] leading-[inherit] text-inherit hover:border-dashed hover:border-foreground/40 focus:border-dashed focus:border-foreground/40 focus:outline-none',
        className,
      )}
      onClick={() => {
        snapshot.current = value;
        setDraft(value);
        setEditing(true);
      }}
    >
      {value}
    </button>
  );
}
