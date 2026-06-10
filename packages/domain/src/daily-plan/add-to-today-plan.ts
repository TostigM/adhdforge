/**
 * add-to-today-plan.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Adds a task to today's plan during the morning ritual or manually.
 * The task is added to the 'today' state if visible slots remain,
 * otherwise to the 'queue'.
 *
 * See 02-design-system.md §13.5.3 (morning ritual)
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddToTodayPlanInput = {
  planId: string;
  taskId: string;
  userId: string;
  source: 'ritual' | 'manual';
};

export type AddToTodayPlanError =
  | 'plan_not_found'
  | 'task_not_found'
  | 'forbidden'
  | 'already_in_plan'
  | 'db_error';

// ─── Core function ────────────────────────────────────────────────────────────

export async function addToTodayPlan(
  db: PrismaClient,
  input: AddToTodayPlanInput,
): Promise<Result<{ itemId: string; slotState: 'today' | 'queue' }, AddToTodayPlanError>> {
  try {
    const [plan, task] = await Promise.all([
      db.dailyPlan.findUnique({
        where: { id: input.planId },
        select: { id: true, userId: true, visibleSlots: true },
      }),
      db.task.findUnique({
        where: { id: input.taskId },
        select: { id: true, userId: true },
      }),
    ]);

    if (!plan) return err('plan_not_found', 'Daily plan not found.');
    if (!task) return err('task_not_found', 'Task not found.');
    if (plan.userId !== input.userId || task.userId !== input.userId) {
      return err('forbidden', 'Access denied.');
    }

    // Check not already in plan
    const existing = await db.dailyPlanItem.findUnique({
      where: { dailyPlanId_taskId: { dailyPlanId: input.planId, taskId: input.taskId } },
    });
    if (existing) return err('already_in_plan', 'Task is already in today\'s plan.');

    // Count current 'today' items to decide slot vs queue
    const todayCount = await db.dailyPlanItem.count({
      where: { dailyPlanId: input.planId, slotState: 'today' },
    });

    const slotState: 'today' | 'queue' = todayCount < plan.visibleSlots ? 'today' : 'queue';

    // Get next position within the target state
    const agg = await db.dailyPlanItem.aggregate({
      where: { dailyPlanId: input.planId, slotState },
      _max: { position: true },
    });
    const position = (agg._max.position ?? -1) + 1;

    const item = await db.dailyPlanItem.create({
      data: {
        dailyPlanId: input.planId,
        taskId: input.taskId,
        slotState,
        source: input.source,
        position,
      },
    });

    return ok({ itemId: item.id, slotState });
  } catch (e) {
    console.error('[add-to-today-plan] db error:', e);
    return err('db_error', 'Failed to add task to plan.');
  }
}
