/**
 * Toast + ToastProvider
 * ─────────────────────────────────────────────────────────────────────────────
 * Non-blocking notifications. Auto-dismiss at 4s.
 * Never use for errors that need immediate action — use inline error messages.
 *
 * Usage:
 *   1. Wrap your app in <ToastProvider>
 *   2. Call `const { addToast } = useToast()` in any client component
 *   3. addToast({ message: 'Saved!', type: 'success' })
 *
 * @example
 *   addToast({ message: 'Account updated.', type: 'success' })
 *   addToast({ message: 'Still working — promise', type: 'info', duration: 8000 })
 */
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { cn } from '../lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastData {
  id: string;
  message: string;
  type?: ToastType;
  /** ms — default 4000 */
  duration?: number;
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast region — ARIA live region for screen readers */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className={cn(
          'fixed bottom-4 right-4 z-toast',
          'flex flex-col gap-3 items-end',
          'pointer-events-none',
        )}
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Individual Toast ─────────────────────────────────────────────────────────

const typeStyles: Record<ToastType, string> = {
  success: 'border-l-4 border-success bg-bg-surface',
  info:    'border-l-4 border-info    bg-bg-surface',
  warning: 'border-l-4 border-warning bg-bg-surface',
  error:   'border-l-4 border-soft-error bg-bg-surface',
};

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  info:    'ℹ',
  warning: '⚠',
  error:   '!',
};

const typeIconColors: Record<ToastType, string> = {
  success: 'text-success',
  info:    'text-info',
  warning: 'text-warning',
  error:   'text-soft-error',
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastData;
  onRemove: (id: string) => void;
}) {
  const type = toast.type ?? 'info';
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onRemove]);

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto w-full max-w-xs',
        'flex items-start gap-3 px-4 py-3 rounded-xl',
        'shadow-lg',
        'animate-slide-up',
        typeStyles[type],
      )}
    >
      <span className={cn('text-sm font-bold flex-shrink-0 mt-0.5', typeIconColors[type])} aria-hidden="true">
        {typeIcons[type]}
      </span>
      <p className="text-sm text-text-primary flex-1">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        className={cn(
          'flex-shrink-0 text-text-tertiary hover:text-text-secondary',
          'transition-colors rounded',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
