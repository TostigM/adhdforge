/**
 * add-step.ts — Domain: append a manual step to a task.
 * ──────────────────────────────────────────────────────────────────────────────
 * M5 "Walk Me Through It" ships with MANUAL step creation. AI-generated steps
 * arrive in M7 — nothing here promises AI.
 *
 * New steps go to the end (stepOrder = current max + 1), status 'active'.
 *
 * See 04-mysql-schema.md §4.6, 06-build-roadmap.md §5.1
 */

import type { PrismaClient, TaskStep } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddStepInput = {
  taskId: string;
  userId: string;
  text: string;
};

export type AddStepError =
  | 'task_not_found'
  | 'forbidden'
  | 'text_empty'
  | 'text_too_long'
  | 'db_error';

const MAX_STEP_TEXT = 2_000;

// ─── Core function ────────────────────────────────────────────────────────────

export async function addStep(
  db: PrismaClient,
  input: AddStepInput,
): Promise<Result<TaskStep, AddStepError>> {
  const text = input.text.trim();
  if (!text) return err('text_empty', 'Step text cannot be empty.');
  if (text.length > MAX_STEP_TEXT) {
    return err('text_too_long', `Step text must be under ${MAX_STEP_TEXT} characters.`);
  }

  try {
    const task = await db.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, userId: true },
    });

    if (!task) return err('task_not_found', 'Task not found.');
    if (task.userId !== input.userId) return err('forbidden', 'Access denied.');

    // Next stepOrder = max + 1 (0 when the task has no steps yet)
    const agg = await db.taskStep.aggregate({
      where: { taskId: input.taskId },
      _max: { stepOrder: true },
    });
    const stepOrder = (agg._max.stepOrder ?? -1) + 1;

    const step = await db.taskStep.create({
      data: {
        taskId: input.taskId,
        text,
        stepOrder,
        status: 'active',
      },
    });

    return ok(step);
  } catch (e) {
    console.error('[add-step] db error:', e);
    return err('db_error', 'Failed to add step.');
  }
}
