/**
 * Checkbox — large, satisfying tick
 * ─────────────────────────────────────────────────────────────────────────────
 * @example
 *   <Checkbox id="sendInvite" label="Send invite email" />
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  hint?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
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
          type="checkbox"
          className={cn(
            'peer h-5 w-5 appearance-none rounded',
            'border border-[var(--border)] bg-bg-elevated',
            'checked:bg-accent checked:border-accent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]',
            'transition-colors duration-fast cursor-pointer',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {/* Checkmark (visible when checked) */}
        <svg
          className={cn(
            'pointer-events-none absolute inset-0 h-5 w-5',
            'text-white opacity-0 peer-checked:opacity-100',
            'transition-opacity duration-fast',
          )}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3.5 8L6.5 11L12.5 5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {(label || hint) && (
        <span className="space-y-0.5">
          {label && (
            <span className="block text-sm font-medium text-text-primary group-hover:text-text-primary">
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

Checkbox.displayName = 'Checkbox';
