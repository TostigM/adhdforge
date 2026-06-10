/**
 * Button
 * ─────────────────────────────────────────────────────────────────────────────
 * Variants: primary, secondary, ghost, soft-destructive
 * Sizes: sm, md (default), lg
 *
 * Rules:
 *   • No red. soft-destructive uses fuchsia.
 *   • Minimum 44×44px touch target (md and lg satisfy this by default).
 *   • Always show visible focus ring.
 *
 * @example
 *   <Button>Save</Button>
 *   <Button variant="soft-destructive" size="sm">Remove</Button>
 *   <Button loading>Saving…</Button>
 */
import React, { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'soft-destructive';
  /** Size — md and lg meet 44px touch target minimum */
  size?: 'sm' | 'md' | 'lg';
  /** Shows a spinner and disables the button */
  loading?: boolean;
  /** Icon to the left of the label */
  leftIcon?: React.ReactNode;
  /** Icon to the right of the label */
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-soft active:opacity-90 ' +
    'shadow-sm focus-visible:ring-accent',
  secondary:
    'bg-bg-elevated text-text-primary border border-[var(--border)] ' +
    'hover:bg-[var(--bg-elevated)] hover:brightness-110 active:brightness-95 ' +
    'focus-visible:ring-accent',
  ghost:
    'bg-transparent text-text-secondary hover:bg-bg-elevated hover:text-text-primary ' +
    'active:bg-bg-elevated focus-visible:ring-accent',
  'soft-destructive':
    'bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-700/50 ' +
    'hover:bg-fuchsia-900/70 active:bg-fuchsia-900 focus-visible:ring-fuchsia-500',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm:  'h-9 min-w-[2.25rem] px-3 text-sm rounded',
  md:  'h-11 min-w-[2.75rem] px-4 text-base rounded',
  lg:  'h-12 min-w-[3rem] px-6 text-base rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    children,
    className,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        // Base
        'inline-flex items-center justify-center gap-2',
        'font-medium transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[var(--bg-page)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        // Variant + size
        variantStyles[variant as keyof typeof variantStyles],
        sizeStyles[size as keyof typeof sizeStyles],
        className,
      )}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size as 'sm' | 'md' | 'lg'} />
          {children}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// ─── Inline spinner ───────────────────────────────────────────────────────────

function Spinner({ size }: { size: ButtonProps['size'] }) {
  const sz = size === 'sm' ? 14 : 16;
  return (
    <svg
      width={sz}
      height={sz}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
