/**
 * TaskCard
 * ──────────────────────────────────────────────────────────────────────────────
 * Single-task display. Actions: "Done. Next step." / "Push to later"
 * Priority badge uses the metal-name palette:
 *   cant_miss → Amber   high → Gold   med → Silver   low → Bronze
 *
 * Soft-Track Protocol enforced in labels:
 *   • No "delete"   • No "overdue"   • No red
 *
 * @example
 *   <TaskCard
 *     task={task}
 *     onComplete={() => completeTaskAction(task.id)}
 *     onDefer={() => deferTaskAction(task.id)}
 *   />
 *
 * See 02-design-system.md §9.4
 */
'use client';

import React, { useTransition } from 'react';
import { cn } from '../lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskCardTask = {
  id: string;
  rawText: string;
  title: string | null;
  priorityKind: 'anchor' | 'flexible';
  priorityLevel: 'cant_miss' | 'high' | 'med' | 'low';
  status: 'active' | 'deferred';
  /** ISO string or null — Date objects are not serializable across the server/client boundary */
  scheduledFor: string | null;
  estimatedMinutes: number | null;
  /** ISO string or null */
  deferredUntil: string | null;
  totalSteps: number;
  doneSteps: number;
};

export interface TaskCardProps {
  task: TaskCardTask;
  onComplete: () => Promise<unknown>;
  onDefer: () => Promise<unknown>;
  className?: string;
}

// ─── Priority display maps ─────────────────────────────────────────────────────

const PRIORITY_LABEL: Record<TaskCardTask['priorityLevel'], string> = {
  cant_miss: 'Amber',
  high: 'Gold',
  med: 'Silver',
  low: 'Bronze',
};

// Tailwind classes — all whitelisted so JIT includes them
const PRIORITY_DOT: Record<TaskCardTask['priorityLevel'], string> = {
  cant_miss: 'bg-amber-400',
  high: 'bg-yellow-500',
  med: 'bg-slate-400',
  low: 'bg-amber-700',
};

const PRIORITY_TEXT: Record<TaskCardTask['priorityLevel'], string> = {
  cant_miss: 'text-amber-400',
  high: 'text-yellow-500',
  med: 'text-slate-400',
  low: 'text-amber-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDeferLabel(deferredUntil: Date | null): string {
  if (!deferredUntil) return 'Deferred';
  const now = new Date();
  const diff = deferredUntil.getTime() - now.getTime();
  if (diff < 0) return 'Deferred';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `Back in ${Math.floor(h / 24)}d`;
  if (h > 0) return `Back in ${h}h`;
  return `Back in ${m}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskCard({ task, onComplete, onDefer, className }: TaskCardProps) {
  const [completePending, startComplete] = useTransition();
  const [deferPending, startDefer] = useTransition();

  const isPending = completePending || deferPending;
  const displayText = task.title || task.rawText;
  const hasSteps = task.totalSteps > 0;
  const isDeferred = task.status === 'deferred';

  return (
    <article
      className={cn(
        'rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]',
        'px-5 py-4 transition-opacity',
        isPending && 'opacity-60 pointer-events-none',
        isDeferred && 'opacity-75',
        className,
      )}
      aria-label={`Task: ${displayText}`}
    >
      {/* Priority badge row */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn('h-2.5 w-2.5 rounded-full shrink-0', PRIORITY_DOT[task.priorityLevel])}
          aria-hidden="true"
        />
        <span className={cn('text-xs font-medium uppercase tracking-wide', PRIORITY_TEXT[task.priorityLevel])}>
          {PRIORITY_LABEL[task.priorityLevel]}
          {task.priorityKind === 'anchor' && (
            <span className="ml-1 text-[var(--text-tertiary)]">· Anchor</span>
          )}
        </span>

        {/* Scheduled time */}
        {task.scheduledFor && (
          <span className="ml-auto text-xs text-[var(--text-tertiary)] tabular-nums">
            {formatTime(new Date(task.scheduledFor))}
          </span>
        )}

        {/* Deferred indicator */}
        {isDeferred && !task.scheduledFor && (
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">
            {formatDeferLabel(task.deferredUntil ? new Date(task.deferredUntil) : null)}
          </span>
        )}
      </div>

      {/* Task title */}
      <p className="text-[var(--text-primary)] text-base leading-snug font-medium mb-3">
        {displayText}
      </p>

      {/* Step progress */}
      {hasSteps && (
        <div className="mb-3 space-y-1" role="list" aria-label="Steps">
          <div className="text-xs text-[var(--text-secondary)]">
            {task.doneSteps}/{task.totalSteps} steps
          </div>
          <div
            className="h-1 w-full rounded-full bg-[var(--border)]"
            role="progressbar"
            aria-valuenow={task.doneSteps}
            aria-valuemin={0}
            aria-valuemax={task.totalSteps}
          >
            <div
              className="h-1 rounded-full bg-[var(--success)] transition-all"
              style={{ width: `${(task.doneSteps / task.totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Time estimate */}
      {task.estimatedMinutes && !hasSteps && (
        <p className="text-xs text-[var(--text-tertiary)] mb-3">
          ~{task.estimatedMinutes} min
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => startComplete(async () => { await onComplete(); })}
          disabled={isPending}
          className={cn(
            'flex-1 min-w-0 rounded-xl px-3 py-2 text-sm font-medium',
            'bg-[var(--accent)] text-slate-900',
            'hover:opacity-90 active:scale-95 transition-all',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
            'disabled:opacity-50',
          )}
        >
          {completePending ? 'Completing…' : 'Done. Next step.'}
        </button>

        <button
          type="button"
          onClick={() => startDefer(async () => { await onDefer(); })}
          disabled={isPending}
          className={cn(
            'flex-1 min-w-0 rounded-xl px-3 py-2 text-sm font-medium',
            'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
            'hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all',
            'border border-[var(--border)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
            'disabled:opacity-50',
          )}
        >
          {deferPending ? 'Moving…' : 'Push to later'}
        </button>
      </div>
    </article>
  );
}
