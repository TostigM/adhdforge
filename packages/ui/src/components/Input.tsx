/**
 * Input
 * ─────────────────────────────────────────────────────────────────────────────
 * Supports: text, email, password (with show/hide toggle), and other HTML types.
 * Errors use fuchsia (soft-error), never red.
 *
 * @example
 *   <Input label="Your email" type="email" id="email" />
 *   <Input label="Password" type="password" id="pw" error="Check your password." />
 */
'use client';

import React, { forwardRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Label } from './Label';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Renders a <Label> above the input */
  label?: string;
  /** Shows below the input in fuchsia */
  error?: string;
  /** Shows below the input in secondary text */
  hint?: string;
  /** Link to the right of the label (e.g., "Forgot password?") */
  labelAction?: React.ReactNode;
  /** Wrapper div className */
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    labelAction,
    wrapperClassName,
    type = 'text',
    id,
    required,
    className,
    ...props
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const errorId = error && id ? `${id}-error` : undefined;
  const hintId  = hint  && id ? `${id}-hint`  : undefined;

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {(label || labelAction) && (
        <div className="flex items-center justify-between">
          {label && (
            <Label htmlFor={id} required={required}>
              {label}
            </Label>
          )}
          {labelAction}
        </div>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={inputType}
          required={required}
          aria-invalid={!!error}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
          className={cn(
            'w-full px-4 py-3 text-base',
            'bg-bg-elevated text-text-primary placeholder:text-text-tertiary',
            'border rounded',
            error
              ? 'border-soft-error focus:ring-soft-error'
              : 'border-[var(--border)] focus:ring-accent',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'transition-colors duration-fast',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isPassword && 'pr-12',
            className,
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((p) => !p)}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'text-text-tertiary hover:text-text-secondary transition-colors',
              'p-1 rounded focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-accent',
            )}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-soft-error">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-sm text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
