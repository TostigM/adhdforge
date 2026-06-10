'use client';

/**
 * TodayCard — task card for the Today visible set
 * ──────────────────────────────────────────────────────────────────────────────
 * Differs from the backlog TaskCard:
 *   • "Done. Next step."   → completes the plan item + triggers bubble-up
 *   • "Push it back"       → swaps flexible task to queue end (no button for anchors)
 *   • Anchors show a pin indicator and cannot be swapped (time-true)
 *   • Gentle Reframe card is shown inline when needed
 *
 * Soft-Track Protocol: no red, no "failed", no counters of postponements.
 */

import React, { useTransition } from 'react';
import Link from 'next/link';
import type { TodayItem } from '@focus-forge/domain/daily-plan/get-today-view';

// ─── Priority display ─────────────────────────────────────────────────────────

const PRIORITY_LABEL = { cant_miss: 'Amber', high: 'Gold', med: 'Silver', low: 'Bronze' } as const;
const PRIORITY_DOT: Record<string, string> = {
  cant_miss: 'bg-amber-400',
  high: 'bg-yellow-500',
  med: 'bg-slate-400',
  low: 'bg-amber-700',
};
const PRIORITY_TEXT: Record<string, string> = {
  cant_miss: 'text-amber-400',
  high: 'text-yellow-500',
  med: 'text-slate-400',
  low: 'text-amber-700',
};

// ─── Props ────────────────────────────────────────────────────────────────────

export type TodayCardProps = {
  item: TodayItem;
  onComplete: () => Promise<void>;
  onSwap: () => Promise<void>;
  onReframeAction?: (action: 'break' | 'lower' | 'anchor' | 'snooze') => Promise<void>;
  /** "moved to queue" flash — set true after a swap to briefly confirm */
  movedConfirmation?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TodayCard({
  item,
  onComplete,
  onSwap,
  onReframeAction,
  movedConfirmation,
}: TodayCardProps) {
  const [completePending, startComplete] = useTransition();
  const [swapPending, startSwap] = useTransition();
  const isPending = completePending || swapPending;

  const displayText = item.title ?? item.rawText;
  const isAnchor = item.priorityKind === 'anchor';

  return (
    <article
      className={[
        'rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]',
        'px-5 py-4 transition-opacity',
        isPending ? 'opacity-60 pointer-events-none' : '',
      ].join(' ')}
      aria-label={`Task: ${displayText}`}
    >
      {/* Priority + anchor badge row */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 ${PRIORITY_DOT[item.priorityLevel] ?? 'bg-slate-400'}`}
          aria-hidden="true"
        />
        <span className={`text-xs font-medium uppercase tracking-wide ${PRIORITY_TEXT[item.priorityLevel] ?? 'text-slate-400'}`}>
          {PRIORITY_LABEL[item.priorityLevel]}
          {isAnchor && (
            <span className="ml-1 text-[var(--text-tertiary)]">· 📌 Pinned</span>
          )}
        </span>

        {item.scheduledFor && (
          <span className="ml-auto text-xs text-[var(--text-tertiary)] tabular-nums">
            {new Date(item.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Task text */}
      <p className="text-[var(--text-primary)] text-base leading-snug font-medium mb-3">
        {displayText}
      </p>

      {/* Estimate */}
      {item.estimatedMinutes && (
        <p className="text-xs text-[var(--text-tertiary)] mb-3">~{item.estimatedMinutes} min</p>
      )}

      {/* Break into steps (flexible tasks only — anchors are time-bound events) */}
      {!isAnchor && (
        <Link
          href={`/tasks/${item.taskId}`}
          className="inline-block text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-3 transition-colors"
        >
          Break into steps →
        </Link>
      )}

      {/* "Moved to queue" confirmation flash */}
      {movedConfirmation && (
        <p
          role="status"
          className="text-xs text-[var(--text-secondary)] mb-2 italic"
          aria-live="polite"
        >
          Moved it to the queue — something else is up next.
        </p>
      )}

      {/* Gentle Reframe card */}
      {item.showReframeCard && onReframeAction && (
        <div className="mb-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
            This one keeps sliding — totally okay.
          </p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            Want to make it easier to move forward?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'break' as const, label: '🧩 Break into steps' },
              { key: 'lower' as const, label: '↓ Lower its priority' },
              { key: 'anchor' as const, label: '📌 Give it a set time' },
              { key: 'snooze' as const, label: 'Not now, don\'t ask again' },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onReframeAction(key)}
                className="rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors text-left"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => startComplete(async () => { await onComplete(); })}
          disabled={isPending}
          className={[
            'flex-1 rounded-xl px-3 py-2 text-sm font-medium',
            'bg-[var(--accent)] text-slate-900',
            'hover:opacity-90 active:scale-95 transition-all',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
            'disabled:opacity-50',
          ].join(' ')}
        >
          {completePending ? 'Completing…' : 'Done. Next step.'}
        </button>

        {/* Anchors cannot be swapped — they're time-true */}
        {!isAnchor && (
          <button
            type="button"
            onClick={() => startSwap(async () => { await onSwap(); })}
            disabled={isPending}
            className={[
              'flex-1 rounded-xl px-3 py-2 text-sm font-medium',
              'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
              'hover:text-[var(--text-primary)] transition-all',
              'border border-[var(--border)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
              'disabled:opacity-50',
            ].join(' ')}
          >
            {swapPending ? 'Moving…' : 'Push it back'}
          </button>
        )}
      </div>
    </article>
  );
}
