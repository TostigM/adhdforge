/**
 * Textarea — auto-growing
 * ─────────────────────────────────────────────────────────────────────────────
 * Grows to fit content. Min 3 rows, no max by default.
 *
 * @example
 *   <Textarea label="Justification" id="just" rows={4} />
 */
'use client';

import React, { forwardRef, useEffect, useRef } from 'react';
import { cn } from '../lib/cn';
import { Label } from './Label';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, wrapperClassName, id, required, className, onChange, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const ref = (forwardedRef as React.RefObject<HTMLTextAreaElement>) ?? innerRef;
  const errorId = error && id ? `${id}-error` : undefined;

  function autoResize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => { autoResize(); }, []);

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}

      <textarea
        ref={ref}
        id={id}
        required={required}
        aria-invalid={!!error}
        aria-describedby={errorId}
        rows={3}
        onChange={(e) => {
          autoResize();
          onChange?.(e);
        }}
        className={cn(
          'w-full px-4 py-3 text-base resize-none overflow-hidden',
          'bg-bg-elevated text-text-primary placeholder:text-text-tertiary',
          'border rounded',
          error
            ? 'border-soft-error focus:ring-soft-error'
            : 'border-[var(--border)] focus:ring-accent',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'transition-colors duration-fast',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />

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

Textarea.displayName = 'Textarea';
