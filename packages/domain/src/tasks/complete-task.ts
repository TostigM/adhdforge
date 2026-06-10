/**
 * complete-task.ts — Domain: mark a task complete
 * ──────────────────────────────────────────────────────────────────────────────
 * Soft-Track Protocol: status moves to 'completed'. Never 'failed'.
 * Completes the task → logs event → badge engine fires.
 * See 04-mysql-schema.md §4.5
 */

import type { PrismaClient, Task } from '@prisma/client';

import { checkAndAward } from '../badges/check-and-award';
import { err, ok, type Result } from '../result';

// ─── Input / Output ───────────────────────────────────────────────────────────

export type CompleteTaskInput = {
  taskId: string;
  userId: string; // Ownership check performed here
};

export type CompleteTaskError =
  | 'task_not_found'
  | 'task_already_completed'
  | 'forbidden'
  | 'db_error';

export type CompleteTaskResult = Result<Task, CompleteTaskError>;

// ─── Core function ────────────────────────────────────────────────────────────

export async function completeTask(
  db: PrismaClient,
  input: CompleteTaskInput,
): Promise<CompleteTaskResult> {
  try {
    const existing = await db.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, userId: true, status: true },
    });

    if (!existing) return err('task_not_found', 'Task not found.');
    if (existing.userId !== input.userId) return err('forbidden', 'Access denied.');
    if (existing.status === 'completed') return err('task_already_completed', 'Already complete.');

    const task = await db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: input.taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      await tx.event.create({
        data: {
          userId: input.userId,
          eventType: 'task.completed',
          payload: { taskId: input.taskId },
        },
      });

      return updated;
    });

    // Badge check — non-fatal
    await checkAndAward(db, input.userId, 'task.completed').catch((e) => {
      console.error('[badge] check-and-award failed after task.completed:', e);
    });

    return ok(task);
  } catch (e) {
    console.error('[complete-task] db error:', e);
    return err('db_error', 'Failed to complete task. Please try again.');
  }
}
