/**
 * SkeletonLoader — for predictable layouts during fetch
 * ─────────────────────────────────────────────────────────────────────────────
 * Use for 200–500ms wait times when the layout is known.
 *
 * @example
 *   <SkeletonLoader lines={3} />
 *   <SkeletonLoader variant="card" />
 */
import React from 'react';
import { cn } from '../lib/cn';

export interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'avatar' | 'button';
  /** Number of text lines (only for variant='text') */
  lines?: number;
  className?: string;
}

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-bg-elevated rounded animate-pulse',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonLoader({
  variant = 'text',
  lines = 3,
  className,
}: SkeletonLoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading…"
      className={cn('space-y-3', className)}
    >
      <span className="sr-only">Loading…</span>

      {variant === 'text' && (
        <>
          {Array.from({ length: lines }, (_, i) => (
            <Bone
              key={i}
              className={cn(
                'h-4',
                i === lines - 1 ? 'w-3/4' : 'w-full',
              )}
            />
          ))}
        </>
      )}

      {variant === 'card' && (
        <div className="bg-bg-surface rounded-xl border border-[var(--border)] p-6 space-y-4">
          <Bone className="h-5 w-1/2" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-5/6" />
          <Bone className="h-4 w-3/4" />
        </div>
      )}

      {variant === 'avatar' && (
        <Bone className="h-10 w-10 rounded-full" />
      )}

      {variant === 'button' && (
        <Bone className="h-11 w-32 rounded-xl" />
      )}
    </div>
  );
}

SkeletonLoader.displayName = 'SkeletonLoader';
