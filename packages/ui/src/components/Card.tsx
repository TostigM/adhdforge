/**
 * Card — primary content surface
 * ─────────────────────────────────────────────────────────────────────────────
 * @example
 *   <Card>…content…</Card>
 *   <Card padding="lg" className="max-w-md mx-auto">…</Card>
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Adds a shadow and slight lift */
  elevated?: boolean;
}

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padding = 'md', elevated = false, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'bg-bg-surface rounded-xl border border-[var(--border)]',
        elevated && 'shadow-lg',
        paddingStyles[padding as keyof typeof paddingStyles],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';
