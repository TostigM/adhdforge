/**
 * defer-task.ts — Domain: defer a task
 * ──────────────────────────────────────────────────────────────────────────────
 * Sets status to 'deferred', increments deferred_count silently.
 * The count is a private metric — never shown to the user. It exists for
 * the Gentle-Reframe system (M4.5+) to offer help when needed.
 *
 * Soft-Track Protocol: no shame language, no visible penalty.
 * See 04-mysql-schema.md §4.5, §4.6.2
 */

import type { PrismaClient, Task } from '@prisma/client';

import { err, ok, type Result } from '../result';

// ─── Input / Output ───────────────────────────────────────────────────────────

export type DeferTaskInput = {
  taskId: string;
  userId: string; // Ownership check performed here
  deferUntil?: Date; // Optional — if omitted, task floats back when user opens app
};

export type DeferTaskError =
  | 'task_not_found'
  | 'task_already_completed'
  | 'forbidden'
  | 'db_error';

export type DeferTaskResult = Result<Task, DeferTaskError>;

// ─── Core function ────────────────────────────────────────────────────────────

export async function deferTask(
  db: PrismaClient,
  input: DeferTaskInput,
): Promise<DeferTaskResult> {
  try {
    const existing = await db.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, userId: true, status: true, deferredCount: true },
    });

    if (!existing) return err('task_not_found', 'Task not found.');
    if (existing.userId !== input.userId) return err('forbidden', 'Access denied.');
    if (existing.status === 'completed')
      return err('task_already_completed', 'Completed tasks cannot be deferred.');

    const task = await db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: input.taskId },
        data: {
          status: 'deferred',
          deferredCount: { increment: 1 },
          deferredUntil: input.deferUntil ?? null,
        },
      });

      await tx.event.create({
        data: {
          userId: input.userId,
          eventType: 'task.deferred',
          payload: {
            taskId: input.taskId,
            deferredUntil: input.deferUntil ?? null,
            deferredCount: updated.deferredCount,
          },
        },
      });

      return updated;
    });

    return ok(task);
  } catch (e) {
    console.error('[defer-task] db error:', e);
    return err('db_error', 'Failed to defer task. Please try again.');
  }
}
