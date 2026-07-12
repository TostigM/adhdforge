/**
 * list-items.ts — The launchpad, correct at the moment of reading.
 * ──────────────────────────────────────────────────────────────────────────────
 * Applies the lazy daily reset for this user first (idempotent, one
 * updateMany), then returns the ordered list. See reset-launchpad.ts for the
 * reset model.
 */

import type { LaunchpadResetSchedule, PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { resetDailyItems } from './reset-launchpad';

export type LaunchpadItemView = {
  id: string;
  label: string;
  displayOrder: number;
  isChecked: boolean;
  resetSchedule: LaunchpadResetSchedule;
};

export type ListLaunchpadError = 'db_error';

export async function getLaunchpadItems(
  db: PrismaClient,
  userId: string,
  now: Date = new Date(),
): Promise<Result<LaunchpadItemView[], ListLaunchpadError>> {
  // Lazy reset — a failure here must not hide the list (the cron heals later).
  await resetDailyItems(db, { userId, now });

  try {
    const items = await db.launchpadItem.findMany({
      where: { userId },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        label: true,
        displayOrder: true,
        isChecked: true,
        resetSchedule: true,
      },
    });
    return ok(items);
  } catch (e) {
    console.error('[launchpad] list failed:', e);
    return err('db_error', 'Failed to load the launchpad.');
  }
}
