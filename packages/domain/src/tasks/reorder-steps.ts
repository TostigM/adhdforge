/**
 * reorder-steps.ts — Domain: reorder a task's steps.
 * ──────────────────────────────────────────────────────────────────────────────
 * Accepts the full ordered list of step ids and rewrites each step's stepOrder
 * to its index in that list.
 *
 * The `(taskId, stepOrder)` unique constraint means we can't just assign final
 * orders directly (a transient collision would throw). We do a two-phase update
 * inside a transaction: first bump every step into a temporary high range, then
 * write the final 0..n-1 orders.
 *
 * See 06-build-roadmap.md §5.1
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReorderStepsInput = {
  taskId: string;
  userId: string;
  /** Every step id of the task, in the new display order. */
  orderedStepIds: string[];
};

export type ReorderStepsError =
  | 'task_not_found'
  | 'forbidden'
  | 'step_set_mismatch'
  | 'db_error';

/** Temp offset that can't collide with final 0..n-1 orders (UnsignedSmallInt max 65535). */
const TEMP_OFFSET = 10_000;

// ─── Core function ────────────────────────────────────────────────────────────

export async function reorderSteps(
  db: PrismaClient,
  input: ReorderStepsInput,
): Promise<Result<void, ReorderStepsError>> {
  try {
    const task = await db.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, userId: true },
    });

    if (!task) return err('task_not_found', 'Task not found.');
    if (task.userId !== input.userId) return err('forbidden', 'Access denied.');

    const steps = await db.taskStep.findMany({
      where: { taskId: input.taskId },
      select: { id: true },
    });

    // The provided list must be exactly the task's steps — no missing/extra/foreign ids.
    const actual = new Set(steps.map((s) => s.id));
    const provided = new Set(input.orderedStepIds);
    const sameSize = actual.size === provided.size && actual.size === input.orderedStepIds.length;
    const sameMembers = [...provided].every((id) => actual.has(id));
    if (!sameSize || !sameMembers) {
      return err('step_set_mismatch', 'The step list must contain exactly this task\'s steps.');
    }

    await db.$transaction(async (tx) => {
      // Phase 1: park every step in a non-colliding temp range.
      for (let i = 0; i < input.orderedStepIds.length; i++) {
        await tx.taskStep.update({
          where: { id: input.orderedStepIds[i] },
          data: { stepOrder: TEMP_OFFSET + i },
        });
      }
      // Phase 2: write final 0..n-1 orders.
      for (let i = 0; i < input.orderedStepIds.length; i++) {
        await tx.taskStep.update({
          where: { id: input.orderedStepIds[i] },
          data: { stepOrder: i },
        });
      }
    });

    return ok(undefined);
  } catch (e) {
    console.error('[reorder-steps] db error:', e);
    return err('db_error', 'Failed to reorder steps.');
  }
}
