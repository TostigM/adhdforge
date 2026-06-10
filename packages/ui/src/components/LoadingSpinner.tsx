/**
 * LoadingSpinner — only for operations > 500ms
 * ─────────────────────────────────────────────────────────────────────────────
 * Per §11.2: below 500ms show nothing, 200–500ms show subtle skeleton.
 * Use this for operations you know will take > 500ms.
 *
 * @example
 *   <LoadingSpinner />
 *   <LoadingSpinner size="lg" label="Loading your tasks…" />
 */
import React from 'react';
import { cn } from '../lib/cn';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label for screen readers */
  label?: string;
  className?: string;
}

const sizeStyles: Record<NonNullable<LoadingSpinnerProps['size']>, { svg: string; text: string }> = {
  sm: { svg: 'h-5 w-5', text: 'text-xs' },
  md: { svg: 'h-8 w-8', text: 'text-sm' },
  lg: { svg: 'h-12 w-12', text: 'text-base' },
};

export function LoadingSpinner({
  size = 'md',
  label,
  className,
}: LoadingSpinnerProps) {
  const { svg, text } = sizeStyles[size];

  return (
    <div
      role="status"
      className={cn('flex flex-col items-center gap-3', className)}
    >
      <svg
        className={cn('animate-spin text-accent', svg)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      <span className={cn('sr-only', label && 'not-sr-only text-text-secondary', text)}>
        {label ?? 'Loading…'}
      </span>
    </div>
  );
}

LoadingSpinner.displayName = 'LoadingSpinner';
