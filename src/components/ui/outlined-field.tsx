import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type OutlinedFieldProps = {
  label: string;
  htmlFor?: string;
  className?: string;
  legendClassName?: string;
  endAdornment?: ReactNode;
  children: ReactNode;
};

/**
 * Standard Civizen form field: rounded outline with the label sitting on the
 * upper-left border (fieldset legend), not stacked above a dashed underline.
 */
export function OutlinedField({
  label,
  htmlFor,
  className,
  legendClassName,
  endAdornment,
  children,
}: OutlinedFieldProps) {
  return (
    <fieldset
      className={cn(
        'min-w-0 rounded-md border border-input bg-background px-3 pb-1.5 pt-0',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring',
        '[&_input]:h-9 [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:shadow-none',
        '[&_input]:focus-visible:ring-0 [&_input]:focus-visible:ring-offset-0',
        '[&_textarea]:min-h-18 [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:px-0 [&_textarea]:shadow-none',
        '[&_textarea]:focus-visible:ring-0 [&_textarea]:focus-visible:ring-offset-0',
        className,
      )}
      data-outlined-field=""
    >
      <legend
        className={cn(
          'ml-0 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground',
          legendClassName,
        )}
      >
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
      </legend>
      {endAdornment ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">{children}</div>
          {endAdornment}
        </div>
      ) : (
        children
      )}
    </fieldset>
  );
}
