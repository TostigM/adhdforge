/**
 * list-active-tasks.ts — Domain: fetch the user's active backlog
 * ──────────────────────────────────────────────────────────────────────────────
 * Returns active + deferred tasks ordered by the anchor/flexible priority model.
 * This backs the "all tasks" drawer, not the home screen Today view (M4.5).
 *
 * Ordering (per 04-mysql-schema.md §7.1):
 *   1. cant_miss first (anchor only)
 *   2. anchor tasks with scheduledFor come before flexible of same level
 *   3. Lower enum ordinal = higher visual priority
 *   4. Ties broken by createdAt DESC (newest first)
 *
 * See 04-mysql-schema.md §7.1
 */

import type { PrismaClient } from '@prisma/client';

// ─── Output shape ─────────────────────────────────────────────────────────────

export type ActiveTaskItem = {
  id: string;
  rawText: string;
  title: string | null;
  priorityKind: 'anchor' | 'flexible';
  priorityLevel: 'cant_miss' | 'high' | 'med' | 'low';
  status: 'active' | 'deferred';
  scheduledFor: Date | null;
  estimatedMinutes: number | null;
  deferredUntil: Date | null;
  deferredCount: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  totalSteps: number;
  doneSteps: number;
};

// ─── Query options ────────────────────────────────────────────────────────────

export type ListActiveTasksOptions = {
  limit?: number;
  cursor?: string; // Task ID — pagination cursor
};

const DEFAULT_LIMIT = 100;

// ─── Priority sort order map (lower = higher priority in UI) ──────────────────

const LEVEL_ORDER = {
  cant_miss: 0,
  high: 1,
  med: 2,
  low: 3,
} as const;

// ─── Core function ────────────────────────────────────────────────────────────

export async function listActiveTasks(
  db: PrismaClient,
  userId: string,
  options: ListActiveTasksOptions = {},
): Promise<ActiveTaskItem[]> {
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, 200);

  const tasks = await db.task.findMany({
    where: {
      userId,
      status: { in: ['active', 'deferred'] },
      ...(options.cursor
        ? {
            id: { lt: options.cursor }, // cursor-based pagination — cuid() is time-sortable
          }
        : {}),
    },
    select: {
      id: true,
      rawText: true,
      title: true,
      priorityKind: true,
      priorityLevel: true,
      status: true,
      scheduledFor: true,
      estimatedMinutes: true,
      deferredUntil: true,
      deferredCount: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          steps: true,
        },
      },
      steps: {
        where: { status: 'completed' },
        select: { id: true },
      },
    },
    take: limit,
  });

  // Apply the Prisma-level sort: priority level → anchor vs flexible → scheduledFor → createdAt
  const sorted = [...tasks].sort((a, b) => {
    // 1. Priority level (cant_miss → high → med → low)
    const levelDiff = LEVEL_ORDER[a.priorityLevel] - LEVEL_ORDER[b.priorityLevel];
    if (levelDiff !== 0) return levelDiff;

    // 2. Anchors before flexible (same priority level)
    const aIsAnchor = a.priorityKind === 'anchor' ? 0 : 1;
    const bIsAnchor = b.priorityKind === 'anchor' ? 0 : 1;
    if (aIsAnchor !== bIsAnchor) return aIsAnchor - bIsAnchor;

    // 3. Scheduled anchors: those with scheduledFor come first, sorted by time
    if (a.scheduledFor && b.scheduledFor) {
      return a.scheduledFor.getTime() - b.scheduledFor.getTime();
    }
    if (a.scheduledFor) return -1;
    if (b.scheduledFor) return 1;

    // 4. Tiebreak: newest first
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return sorted.map((t) => ({
    id: t.id,
    rawText: t.rawText,
    title: t.title,
    // WHERE clause guarantees only 'active' | 'deferred' — cast is safe
    priorityKind: t.priorityKind as 'anchor' | 'flexible',
    priorityLevel: t.priorityLevel as 'cant_miss' | 'high' | 'med' | 'low',
    status: t.status as 'active' | 'deferred',
    scheduledFor: t.scheduledFor,
    estimatedMinutes: t.estimatedMinutes,
    deferredUntil: t.deferredUntil,
    deferredCount: t.deferredCount,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    totalSteps: t._count.steps,
    doneSteps: t.steps.length,
  }));
}
