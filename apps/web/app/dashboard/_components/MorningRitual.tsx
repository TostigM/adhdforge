'use client';

/**
 * MorningRitual — once-a-day 10-second "what would feel like a win?" prompt
 * ──────────────────────────────────────────────────────────────────────────────
 * Shows when ritualState === 'pending'. Never blocks app load.
 * Anchors for today are pre-loaded (cannot be removed here — they're time-true).
 * Flexible high/med suggestions shown as tappable chips.
 *
 * See 02-design-system.md §13.5.3
 */

import React, { useState, useTransition } from 'react';
import type { RitualSuggestion } from '@focus-forge/domain/daily-plan/get-today-view';

// ─── Props ────────────────────────────────────────────────────────────────────

export type MorningRitualProps = {
  planId: string;
  suggestions: RitualSuggestion[];
  /** Tasks already in today (anchors, shown as pre-loaded) */
  preloadedCount: number;
  onAddTask: (taskId: string) => Promise<void>;
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MorningRitual({
  suggestions,
  preloadedCount,
  onAddTask,
  onComplete,
  onSkip,
}: MorningRitualProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  function toggle(taskId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function handleDone() {
    startTransition(async () => {
      // Add all selected tasks to plan
      for (const taskId of selected) {
        await onAddTask(taskId);
      }
      await onComplete();
    });
  }

  function handleSkip() {
    startTransition(async () => {
      await onSkip();
    });
  }

  const PRIORITY_LABEL: Record<string, string> = {
    cant_miss: 'Amber', high: 'Gold', med: 'Silver', low: 'Bronze',
  };

  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 space-y-4"
      role="region"
      aria-label="Morning ritual"
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          What 1–3 things would feel like a win today?
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Takes about 10 seconds. You can skip and come back.
        </p>
      </div>

      {/* Pre-loaded anchors */}
      {preloadedCount > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
            Already on your plate
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            📌 {preloadedCount} anchor{preloadedCount > 1 ? 's' : ''} — time-bound, can&apos;t be moved
          </p>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
            Tap to add to today
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const isSelected = selected.has(s.taskId);
              const label = PRIORITY_LABEL[s.priorityLevel] ?? s.priorityLevel;
              return (
                <button
                  key={s.taskId}
                  type="button"
                  onClick={() => toggle(s.taskId)}
                  aria-pressed={isSelected}
                  className={[
                    'rounded-xl px-4 py-2 text-sm transition-all',
                    'border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
                    isSelected
                      ? 'bg-[var(--accent)] text-slate-900 border-[var(--accent)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent)]',
                  ].join(' ')}
                >
                  {s.title ?? s.rawText}
                  <span className="ml-2 text-xs opacity-60">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {suggestions.length === 0 && preloadedCount === 0 && (
        <p className="text-sm text-[var(--text-secondary)]">
          No tasks yet — capture something first, then plan your day here.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleDone}
          disabled={isPending}
          className={[
            'flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold',
            'bg-[var(--accent)] text-slate-900',
            'hover:opacity-90 active:scale-95 transition-all disabled:opacity-50',
          ].join(' ')}
        >
          {isPending ? 'Saving…' : "Let's go →"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={isPending}
          className="rounded-xl px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
