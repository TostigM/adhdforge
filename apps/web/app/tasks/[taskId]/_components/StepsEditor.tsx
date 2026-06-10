'use client';

/**
 * StepsEditor — manual step creation + ordering for a task (M5).
 *
 * Reordering uses accessible up/down buttons (large touch targets, keyboard-
 * and screen-reader-friendly) rather than drag-only — more inclusive for the
 * motor-variable users this product serves. Each move calls reorderStepsAction
 * with the full new order.
 *
 * Copy never promises AI generation — that's M7.
 * Soft-Track / Rule 1: no red; delete uses a muted, non-alarming treatment.
 */

import React, { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@focus-forge/ui';

import { addStepAction } from '@/server-actions/tasks/add-step';
import { reorderStepsAction } from '@/server-actions/tasks/reorder-steps';
import { deleteStepAction } from '@/server-actions/tasks/delete-step';

type Step = { id: string; text: string; status: string; stepOrder: number };

export type StepsEditorProps = {
  taskId: string;
  taskCompleted: boolean;
  initialSteps: Step[];
};

export function StepsEditor({ taskId, taskCompleted, initialSteps }: StepsEditorProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();

  const activeCount = steps.filter((s) => s.status !== 'completed').length;

  // ── Add ──────────────────────────────────────────────────────────────────────
  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = draft.trim();
      if (!text) return;

      startTransition(async () => {
        const result = await addStepAction(taskId, text);
        if (result.ok) {
          setSteps((prev) => [
            ...prev,
            { id: result.stepId, text, status: 'active', stepOrder: prev.length },
          ]);
          setDraft('');
          router.refresh();
        } else {
          addToast({ message: result.message ?? 'Could not add step.', type: 'warning' });
        }
      });
    },
    [draft, taskId, router, addToast],
  );

  // ── Reorder (move up/down) ───────────────────────────────────────────────────
  const move = useCallback(
    (index: number, dir: -1 | 1) => {
      const target = index + dir;
      if (target < 0 || target >= steps.length) return;

      const next = [...steps];
      const a = next[index];
      const b = next[target];
      if (!a || !b) return;
      next[index] = b;
      next[target] = a;
      setSteps(next); // optimistic

      startTransition(async () => {
        const result = await reorderStepsAction(taskId, next.map((s) => s.id));
        if (!result.ok) {
          setSteps(steps); // revert
          addToast({ message: result.message ?? 'Could not reorder.', type: 'warning' });
        } else {
          router.refresh();
        }
      });
    },
    [steps, taskId, router, addToast],
  );

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (stepId: string) => {
      const prev = steps;
      setSteps((s) => s.filter((x) => x.id !== stepId)); // optimistic

      startTransition(async () => {
        const result = await deleteStepAction(stepId, taskId);
        if (!result.ok) {
          setSteps(prev); // revert
          addToast({ message: result.message ?? 'Could not remove step.', type: 'warning' });
        } else {
          router.refresh();
        }
      });
    },
    [steps, taskId, router, addToast],
  );

  return (
    <section className="space-y-5" aria-label="Task steps">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
          Steps
        </h2>
        {activeCount > 0 && !taskCompleted && (
          <Link
            href={`/walk/${taskId}`}
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--accent)] text-slate-900 hover:opacity-90 active:scale-95 transition-all"
          >
            Walk me through it →
          </Link>
        )}
      </div>

      {/* Step list */}
      {steps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] px-5 py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Break this into small steps to make starting easier.
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            You can add steps yourself for now. Voice-driven step generation coming soon.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, i) => {
            const done = step.status === 'completed';
            return (
              <li
                key={step.id}
                className={[
                  'flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5',
                  done ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span className="text-xs font-semibold tabular-nums text-[var(--text-tertiary)] w-5 text-center shrink-0">
                  {done ? '✓' : i + 1}
                </span>
                <span className={`flex-1 text-sm ${done ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                  {step.text}
                </span>

                {/* Reorder + delete controls (large touch targets) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={isPending || i === 0}
                    aria-label={`Move step ${i + 1} up`}
                    className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={isPending || i === steps.length - 1}
                    aria-label={`Move step ${i + 1} down`}
                    className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(step.id)}
                    disabled={isPending}
                    aria-label={`Remove step ${i + 1}`}
                    className="h-8 w-8 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)] disabled:opacity-40 transition-colors flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Add step — manual only */}
      {!taskCompleted && (
        <form onSubmit={handleAdd} className="flex gap-2" aria-label="Add steps manually">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a step…"
            aria-label="Step text"
            disabled={isPending}
            className={[
              'flex-1 rounded-xl px-4 py-2.5 text-sm',
              'bg-[var(--bg-surface)] border border-[var(--border)]',
              'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              'transition-colors disabled:opacity-60',
            ].join(' ')}
          />
          <button
            type="submit"
            disabled={isPending || !draft.trim()}
            className={[
              'rounded-xl px-4 py-2.5 text-sm font-semibold',
              'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)]',
              'hover:bg-[var(--bg-surface)] active:scale-95 transition-all',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            Add steps manually
          </button>
        </form>
      )}

      {taskCompleted && (
        <p className="text-sm text-[var(--text-secondary)] text-center py-2">
          🎉 This task is complete.
        </p>
      )}
    </section>
  );
}
