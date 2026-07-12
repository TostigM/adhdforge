/**
 * reset-launchpad.ts — Uncheck launchpad items when their reset is due.
 * ──────────────────────────────────────────────────────────────────────────────
 * Two triggers share this module (M9 decision — Vercel Hobby allows only a
 * DAILY cron, so minute-precise per-user resets are impossible server-side):
 *
 *   1. Lazy, on read — getLaunchpadItems() calls resetDailyItems() for the
 *      viewing user, so the list is always correct the moment it renders.
 *   2. Cron backstop — runLaunchpadResets in /api/cron/hourly calls it with no
 *      userId (all users) once a day, keeping the DB truthful for everyone.
 *
 * Both are idempotent: only items checked BEFORE the current boundary flip.
 * lastCheckedAt is preserved — it's history, and it's what makes the reset
 * idempotent (an item checked after the boundary stays checked).
 *
 * resetOnDepartureItems() is the third schedule: items that reset when a
 * Doorknob session completes ("out the door").
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { lastResetBoundary } from './reset-boundary';

export type ResetLaunchpadError = 'db_error';

export async function resetDailyItems(
  db: PrismaClient,
  opts: { userId?: string; now?: Date } = {},
): Promise<Result<{ reset: number }, ResetLaunchpadError>> {
  const boundary = lastResetBoundary(opts.now ?? new Date());
  try {
    const { count } = await db.launchpadItem.updateMany({
      where: {
        ...(opts.userId ? { userId: opts.userId } : {}),
        resetSchedule: 'daily',
        isChecked: true,
        // lastCheckedAt null shouldn't occur for a checked item, but a stray
        // row must not stay checked forever — treat it as due.
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: boundary } }],
      },
      data: { isChecked: false },
    });
    return ok({ reset: count });
  } catch (e) {
    console.error('[launchpad] daily reset failed:', e);
    return err('db_error', 'Failed to reset launchpad items.');
  }
}

/** Uncheck a user's 'on_departure' items — called when a Doorknob session completes. */
export async function resetOnDepartureItems(
  db: PrismaClient,
  userId: string,
): Promise<Result<{ reset: number }, ResetLaunchpadError>> {
  try {
    const { count } = await db.launchpadItem.updateMany({
      where: { userId, resetSchedule: 'on_departure', isChecked: true },
      data: { isChecked: false },
    });
    return ok({ reset: count });
  } catch (e) {
    console.error('[launchpad] on-departure reset failed:', e);
    return err('db_error', 'Failed to reset launchpad items.');
  }
}
