/**
 * Toggle — for binary settings
 * ─────────────────────────────────────────────────────────────────────────────
 * @example
 *   <Toggle id="sounds" label="Enable sounds" checked={sounds} onChange={setSounds} />
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  hint?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(function Toggle(
  { label, hint, id, className, ...props },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between gap-4 cursor-pointer group"
    >
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

      {/* Track */}
      <span className="relative inline-flex flex-shrink-0">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          role="switch"
          className={cn(
            'peer sr-only',
            'focus-visible:ring-2 focus-visible:ring-accent',
            className,
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            'block h-6 w-11 rounded-full',
            'bg-bg-elevated border border-[var(--border)]',
            'peer-checked:bg-accent peer-checked:border-accent',
            'transition-colors duration-fast',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-accent',
            'peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--bg-page)]',
            'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
          )}
        />
        {/* Thumb */}
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-0.5 top-0.5',
            'h-5 w-5 rounded-full bg-text-tertiary',
            'peer-checked:translate-x-5 peer-checked:bg-white',
            'transition-all duration-fast',
          )}
        />
      </span>
    </label>
  );
});

Toggle.displayName = 'Toggle';
