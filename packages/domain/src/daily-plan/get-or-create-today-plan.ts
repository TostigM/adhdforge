/**
 * get-or-create-today-plan.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Ensures a DailyPlan row exists for the given user + date.
 * On first creation:
 *   1. Auto-inserts today's anchor tasks directly into the visible set.
 *   2. Runs bubble-up to fill remaining slots from the backlog.
 *
 * `planDate` is the plan-day LABEL: UTC midnight of the workday-timezone
 * calendar date. Callers derive it via `getPlanDate()` from `./plan-day`
 * (currently hardcoded to America/Los_Angeles; per-user timezone lands in
 * M15.3).
 *
 * See 04-mysql-schema.md §4.6.1, 02-design-system.md §13.5.3
 */

import type { DailyPlan, PrismaClient } from '@prisma/client';
import { bubbleUp } from './_bubble-up';
import { getPlanDayWindow } from './plan-day';
import { parsePreferences } from '../users/update-preferences';

// ─── Core function ────────────────────────────────────────────────────────────

export async function getOrCreateTodayPlan(
  db: PrismaClient,
  userId: string,
  planDate: Date, // plan-day label — see ./plan-day
): Promise<DailyPlan> {
  // Try to find existing plan
  const existing = await db.dailyPlan.findUnique({
    where: { userId_planDate: { userId, planDate } },
  });
  if (existing) {
    // Re-run bubble-up in case tasks were added to the backlog after the plan was
    // created (e.g. tasks captured from another device, or seeded by a script).
    // Count only flexible items — anchors live in their own strip and don't consume flex slots.
    const flexTodayCount = await db.dailyPlanItem.count({
      where: { dailyPlanId: existing.id, slotState: 'today', task: { priorityKind: 'flexible' } },
    });
    if (flexTodayCount < existing.visibleSlots) {
      await bubbleUp(db, existing.id, userId, existing.visibleSlots);
    }
    return existing;
  }

  // Read user's visibleSlots preference to apply to the new plan
  const userPrefs = await db.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  const { visibleSlots } = parsePreferences(userPrefs?.preferences);

  // Create new plan with user's preferred slot count
  const plan = await db.dailyPlan.create({
    data: { userId, planDate, visibleSlots },
  });

  // Auto-insert anchor tasks scheduled for today
  await seedAnchors(db, plan.id, userId, planDate);

  // Fill remaining visible slots from backlog
  await bubbleUp(db, plan.id, userId, plan.visibleSlots);

  return db.dailyPlan.findUniqueOrThrow({
    where: { id: plan.id },
  });
}

// ─── Helper: auto-add today's anchor tasks ────────────────────────────────────

async function seedAnchors(
  db: PrismaClient,
  planId: string,
  userId: string,
  planDate: Date,
): Promise<void> {
  // Real-instant window of this workday (midnight-to-midnight in the
  // workday timezone, NOT the UTC day of the label)
  const { dayStart, dayEnd } = getPlanDayWindow(planDate);

  const anchors = await db.task.findMany({
    where: {
      userId,
      priorityKind: 'anchor',
      status: { in: ['active', 'deferred'] },
      scheduledFor: { gte: dayStart, lt: dayEnd },
    },
    select: { id: true },
    orderBy: { scheduledFor: 'asc' },
  });

  if (anchors.length === 0) return;

  await db.dailyPlanItem.createMany({
    data: anchors.map((a, i) => ({
      dailyPlanId: planId,
      taskId: a.id,
      slotState: 'today' as const,
      source: 'anchor' as const,
      position: i,
    })),
    skipDuplicates: true,
  });
}
