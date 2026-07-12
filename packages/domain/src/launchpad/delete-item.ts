/**
 * delete-item.ts — Remove a launchpad item.
 * Gaps in displayOrder are harmless (same stance as delete-step).
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type DeleteLaunchpadItemInput = {
  itemId: string;
  userId: string;
};

export type DeleteLaunchpadItemError = 'item_not_found' | 'forbidden' | 'db_error';

export async function deleteLaunchpadItem(
  db: PrismaClient,
  input: DeleteLaunchpadItemInput,
): Promise<Result<void, DeleteLaunchpadItemError>> {
  try {
    const item = await db.launchpadItem.findUnique({
      where: { id: input.itemId },
      select: { id: true, userId: true },
    });
    if (!item) return err('item_not_found', 'This item no longer exists.');
    if (item.userId !== input.userId) return err('forbidden', 'Access denied.');

    await db.launchpadItem.delete({ where: { id: input.itemId } });
    return ok(undefined);
  } catch (e) {
    console.error('[launchpad] delete failed:', e);
    return err('db_error', 'Failed to remove the item.');
  }
}
