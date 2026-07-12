/**
 * check-item.ts — Check or uncheck a launchpad item.
 * ──────────────────────────────────────────────────────────────────────────────
 * Checking stamps lastCheckedAt (this is what the daily reset compares against
 * the 04:00 boundary). Unchecking leaves the stamp — it's history, and an
 * unchecked item is already in its post-reset state.
 * Logs `launchpad_item.checked` on check (noun.verb convention).
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type CheckLaunchpadItemInput = {
  itemId: string;
  userId: string;
  checked: boolean;
};

export type CheckLaunchpadItemError = 'item_not_found' | 'forbidden' | 'db_error';

export async function checkLaunchpadItem(
  db: PrismaClient,
  input: CheckLaunchpadItemInput,
): Promise<Result<void, CheckLaunchpadItemError>> {
  try {
    const item = await db.launchpadItem.findUnique({
      where: { id: input.itemId },
      select: { id: true, userId: true },
    });
    if (!item) return err('item_not_found', 'This item no longer exists.');
    if (item.userId !== input.userId) return err('forbidden', 'Access denied.');

    if (input.checked) {
      await db.$transaction([
        db.launchpadItem.update({
          where: { id: input.itemId },
          data: { isChecked: true, lastCheckedAt: new Date() },
        }),
        db.event.create({
          data: {
            userId: input.userId,
            eventType: 'launchpad_item.checked',
            payload: { itemId: input.itemId },
          },
        }),
      ]);
    } else {
      await db.launchpadItem.update({
        where: { id: input.itemId },
        data: { isChecked: false },
      });
    }

    return ok(undefined);
  } catch (e) {
    console.error('[launchpad] check failed:', e);
    return err('db_error', 'Failed to update the item.');
  }
}
