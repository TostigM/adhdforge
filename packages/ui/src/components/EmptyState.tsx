/**
 * EmptyState — encouraging, never blank
 * ─────────────────────────────────────────────────────────────────────────────
 * Per 02-design-system.md §11.1:
 *   1. Soft illustration (icon or emoji)
 *   2. Encouraging message — never "You have nothing"
 *   3. Single primary action
 *
 * @example
 *   <EmptyState
 *     icon="✨"
 *     message="Nothing on your plate right now. That's allowed."
 *     action={<Button>Capture a thought</Button>}
 *   />
 */
import React from 'react';
import { cn } from '../lib/cn';

export interface EmptyStateProps {
  /** Emoji, SVG, or any visual element */
  icon?: React.ReactNode;
  /** Primary message — keep it kind */
  message: string;
  /** Secondary supporting text */
  description?: string;
  /** Single CTA */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon = '✨',
  message,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-12 px-6 space-y-4',
        className,
      )}
    >
      {icon && (
        <div className="text-4xl" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="space-y-2 max-w-prose">
        <p className="text-lg font-medium text-text-primary">{message}</p>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';
