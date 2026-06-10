/**
 * reframe-today-item.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles the two immediately-actionable Gentle Reframe choices:
 *
 *   snooze — sets reframeSnoozedUntil = now + 24 h so the card won't reappear
 *             until tomorrow. The task stays in today's plan at current priority.
 *
 *   lower  — sets priorityLevel = 'low' (Bronze). Task stays in the plan;
 *             the priority dot and label update on next refresh.
 *
 * The other two choices ('break' and 'anchor') require M5+ UI (task steps and
 * scheduling) and are handled as forward-pointing toasts in the client — they
 * don't call this function.
 *
 * See 02-design-system.md §13.5.5 (Gentle Reframe)
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReframeAction = 'snooze' | 'lower';

export type ReframeTodayItemInput = {
  taskId: string;
  userId: string;
  action: ReframeAction;
};

export type ReframeTodayItemError = 'task_not_found' | 'forbidden' | 'db_error';

/** How long a snooze lasts. 24 hours in milliseconds. */
export const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;

// ─── Core function ────────────────────────────────────────────────────────────

export async function reframeTodayItem(
  db: PrismaClient,
  input: ReframeTodayItemInput,
): Promise<Result<void, ReframeTodayItemError>> {
  try {
    const task = await db.task.findUnique({
      where: { id: input.taskId },
      select: { id: true, userId: true },
    });

    if (!task) return err('task_not_found', 'This task no longer exists.');
    if (task.userId !== input.userId) return err('forbidden', 'Access denied.');

    const now = new Date();

    if (input.action === 'snooze') {
      await db.task.update({
        where: { id: input.taskId },
        data: { reframeSnoozedUntil: new Date(now.getTime() + SNOOZE_DURATION_MS) },
      });
    } else {
      // lower
      await db.task.update({
        where: { id: input.taskId },
        data: { priorityLevel: 'low' },
      });
    }

    return ok(undefined);
  } catch (e) {
    console.error('[reframe-today-item] db error:', e);
    return err('db_error', 'Failed to update task.');
  }
}
