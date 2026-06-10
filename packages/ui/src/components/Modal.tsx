/**
 * Modal — centered dialog with focus trap
 * ─────────────────────────────────────────────────────────────────────────────
 * Dismisses on Esc and backdrop click.
 * Focus is trapped inside while open; returns to trigger on close.
 *
 * @example
 *   <Modal open={open} onClose={() => setOpen(false)} title="Confirm action">
 *     <p>Are you sure?</p>
 *     <div className="flex gap-3 mt-4">
 *       <Button onClick={() => setOpen(false)}>Cancel</Button>
 *       <Button variant="soft-destructive" onClick={confirm}>Confirm</Button>
 *     </div>
 *   </Modal>
 */
'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '../lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Prevents closing on backdrop click (not Esc — Esc always closes) */
  preventBackdropClose?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  preventBackdropClose = false,
  className,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Open/close via the native dialog API
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
    } else {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  // Close on Esc (native dialog handles this, but we need to sync state)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        // Reset native dialog styles
        'bg-transparent p-0 border-0 max-w-none',
        // Backdrop via ::backdrop pseudo-element
        'backdrop:bg-bg-overlay backdrop:backdrop-blur-sm',
        // Positioning
        'm-auto',
        // Our modal styling
        '[&[open]]:flex [&[open]]:items-center [&[open]]:justify-center',
        'min-h-screen w-screen fixed inset-0',
      )}
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => {
        // Close on backdrop click (click is on the dialog itself, not its content)
        if (!preventBackdropClose && e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      {/* Content */}
      <div
        className={cn(
          'bg-bg-surface rounded-xl shadow-lg border border-[var(--border)]',
          'w-full max-w-md mx-4 p-6',
          'animate-fade-in',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2
            id="modal-title"
            className="text-xl font-bold text-text-primary mb-4"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </dialog>
  );
}

Modal.displayName = 'Modal';
