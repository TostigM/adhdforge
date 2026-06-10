/**
 * complete-today-item.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks a DailyPlanItem as done, completes the underlying Task,
 * logs the event, checks badges, and runs bubble-up to refill the freed slot.
 *
 * See 02-design-system.md §13.5.4, 04-mysql-schema.md §4.6.2
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { bubbleUp } from './_bubble-up';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompleteTodayItemInput = {
  itemId: string;
  planId: string;
  userId: string;
};

export type CompleteTodayItemError =
  | 'item_not_found'
  | 'forbidden'
  | 'item_not_in_today'
  | 'db_error';

// ─── Core function ────────────────────────────────────────────────────────────

export async function completeTodayItem(
  db: PrismaClient,
  input: CompleteTodayItemInput,
): Promise<Result<void, CompleteTodayItemError>> {
  try {
    const item = await db.dailyPlanItem.findUnique({
      where: { id: input.itemId },
      include: {
        dailyPlan: { select: { id: true, userId: true, visibleSlots: true } },
        task: { select: { id: true, status: true } },
      },
    });

    if (!item) return err('item_not_found', 'This item no longer exists.');
    if (item.dailyPlan.userId !== input.userId) return err('forbidden', 'Access denied.');
    if (item.slotState !== 'today') return err('item_not_in_today', 'Item is not in the visible set.');

    // Mark plan item as done
    await db.dailyPlanItem.update({
      where: { id: input.itemId },
      data: { slotState: 'done', completedAt: new Date() },
    });

    // Complete the underlying task (if not already completed)
    if (item.task.status !== 'completed') {
      await db.task.update({
        where: { id: item.task.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      // Log event for badge engine
      await db.event.create({
        data: {
          userId: input.userId,
          eventType: 'task.completed',
          payload: { taskId: item.task.id },
        },
      });

      // Check badges (non-fatal)
      try {
        const { checkAndAward } = await import('../badges/check-and-award');
        await checkAndAward(db, input.userId, 'task.completed');
      } catch {
        // Badge engine failure is non-fatal
      }
    }

    // Refill the freed slot
    await bubbleUp(db, input.planId, input.userId, item.dailyPlan.visibleSlots);

    return ok(undefined);
  } catch (e) {
    console.error('[complete-today-item] db error:', e);
    return err('db_error', 'Failed to complete item.');
  }
}
