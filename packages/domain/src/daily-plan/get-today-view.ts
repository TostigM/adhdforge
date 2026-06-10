/**
 * get-today-view.ts — Query the full Today screen state
 * ──────────────────────────────────────────────────────────────────────────────
 * Returns everything the Today page needs in a single call:
 *   - flex visible set (slotState = 'today', priorityKind = 'flexible')
 *   - scheduled anchors (all of today's anchor tasks for the compact strip)
 *   - active anchor count (anchors within the 30-min doorknob window → promote to full card)
 *   - queue count (how many flex tasks are waiting)
 *   - done count (completed today — for dopamine)
 *   - ritual state
 *   - ritual suggestions (top flexible tasks not yet in today's plan)
 *
 * Anchor tasks have their own dedicated schedule strip at the bottom of the
 * Today view and do NOT consume flex slots. When an anchor's doorknob window
 * opens (scheduledFor − 30 min), it promotes to a full card at the top of the
 * visible set, and one fewer flex card is shown — total card count stays at
 * visibleSlots.
 *
 * See 04-mysql-schema.md §7.1, 02-design-system.md §13.5.2
 */

import type { PrismaClient } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minutes before scheduledFor when an anchor promotes to a full card ("hand on the doorknob"). */
export const DOORKNOB_MINUTES = 30;

// ─── Output types ─────────────────────────────────────────────────────────────

export type TodayItem = {
  itemId: string;
  taskId: string;
  rawText: string;
  title: string | null;
  priorityKind: 'anchor' | 'flexible';
  priorityLevel: 'cant_miss' | 'high' | 'med' | 'low';
  scheduledFor: Date | null;
  estimatedMinutes: number | null;
  source: 'ritual' | 'anchor' | 'bubble' | 'manual';
  todaySwapCount: number;
  /** True when the gentle reframe card should be surfaced for this task. */
  showReframeCard: boolean;
};

/**
 * A single anchor task in today's plan.
 * Shown in the compact schedule strip; promotes to a full TodayCard when isActive.
 */
export type ScheduledAnchor = {
  itemId: string;
  taskId: string;
  rawText: string;
  title: string | null;
  priorityLevel: 'cant_miss' | 'high' | 'med' | 'low';
  scheduledFor: Date | null;
  estimatedMinutes: number | null;
  /** Item is completed. */
  isDone: boolean;
  /**
   * True when within DOORKNOB_MINUTES of scheduledFor (or scheduledFor has passed
   * and the item is not yet done). Anchor should be promoted to a full card.
   */
  isActive: boolean;
};

/**
 * A single item in the backlog queue — shown in the "All tasks" drawer.
 * Top 20 flex queue items, priority-ranked. anchors never appear here.
 */
export type QueueItem = {
  itemId: string;
  taskId: string;
  rawText: string;
  title: string | null;
  priorityLevel: 'cant_miss' | 'high' | 'med' | 'low';
  estimatedMinutes: number | null;
};

export type RitualSuggestion = {
  taskId: string;
  rawText: string;
  title: string | null;
  priorityKind: 'anchor' | 'flexible';
  priorityLevel: 'cant_miss' | 'high' | 'med' | 'low';
  scheduledFor: Date | null;
};

export type TodayViewResult = {
  planId: string;
  /**
   * Flex-only slot count (default 3).
   * Active anchors borrow from this at render time — total visible cards = visibleSlots.
   */
  visibleSlots: number;
  ritualState: 'pending' | 'completed' | 'skipped';
  /** Flexible tasks in the visible set (slotState = 'today'). */
  todayItems: TodayItem[];
  /** All anchor tasks in today's plan, ordered by scheduledFor. */
  scheduledAnchors: ScheduledAnchor[];
  /** How many anchors are currently in the doorknob window. */
  activeAnchorCount: number;
  queueCount: number;
  doneCount: number;
  /** Suggestions shown during the morning ritual. Empty when ritual is done/skipped. */
  ritualSuggestions: RitualSuggestion[];
  /**
   * Top 20 flex queue items for the "All tasks" backlog drawer.
   * Priority-ranked. Never includes anchors.
   * Use queueCount to detect overflow (queueCount > queueItems.length).
   */
  queueItems: QueueItem[];
};

// ─── Priority sort helpers ────────────────────────────────────────────────────

const LEVEL_ORDER = { cant_miss: 0, high: 1, med: 2, low: 3 } as const;

// ─── Core function ────────────────────────────────────────────────────────────

export async function getTodayView(
  db: PrismaClient,
  planId: string,
  userId: string,
  gentleReframeThreshold = 4,
): Promise<TodayViewResult> {
  const plan = await db.dailyPlan.findUniqueOrThrow({
    where: { id: planId },
  });

  const allItems = await db.dailyPlanItem.findMany({
    where: { dailyPlanId: planId },
    select: {
      id: true,
      slotState: true,
      position: true,
      source: true,
      task: {
        select: {
          id: true,
          rawText: true,
          title: true,
          priorityKind: true,
          priorityLevel: true,
          scheduledFor: true,
          estimatedMinutes: true,
          todaySwapCount: true,
          reframeOfferedAt: true,
          reframeSnoozedUntil: true,
        },
      },
    },
  });

  const now = new Date();
  const doorknobMs = DOORKNOB_MINUTES * 60 * 1000;

  // ── Split by kind ─────────────────────────────────────────────────────────
  const anchorItems = allItems.filter((i) => i.task.priorityKind === 'anchor');
  const flexItems   = allItems.filter((i) => i.task.priorityKind !== 'anchor');

  // ── Scheduled anchors (compact strip + doorknob promotion) ────────────────
  const scheduledAnchors: ScheduledAnchor[] = anchorItems
    .sort((a, b) => (a.task.scheduledFor?.getTime() ?? 0) - (b.task.scheduledFor?.getTime() ?? 0))
    .map((i) => {
      const sf = i.task.scheduledFor;
      const isDone = i.slotState === 'done';
      // Active when not done AND (scheduledFor has passed OR within doorknob window)
      const isActive = !isDone && sf !== null && now.getTime() >= sf.getTime() - doorknobMs;
      return {
        itemId: i.id,
        taskId: i.task.id,
        rawText: i.task.rawText,
        title: i.task.title,
        priorityLevel: i.task.priorityLevel as ScheduledAnchor['priorityLevel'],
        scheduledFor: sf,
        estimatedMinutes: i.task.estimatedMinutes,
        isDone,
        isActive,
      };
    });

  const activeAnchorCount = scheduledAnchors.filter((a) => a.isActive).length;

  // ── Flex visible set ('today') ────────────────────────────────────────────
  const todayRaw = flexItems.filter((i) => i.slotState === 'today');

  // Sort by priority level → position
  todayRaw.sort((a, b) => {
    const levelDiff =
      (LEVEL_ORDER[a.task.priorityLevel as keyof typeof LEVEL_ORDER] ?? 99) -
      (LEVEL_ORDER[b.task.priorityLevel as keyof typeof LEVEL_ORDER] ?? 99);
    if (levelDiff !== 0) return levelDiff;
    return a.position - b.position;
  });

  const todayItems: TodayItem[] = todayRaw.map((i) => {
    const task = i.task;
    // Gentle reframe fires once for flexible high/med when swap count >= threshold
    const showReframeCard =
      task.priorityKind === 'flexible' &&
      task.priorityLevel !== 'low' &&
      task.priorityLevel !== 'cant_miss' &&
      task.todaySwapCount >= gentleReframeThreshold &&
      task.reframeOfferedAt === null &&
      (task.reframeSnoozedUntil === null || task.reframeSnoozedUntil < now);

    return {
      itemId: i.id,
      taskId: task.id,
      rawText: task.rawText,
      title: task.title,
      priorityKind: task.priorityKind as 'anchor' | 'flexible',
      priorityLevel: task.priorityLevel as 'cant_miss' | 'high' | 'med' | 'low',
      scheduledFor: task.scheduledFor,
      estimatedMinutes: task.estimatedMinutes,
      source: i.source as TodayItem['source'],
      todaySwapCount: task.todaySwapCount,
      showReframeCard,
    };
  });

  const doneCount = allItems.filter((i) => i.slotState === 'done').length;

  // ── Queue = the true backlog ────────────────────────────────────────────────
  // Every active flexible task that ISN'T currently a visible "today" card.
  // This unifies two things that were previously invisible/inconsistent:
  //   • tasks swapped back to the queue, and
  //   • freshly captured/voice-dumped tasks that didn't fit (slots full).
  // Without this, a capture made while all slots are full would silently vanish.
  // Anchors are excluded (they live in their own schedule strip).
  const todaySlotTaskIds = flexItems
    .filter((i) => i.slotState === 'today')
    .map((i) => i.task.id);

  const backlogWhere = {
    userId,
    status: 'active' as const,
    priorityKind: 'flexible' as const,
    ...(todaySlotTaskIds.length > 0 ? { id: { notIn: todaySlotTaskIds } } : {}),
  };

  const queueCount = await db.task.count({ where: backlogWhere });

  const backlogTasks = await db.task.findMany({
    where: backlogWhere,
    select: { id: true, rawText: true, title: true, priorityLevel: true, estimatedMinutes: true },
    // Same ranking bubble-up uses, so the drawer order = the order things surface:
    // pushed-back-today tasks sink to the bottom, then priority, then recency.
    orderBy: [{ todaySwapCount: 'asc' }, { priorityLevel: 'asc' }, { updatedAt: 'asc' }],
    take: 20,
  });

  const queueItems: QueueItem[] = backlogTasks.map((t) => ({
    itemId: t.id, // no plan item — use the task id as a stable key
    taskId: t.id,
    rawText: t.rawText,
    title: t.title,
    priorityLevel: t.priorityLevel as QueueItem['priorityLevel'],
    estimatedMinutes: t.estimatedMinutes,
  }));

  // ── Ritual suggestions ────────────────────────────────────────────────────
  // Only shown when ritual is still pending
  let ritualSuggestions: RitualSuggestion[] = [];

  if (plan.ritualState === 'pending') {
    const inPlanTaskIds = new Set(allItems.map((i) => i.task.id));

    const suggestions = await db.task.findMany({
      where: {
        userId,
        status: { in: ['active', 'deferred'] },
        id: { notIn: [...inPlanTaskIds] },
        // Suggestions are flexible high/med (not anchors — those are auto-added)
        priorityKind: 'flexible',
        priorityLevel: { in: ['high', 'med'] },
      },
      select: {
        id: true,
        rawText: true,
        title: true,
        priorityKind: true,
        priorityLevel: true,
        scheduledFor: true,
      },
      orderBy: [{ priorityLevel: 'asc' }, { createdAt: 'desc' }],
      take: 10,
    });

    ritualSuggestions = suggestions.map((t) => ({
      taskId: t.id,
      rawText: t.rawText,
      title: t.title,
      priorityKind: t.priorityKind as 'anchor' | 'flexible',
      priorityLevel: t.priorityLevel as 'cant_miss' | 'high' | 'med' | 'low',
      scheduledFor: t.scheduledFor,
    }));
  }

  return {
    planId: plan.id,
    visibleSlots: plan.visibleSlots,
    ritualState: plan.ritualState as 'pending' | 'completed' | 'skipped',
    todayItems,
    scheduledAnchors,
    activeAnchorCount,
    queueCount,
    doneCount,
    ritualSuggestions,
    queueItems,
  };
}
