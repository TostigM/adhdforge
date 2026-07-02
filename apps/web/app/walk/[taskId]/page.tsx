/**
 * Walk-Through — full-screen, single-step focus mode (M5).
 * ──────────────────────────────────────────────────────────────────────────────
 * Shows ONE step at a time, hides all other UI. Resumes at the first incomplete
 * step (position is preserved because completed steps are persisted). When the
 * last step is done, the task auto-completes.
 *
 * Rules 1 & 6: no red, single column. No time pressure.
 *
 * See 06-build-roadmap.md §5.2
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';

import { db } from '@focus-forge/database/client';
import { requirePageUser } from '@/lib/require-user';
import { WalkThrough } from './_components/WalkThrough';

export default async function WalkPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  const { userId } = await requirePageUser(`/walk/${taskId}`);

  const task = await db.task.findFirst({
    where: { id: taskId, userId },
    select: {
      id: true,
      rawText: true,
      title: true,
      status: true,
      steps: {
        orderBy: { stepOrder: 'asc' },
        select: { id: true, text: true, status: true },
      },
    },
  });

  // Missing task → back to dashboard. No steps → send to the editor to add some.
  if (!task) redirect('/dashboard');
  if (task.steps.length === 0) redirect(`/tasks/${taskId}`);

  const displayText = task.title ?? task.rawText;
  const allDone = task.status === 'completed' || task.steps.every((s) => s.status === 'completed');

  // Already finished — calm completion screen, no walk needed.
  if (allDone) {
    return (
      <main className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">🎉</div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] mb-2">All steps done</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">{displayText}</p>
        <Link
          href="/dashboard"
          className="rounded-xl px-5 py-2.5 text-sm font-semibold bg-[var(--accent)] text-slate-900 hover:opacity-90 transition-all"
        >
          Back to today
        </Link>
      </main>
    );
  }

  return (
    <WalkThrough
      taskId={task.id}
      taskText={displayText}
      steps={task.steps}
    />
  );
}
