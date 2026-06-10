/**
 * swap-today-item.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Sends a flexible task back to the queue, increments its swap counter,
 * runs bubble-up, and returns whether the Gentle Reframe card should show.
 *
 * Anchors cannot be swapped — they're time-true (enforced here + UI).
 *
 * See 02-design-system.md §13.5.4 (bubble-up) and §13.5.5 (gentle reframe)
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { bubbleUp } from './_bubble-up';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SwapTodayItemInput = {
  itemId: string;
  planId: string;
  userId: string;
  /**
   * User-configured gentle reframe threshold (default 4, range 3–7).
   * Loaded from user preferences by the server action.
   */
  gentleReframeThreshold?: number;
};

export type SwapTodayItemResult = {
  showReframeCard: boolean;
};

export type SwapTodayItemError =
  | 'item_not_found'
  | 'forbidden'
  | 'item_not_in_today'
  | 'cannot_swap_anchor'
  | 'db_error';

// ─── Core function ────────────────────────────────────────────────────────────

export async function swapTodayItem(
  db: PrismaClient,
  input: SwapTodayItemInput,
): Promise<Result<SwapTodayItemResult, SwapTodayItemError>> {
  const threshold = input.gentleReframeThreshold ?? 4;

  try {
    const item = await db.dailyPlanItem.findUnique({
      where: { id: input.itemId },
      include: {
        dailyPlan: { select: { id: true, userId: true, visibleSlots: true } },
        task: {
          select: {
            id: true,
            priorityKind: true,
            priorityLevel: true,
            todaySwapCount: true,
            reframeOfferedAt: true,
            reframeSnoozedUntil: true,
          },
        },
      },
    });

    if (!item) return err('item_not_found', 'This item no longer exists.');
    if (item.dailyPlan.userId !== input.userId) return err('forbidden', 'Access denied.');
    if (item.slotState !== 'today') return err('item_not_in_today', 'Item is not in the visible set.');
    if (item.task.priorityKind === 'anchor') return err('cannot_swap_anchor', 'Anchor tasks cannot be swapped.');

    // Find end-of-queue position
    const queueEnd = await db.dailyPlanItem.aggregate({
      where: { dailyPlanId: input.planId, slotState: 'queue' },
      _max: { position: true },
    });
    const endPos = (queueEnd._max.position ?? -1) + 1;

    // Move item to queue end
    await db.dailyPlanItem.update({
      where: { id: input.itemId },
      data: { slotState: 'queue', position: endPos },
    });

    // Atomically increment the task's swap counter
    const updatedTask = await db.task.update({
      where: { id: item.task.id },
      data: { todaySwapCount: { increment: 1 } },
      select: {
        todaySwapCount: true,
        reframeOfferedAt: true,
        reframeSnoozedUntil: true,
        priorityLevel: true,
      },
    });

    // Refill the freed slot
    await bubbleUp(db, input.planId, input.userId, item.dailyPlan.visibleSlots);

    // Check gentle reframe conditions
    const now = new Date();
    const showReframeCard =
      updatedTask.priorityLevel !== 'low' &&
      updatedTask.priorityLevel !== 'cant_miss' &&
      updatedTask.todaySwapCount >= threshold &&
      updatedTask.reframeOfferedAt === null &&
      (updatedTask.reframeSnoozedUntil === null || updatedTask.reframeSnoozedUntil < now);

    // Mark reframe as offered (fire-once) if we're showing it
    if (showReframeCard) {
      await db.task.update({
        where: { id: item.task.id },
        data: { reframeOfferedAt: now },
      });
    }

    return ok({ showReframeCard });
  } catch (e) {
    console.error('[swap-today-item] db error:', e);
    return err('db_error', 'Failed to swap item.');
  }
}
