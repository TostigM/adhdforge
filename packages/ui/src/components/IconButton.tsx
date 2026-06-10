/**
 * IconButton
 * ─────────────────────────────────────────────────────────────────────────────
 * For icon-only buttons. aria-label is REQUIRED — never leave it empty.
 *
 * Rule (COGA §10.2): icon-only buttons must have a visible label for critical
 * actions. This component is for secondary/tertiary actions. For critical
 * buttons use <Button leftIcon={...}>Label</Button> instead.
 *
 * @example
 *   <IconButton aria-label="Close dialog"><X /></IconButton>
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — never omit. Screen readers read this aloud. */
  'aria-label': string;
  /** Size of the button (and icon target area) */
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'secondary';
}

const sizeStyles: Record<NonNullable<IconButtonProps['size']>, string> = {
  sm: 'h-9 w-9 rounded',
  md: 'h-11 w-11 rounded',
  lg: 'h-12 w-12 rounded-lg',
};

const variantStyles: Record<NonNullable<IconButtonProps['variant']>, string> = {
  ghost:     'bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
  secondary: 'bg-bg-elevated text-text-primary border border-[var(--border)] hover:brightness-110',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 'md', variant = 'ghost', className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center',
        'transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeStyles[size as keyof typeof sizeStyles],
        variantStyles[variant as keyof typeof variantStyles],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';
