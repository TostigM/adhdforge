/**
 * list-steps.ts — Domain: read a task's steps in display order.
 * ──────────────────────────────────────────────────────────────────────────────
 * Ownership-checked. Used by the step editor and the Walk-Through screen.
 *
 * See 06-build-roadmap.md §5.1, §5.2
 */

import type { PrismaClient, TaskStep } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type ListStepsInput = {
  taskId: string;
  userId: string;
};

export type ListStepsError = 'task_not_found' | 'forbidden' | 'db_error';

export async function listSteps(
  db: PrismaClient,
  input: ListStepsInput,
): Promise<Result<TaskStep[], ListStepsError>> {
  try {
    const task = await db.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, userId: true },
    });

    if (!task) return err('task_not_found', 'Task not found.');
    if (task.userId !== input.userId) return err('forbidden', 'Access denied.');

    const steps = await db.taskStep.findMany({
      where: { taskId: input.taskId },
      orderBy: { stepOrder: 'asc' },
    });

    return ok(steps);
  } catch (e) {
    console.error('[list-steps] db error:', e);
    return err('db_error', 'Failed to load steps.');
  }
}
