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

    // Plan item + task + event commit atomically — a mid-sequence failure on a
    // slow connection must not leave a done card pointing at an active task.
    const taskWasCompleted = item.task.status !== 'completed';
    await db.$transaction(async (tx) => {
      await tx.dailyPlanItem.update({
        where: { id: input.itemId },
        data: { slotState: 'done', completedAt: new Date() },
      });

      if (taskWasCompleted) {
        await tx.task.update({
          where: { id: item.task.id },
          data: { status: 'completed', completedAt: new Date() },
        });

        // Append-only event log — badge engine reads from this
        await tx.event.create({
          data: {
            userId: input.userId,
            eventType: 'task.completed',
            payload: { taskId: item.task.id },
          },
        });
      }
    });

    // Check badges (after the transaction — non-fatal if it fails)
    if (taskWasCompleted) {
      try {
        const { checkAndAward } = await import('../badges/check-and-award');
        await checkAndAward(db, input.userId, 'task.completed');
      } catch (e) {
        console.error('[badge] check-and-award failed after task.completed:', e);
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
