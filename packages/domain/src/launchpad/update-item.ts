/**
 * update-item.ts — Rename an item or change its reset schedule.
 */

import type { LaunchpadResetSchedule, PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { MAX_LABEL_LENGTH } from './add-item';

export type UpdateLaunchpadItemInput = {
  itemId: string;
  userId: string;
  label?: string;
  resetSchedule?: LaunchpadResetSchedule;
};

export type UpdateLaunchpadItemError =
  | 'item_not_found'
  | 'forbidden'
  | 'label_empty'
  | 'label_too_long'
  | 'db_error';

export async function updateLaunchpadItem(
  db: PrismaClient,
  input: UpdateLaunchpadItemInput,
): Promise<Result<void, UpdateLaunchpadItemError>> {
  const label = input.label?.trim();
  if (label !== undefined) {
    if (!label) return err('label_empty', 'Give the item a name — even just "Keys".');
    if (label.length > MAX_LABEL_LENGTH)
      return err('label_too_long', `Item names must be under ${MAX_LABEL_LENGTH} characters.`);
  }

  try {
    const item = await db.launchpadItem.findUnique({
      where: { id: input.itemId },
      select: { id: true, userId: true },
    });
    if (!item) return err('item_not_found', 'This item no longer exists.');
    if (item.userId !== input.userId) return err('forbidden', 'Access denied.');

    await db.launchpadItem.update({
      where: { id: input.itemId },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(input.resetSchedule !== undefined ? { resetSchedule: input.resetSchedule } : {}),
      },
    });
    return ok(undefined);
  } catch (e) {
    console.error('[launchpad] update failed:', e);
    return err('db_error', 'Failed to update the item.');
  }
}
