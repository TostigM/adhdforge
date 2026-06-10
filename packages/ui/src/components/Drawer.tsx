/**
 * Drawer — slides in from the right
 * ─────────────────────────────────────────────────────────────────────────────
 * For settings panels, "All tasks" backlog, secondary content.
 * Dismisses on Esc and backdrop click.
 *
 * @example
 *   <Drawer open={open} onClose={() => setOpen(false)} title="Settings">
 *     …settings content…
 *   </Drawer>
 */
'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/cn';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  children: React.ReactNode;
}

const widthStyles: Record<NonNullable<DrawerProps['width']>, string> = {
  sm:   'max-w-xs',
  md:   'max-w-sm',
  lg:   'max-w-lg',
  full: 'max-w-full',
};

export function Drawer({
  open,
  onClose,
  title,
  width = 'md',
  className,
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      panelRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-overlay backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 h-full w-full',
          widthStyles[width],
          'bg-bg-surface border-l border-[var(--border)] shadow-lg',
          'flex flex-col',
          'translate-x-0 animate-slide-up',
          'focus:outline-none',
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close drawer"
              className={cn(
                'h-9 w-9 flex items-center justify-center rounded',
                'text-text-tertiary hover:text-text-primary',
                'hover:bg-bg-elevated transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

Drawer.displayName = 'Drawer';
