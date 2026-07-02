/**
 * Task detail / steps editor — M5 "Walk Me Through It"
 * ──────────────────────────────────────────────────────────────────────────────
 * Lets the user break a task into ordered steps (manually — AI generation is M7),
 * reorder/delete them, and launch the full-screen Walk-Through.
 *
 * See 06-build-roadmap.md §5.1
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';

import { db } from '@focus-forge/database/client';
import { requirePageUser } from '@/lib/require-user';
import { StepsEditor } from './_components/StepsEditor';

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  const { userId } = await requirePageUser(`/tasks/${taskId}`);

  const task = await db.task.findFirst({
    where: { id: taskId, userId },
    select: {
      id: true,
      rawText: true,
      title: true,
      status: true,
      steps: {
        orderBy: { stepOrder: 'asc' },
        select: { id: true, text: true, status: true, stepOrder: true },
      },
    },
  });

  if (!task) notFound();

  const displayText = task.title ?? task.rawText;

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <nav
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
        aria-label="Task navigation"
      >
        <Link
          href="/dashboard"
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Back to today
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-1">
            Task
          </p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-snug">
            {displayText}
          </h1>
        </header>

        <StepsEditor
          taskId={task.id}
          taskCompleted={task.status === 'completed'}
          initialSteps={task.steps}
        />
      </div>
    </div>
  );
}
