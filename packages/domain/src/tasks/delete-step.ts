/**
 * delete-step.ts — Domain: remove a step from a task.
 * ──────────────────────────────────────────────────────────────────────────────
 * Ownership-checked. Remaining steps keep their existing stepOrder values —
 * gaps are harmless (orders only need to be distinct + sortable, and add-step
 * uses max+1). The Walk-Through screen sorts by stepOrder asc.
 *
 * See 06-build-roadmap.md §5.1
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type DeleteStepInput = {
  stepId: string;
  userId: string;
};

export type DeleteStepError = 'step_not_found' | 'forbidden' | 'db_error';

export async function deleteStep(
  db: PrismaClient,
  input: DeleteStepInput,
): Promise<Result<void, DeleteStepError>> {
  try {
    const step = await db.taskStep.findUnique({
      where: { id: input.stepId },
      select: { id: true, task: { select: { userId: true } } },
    });

    if (!step) return err('step_not_found', 'This step no longer exists.');
    if (step.task.userId !== input.userId) return err('forbidden', 'Access denied.');

    await db.taskStep.delete({ where: { id: input.stepId } });

    return ok(undefined);
  } catch (e) {
    console.error('[delete-step] db error:', e);
    return err('db_error', 'Failed to delete step.');
  }
}
