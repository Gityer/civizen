import type { KeyboardEvent } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { AgreementDateToken } from '@/components/agreements/AgreementDateToken';
import { AgreementRichText } from '@/components/agreements/AgreementRichText';
import { cn } from '@/lib/utils';

type AgreementFitInputProps = {
  id: string;
  value: string;
  placeholder: string;
  ariaLabel?: string;
  testId: string;
  tone?: 'fill' | 'muted';
  className?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  autoFocus?: boolean;
  invalid?: boolean;
};

/** Inline field that wraps at words so a first name can stay on the current line. */
export function AgreementFitInput({
  id,
  value,
  placeholder,
  ariaLabel,
  testId,
  tone = 'fill',
  className,
  onChange,
  onBlur,
  onKeyDown,
  autoFocus,
  invalid,
}: AgreementFitInputProps) {
  const editorRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const empty = value.length === 0;

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || focused) return;
    const next = value;
    if ((editor.textContent || '') !== next) editor.textContent = next;
  }, [focused, value]);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  return (
    <span
      ref={editorRef}
      id={id}
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      data-testid={testId}
      data-placeholder={placeholder}
      data-agreement-missing={invalid || undefined}
      aria-invalid={invalid || undefined}
      aria-label={ariaLabel || placeholder}
      aria-placeholder={placeholder}
      className={cn(
        'inline! align-baseline border-b border-dashed bg-transparent leading-[inherit] outline-none wrap-break-word',
        tone === 'muted'
          ? empty
            ? 'border-muted-foreground/35 font-normal text-muted-foreground caret-muted-foreground before:pointer-events-none before:text-muted-foreground/55 before:content-[attr(data-placeholder)]'
            : 'border-muted-foreground/40 font-normal text-muted-foreground'
          : empty
            ? 'border-primary/70 font-medium text-primary caret-primary before:pointer-events-none before:text-primary before:content-[attr(data-placeholder)]'
            : 'border-foreground/40 font-medium text-foreground',
        invalid && 'rounded-sm ring-2 ring-destructive/70',
        className,
      )}
      onFocus={() => setFocused(true)}
      onClick={() => editorRef.current?.focus()}
      onInput={() => onChange(editorRef.current?.textContent || '')}
      onBlur={() => {
        setFocused(false);
        onChange(editorRef.current?.textContent || '');
        onBlur?.();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.preventDefault();
        onKeyDown?.(event);
      }}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData('text/plain').replace(/\s+/g, ' ');
        document.execCommand('insertText', false, text);
        onChange(editorRef.current?.textContent || '');
      }}
    />
  );
}

type AgreementInlineTokenProps = {
  id: string;
  value: string;
  placeholder: string;
  ariaLabel?: string;
  kind?: 'text' | 'date' | 'multiline';
  invalid?: boolean;
  onChange: (value: string) => void;
};

export function AgreementInlineToken({
  id,
  value,
  placeholder,
  ariaLabel,
  kind = 'text',
  invalid,
  onChange,
}: AgreementInlineTokenProps) {
  if (kind === 'multiline') {
    return (
      <AgreementRichText
        value={value}
        placeholder={placeholder}
        ariaLabel={ariaLabel || placeholder}
        testId={`agreement-token-${id}`}
        flow="inline"
        invalid={invalid}
        onChange={onChange}
      />
    );
  }

  if (kind === 'date') {
    return (
      <AgreementDateToken
        id={id}
        value={value}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        invalid={invalid}
        onChange={onChange}
      />
    );
  }

  return (
    <AgreementFitInput
      id={`agreement-token-${id}`}
      testId={`agreement-token-${id}`}
      value={value}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      invalid={invalid}
      onChange={onChange}
    />
  );
}
