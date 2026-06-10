/**
 * Select
 * ─────────────────────────────────────────────────────────────────────────────
 * Native select with custom styling. Native on all devices — avoids the
 * accessibility pitfalls of custom listboxes.
 *
 * @example
 *   <Select label="Tier" id="tier">
 *     <option value="free">Free</option>
 *     <option value="comp">Comp</option>
 *   </Select>
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';
import { Label } from './Label';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, wrapperClassName, id, required, className, children, ...props },
  ref,
) {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={cn(
            'w-full appearance-none px-4 py-3 pr-10 text-base',
            'bg-bg-elevated text-text-primary',
            'border rounded',
            error
              ? 'border-soft-error focus:ring-soft-error'
              : 'border-[var(--border)] focus:ring-accent',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'transition-colors duration-fast',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'cursor-pointer',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {/* Chevron */}
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-soft-error">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-sm text-text-secondary">{hint}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';
