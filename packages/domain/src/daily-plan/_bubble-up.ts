/**
 * _bubble-up.ts — Internal bubble-up algorithm
 * ──────────────────────────────────────────────────────────────────────────────
 * Keeps the visible 'today' set full up to visible_slots by pulling from ONE
 * ranked pool: the true backlog — every active flexible task that isn't already
 * a 'today' card.
 *
 * Ranking:
 *   1. todaySwapCount asc — tasks NOT yet pushed back today come first; a
 *      pushed-back task drops to the BOTTOM of the pool ("bottom of the queue").
 *   2. priority level (cant_miss → high → med → low) — among equally-fresh tasks.
 *   3. updatedAt asc — least-recently-touched first, for stable cycling.
 *
 * This is what stops the 2-item ping-pong: pushing a task back increments its
 * todaySwapCount (swap-counter write), so the NEXT-ranked *different* task
 * surfaces instead of the same high-priority one boomeranging straight back.
 * Once every backlog task has been pushed back the same number of times, the
 * pool simply cycles by priority then recency. Freshly captured tasks
 * (todaySwapCount = 0) always get their turn ahead of pushed-back ones.
 *
 * Anchors are excluded — they're managed by seedAnchors on their scheduled day.
 *
 * Each promoted task either UPDATES its existing 'queue' plan item (a task that
 * was swapped back) or CREATES a new one (a never-shown backlog task). Creates
 * tolerate the P2002 unique-constraint race (a concurrent bubble-up grabbing the
 * same task — e.g. a capture's router.refresh racing a 5s sync poll).
 *
 * Internal — used by complete-today-item, swap-today-item, get-or-create-today-plan.
 *
 * See 04-mysql-schema.md §4.6.2, 02-design-system.md §13.5.4
 */

import type { PrismaClient } from '@prisma/client';

export async function bubbleUp(
  db: PrismaClient,
  planId: string,
  userId: string,
  visibleSlots: number,
): Promise<void> {
  // Count only flexible 'today' items — anchors have their own strip.
  const todayCount = await db.dailyPlanItem.count({
    where: { dailyPlanId: planId, slotState: 'today', task: { priorityKind: 'flexible' } },
  });
  const needed = visibleSlots - todayCount;
  if (needed <= 0) return;

  // Plan items, so we know which candidate tasks already have a row (→ update)
  // vs none (→ create), and which tasks are current 'today' cards (→ skip).
  const planItems = await db.dailyPlanItem.findMany({
    where: { dailyPlanId: planId },
    select: { id: true, taskId: true, slotState: true },
  });
  const todayTaskIds = planItems.filter((i) => i.slotState === 'today').map((i) => i.taskId);
  const queueItemIdByTask = new Map(
    planItems.filter((i) => i.slotState === 'queue').map((i) => [i.taskId, i.id]),
  );

  // One ranked candidate pool = the backlog.
  // Pushed-back-today tasks sink to the bottom; then priority; then recency.
  const candidates = await db.task.findMany({
    where: {
      userId,
      status: 'active',
      priorityKind: 'flexible',
      ...(todayTaskIds.length > 0 ? { id: { notIn: todayTaskIds } } : {}),
    },
    select: { id: true },
    orderBy: [
      { todaySwapCount: 'asc' }, // not-yet-pushed-back first → no ping-pong
      { priorityLevel: 'asc' }, // enum order = priority order
      { updatedAt: 'asc' }, // least-recently-touched first, stable cycling
    ],
    take: needed,
  });

  let nextPos = await getNextTodayPosition(db, planId);

  for (const task of candidates) {
    const existingQueueItemId = queueItemIdByTask.get(task.id);
    try {
      if (existingQueueItemId) {
        // A swapped-back task — flip its existing queue row to 'today'.
        await db.dailyPlanItem.update({
          where: { id: existingQueueItemId },
          data: { slotState: 'today', position: nextPos++ },
        });
      } else {
        // A never-shown backlog task — add a fresh 'today' row.
        await db.dailyPlanItem.create({
          data: { dailyPlanId: planId, taskId: task.id, slotState: 'today', source: 'bubble', position: nextPos++ },
        });
      }
    } catch (e) {
      // Tolerate the unique-constraint race; a concurrent bubble-up won this task.
      if ((e as { code?: string }).code !== 'P2002') throw e;
    }
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function getNextTodayPosition(db: PrismaClient, planId: string): Promise<number> {
  const agg = await db.dailyPlanItem.aggregate({
    where: { dailyPlanId: planId, slotState: 'today' },
    _max: { position: true },
  });
  return (agg._max.position ?? -1) + 1;
}
