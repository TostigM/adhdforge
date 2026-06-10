/**
 * complete-step.ts — Domain: mark a task step complete.
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks the step done, logs a `task_step.completed` event (drives the
 * `first_step` badge), and — when every step on the task is now complete —
 * auto-completes the parent task (logging `task.completed` for that badge).
 *
 * Idempotent: completing an already-complete step is a no-op (no duplicate
 * events, no double badge counting).
 *
 * Soft-Track Protocol: steps/ tasks never enter a "failed" state.
 *
 * See 06-build-roadmap.md §5.2, §5.3
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { checkAndAward } from '../badges/check-and-award';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompleteStepInput = {
  stepId: string;
  userId: string;
};

export type CompleteStepResult = {
  /** True when this completion finished the last step and auto-completed the task. */
  taskCompleted: boolean;
  /** Badge keys newly awarded by this action (step and/or task badges). */
  newBadges: string[];
};

export type CompleteStepError = 'step_not_found' | 'forbidden' | 'db_error';

// ─── Core function ────────────────────────────────────────────────────────────

export async function completeStep(
  db: PrismaClient,
  input: CompleteStepInput,
): Promise<Result<CompleteStepResult, CompleteStepError>> {
  try {
    const step = await db.taskStep.findUnique({
      where: { id: input.stepId },
      select: {
        id: true,
        status: true,
        taskId: true,
        task: { select: { id: true, userId: true, status: true } },
      },
    });

    if (!step) return err('step_not_found', 'This step no longer exists.');
    if (step.task.userId !== input.userId) return err('forbidden', 'Access denied.');

    // Idempotent — already complete, nothing to do.
    if (step.status === 'completed') {
      return ok({ taskCompleted: step.task.status === 'completed', newBadges: [] });
    }

    const newBadges: string[] = [];

    // Mark the step complete
    await db.taskStep.update({
      where: { id: input.stepId },
      data: { status: 'completed', completedAt: new Date() },
    });

    // Log the step-completed event (drives first_step badge)
    await db.event.create({
      data: {
        userId: input.userId,
        eventType: 'task_step.completed',
        payload: { taskId: step.taskId, stepId: step.id },
      },
    });

    try {
      newBadges.push(...(await checkAndAward(db, input.userId, 'task_step.completed')));
    } catch {
      // Badge engine failure is non-fatal
    }

    // Auto-complete the task if every step is now done (and it isn't already complete)
    let taskCompleted = step.task.status === 'completed';
    if (!taskCompleted) {
      const remaining = await db.taskStep.count({
        where: { taskId: step.taskId, status: { not: 'completed' } },
      });

      if (remaining === 0) {
        await db.task.update({
          where: { id: step.taskId },
          data: { status: 'completed', completedAt: new Date() },
        });

        await db.event.create({
          data: {
            userId: input.userId,
            eventType: 'task.completed',
            payload: { taskId: step.taskId, via: 'walk_through' },
          },
        });

        try {
          newBadges.push(...(await checkAndAward(db, input.userId, 'task.completed')));
        } catch {
          // non-fatal
        }

        taskCompleted = true;
      }
    }

    return ok({ taskCompleted, newBadges });
  } catch (e) {
    console.error('[complete-step] db error:', e);
    return err('db_error', 'Failed to complete step.');
  }
}
