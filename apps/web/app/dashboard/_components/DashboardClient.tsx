'use client';

/**
 * DashboardClient — interactive task capture + list
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles optimistic UI for create/complete/defer.
 * Polls via useSyncStream and refreshes on cross-device events.
 */

import { EmptyState, TaskCard, useToast } from '@focus-forge/ui';
import type { TaskCardTask } from '@focus-forge/ui';
import { useRouter } from 'next/navigation';
import React, { useCallback, useRef, useState, useTransition } from 'react';

import { completeTaskAction } from '@/server-actions/tasks/complete-task';
import { createTaskAction } from '@/server-actions/tasks/create-task';
import { deferTaskAction } from '@/server-actions/tasks/defer-task';
import { useSyncStream } from '@/lib/sync/use-sync-stream';

// ─── Props ────────────────────────────────────────────────────────────────────

export type DashboardClientProps = {
  initialTasks: TaskCardTask[];
  displayName: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardClient({ initialTasks, displayName }: DashboardClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [inputValue, setInputValue] = useState('');
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cross-device sync: refresh when new events arrive from other devices
  useSyncStream({
    onEvents: useCallback(() => {
      router.refresh();
    }, [router]),
  });

  // ── Capture ──────────────────────────────────────────────────────────────

  const handleCapture = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text) return;

      setCaptureError(null);

      startTransition(async () => {
        const result = await createTaskAction({ rawText: text });

        if (result.ok) {
          setInputValue('');
          router.refresh(); // Re-fetch tasks list from server
          inputRef.current?.focus();
        } else {
          setCaptureError(result.message ?? 'Could not save task. Please try again.');
        }
      });
    },
    [inputValue, router],
  );

  // ── Complete ─────────────────────────────────────────────────────────────

  const handleComplete = useCallback(
    async (taskId: string) => {
      const result = await completeTaskAction(taskId);
      if (result.ok) {
        router.refresh();
        addToast({ message: 'Done. Onto the next one.', type: 'success' });
      } else {
        addToast({ message: result.message ?? 'Could not complete task.', type: 'warning' });
      }
    },
    [router, addToast],
  );

  // ── Defer ────────────────────────────────────────────────────────────────

  const handleDefer = useCallback(
    async (taskId: string) => {
      const result = await deferTaskAction(taskId);
      if (result.ok) {
        router.refresh();
        addToast({ message: "Moved it out of the way. You're good.", type: 'info' });
      } else {
        addToast({ message: result.message ?? 'Could not defer task.', type: 'warning' });
      }
    },
    [router, addToast],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Hey, {displayName}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            What&apos;s on your mind?
          </p>
        </div>
      </div>

      {/* Capture form */}
      <form
        onSubmit={handleCapture}
        className="flex gap-2"
        aria-label="Capture a task"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Capture a thought…"
          disabled={isPending}
          autoFocus
          aria-label="Task text"
          className={[
            'flex-1 rounded-xl px-4 py-3 text-base',
            'bg-[var(--bg-surface)] border border-[var(--border)]',
            'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            'transition-colors disabled:opacity-60',
          ].join(' ')}
        />
        <button
          type="submit"
          disabled={isPending || !inputValue.trim()}
          className={[
            'rounded-xl px-5 py-3 text-sm font-semibold',
            'bg-[var(--accent)] text-slate-900',
            'hover:opacity-90 active:scale-95 transition-all',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {isPending ? '…' : 'Add'}
        </button>
      </form>

      {captureError && (
        <p role="alert" className="text-sm text-[var(--soft-error)] -mt-4">
          {captureError}
        </p>
      )}

      {/* Task list */}
      {initialTasks.length === 0 ? (
        <EmptyState
          icon="✨"
          message="Nothing on your plate right now. That's allowed."
          description="Capture a thought above whenever you're ready."
        />
      ) : (
        <section aria-label="Your tasks">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
            Tasks · {initialTasks.length}
          </h2>
          <ul className="space-y-3">
            {initialTasks.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  onComplete={() => handleComplete(task.id)}
                  onDefer={() => handleDefer(task.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
