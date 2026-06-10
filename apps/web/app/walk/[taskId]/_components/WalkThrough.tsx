'use client';

/**
 * WalkThrough — full-screen single-step focus mode (M5).
 *
 * - Shows ONE step at a time; everything else is hidden.
 * - "Done. Next step." completes the step and advances to the next incomplete one.
 * - "Pause" (and ESC) return to the dashboard; position is preserved because
 *   completed steps are persisted server-side.
 * - When the last step finishes, the task auto-completes (server-side) and we
 *   show a calm completion screen.
 *
 * Rules: no red, single column, no time pressure.
 */

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@focus-forge/ui';

import { completeStepAction } from '@/server-actions/tasks/complete-step';

type Step = { id: string; text: string; status: string };

export type WalkThroughProps = {
  taskId: string;
  taskText: string;
  steps: Step[];
};

export function WalkThrough({ taskId, taskText, steps }: WalkThroughProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Locally-completed step ids (in addition to those already completed server-side)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [finished, setFinished] = useState(false);

  const isDone = useCallback(
    (s: Step) => s.status === 'completed' || doneIds.has(s.id),
    [doneIds],
  );

  // Current step = first not-yet-done step
  const current = useMemo(() => steps.find((s) => !isDone(s)) ?? null, [steps, isDone]);
  const doneCount = steps.filter(isDone).length;
  const position = Math.min(doneCount + 1, steps.length);

  // ── Pause (and ESC) ──────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') pause();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pause]);

  // ── Complete current step ────────────────────────────────────────────────────
  const handleDone = useCallback(() => {
    if (!current) return;
    const stepId = current.id;

    startTransition(async () => {
      const result = await completeStepAction(stepId, taskId);
      if (!result.ok) {
        addToast({ message: result.message ?? 'Could not complete step.', type: 'warning' });
        return;
      }

      setDoneIds((prev) => new Set(prev).add(stepId));

      for (const badge of result.newBadges) {
        addToast({ message: `Badge earned: ${badge.replace(/_/g, ' ')} 🎉`, type: 'success' });
      }

      if (result.taskCompleted) {
        setFinished(true);
        router.refresh();
      }
    });
  }, [current, taskId, router, addToast]);

  // ── Completion screen ────────────────────────────────────────────────────────
  if (finished || !current) {
    return (
      <main className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">🎉</div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">All steps done</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">{taskText}</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-[var(--accent)] text-slate-900 hover:opacity-90 active:scale-95 transition-all"
        >
          Back to today
        </button>
      </main>
    );
  }

  // ── Single-step view ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      {/* Minimal top bar: pause + quiet progress */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={pause}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ‹ Pause
        </button>
        <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
          Step {position} of {steps.length}
        </span>
      </div>

      {/* The one step */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-4">
          {taskText}
        </p>
        <p className="text-2xl font-semibold text-[var(--text-primary)] leading-snug max-w-md">
          {current.text}
        </p>
      </div>

      {/* Big advance button */}
      <div className="px-6 pb-10 pt-4">
        <button
          type="button"
          onClick={handleDone}
          disabled={isPending}
          className={[
            'w-full max-w-md mx-auto block rounded-2xl px-6 py-4 text-base font-semibold',
            'bg-[var(--accent)] text-slate-900',
            'hover:opacity-90 active:scale-[0.98] transition-all',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]',
            'disabled:opacity-50',
          ].join(' ')}
        >
          {isPending ? 'Saving…' : 'Done. Next step.'}
        </button>
      </div>
    </main>
  );
}
