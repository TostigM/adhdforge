/**
 * Radio
 * ─────────────────────────────────────────────────────────────────────────────
 * @example
 *   <Radio id="dark" name="theme" value="dark" label="Dark" />
 *   <Radio id="light" name="theme" value="light" label="Light" />
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  hint?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, hint, id, className, ...props },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className="inline-flex items-start gap-3 cursor-pointer group"
    >
      <span className="relative flex-shrink-0 mt-0.5">
        <input
          ref={ref}
          id={id}
          type="radio"
          className={cn(
            'peer h-5 w-5 appearance-none rounded-full',
            'border border-[var(--border)] bg-bg-elevated',
            'checked:border-accent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]',
            'transition-colors duration-fast cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {/* Dot (visible when checked) */}
        <span
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center',
            'opacity-0 peer-checked:opacity-100 transition-opacity duration-fast',
          )}
          aria-hidden="true"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
      </span>

      {(label || hint) && (
        <span className="space-y-0.5">
          {label && (
            <span className="block text-sm font-medium text-text-primary">
              {label}
            </span>
          )}
          {hint && (
            <span className="block text-xs text-text-secondary">{hint}</span>
          )}
        </span>
      )}
    </label>
  );
});

Radio.displayName = 'Radio';
