/**
 * add-item.ts — Add an item to the launchpad.
 * Appends at the end (displayOrder = max + 1). Auto-saves — no Save button.
 */

import type { LaunchpadItem, LaunchpadResetSchedule, PrismaClient } from '@prisma/client';
import type { Err, Result } from '../result';
import { err, ok } from '../result';

export type AddLaunchpadItemInput = {
  userId: string;
  label: string;
  resetSchedule?: LaunchpadResetSchedule;
};

export type AddLaunchpadItemError = 'label_empty' | 'label_too_long' | 'db_error';

// VARCHAR(120) per doc 04 §4.11
export const MAX_LABEL_LENGTH = 120;

function validate(label: string): Err<AddLaunchpadItemError> | undefined {
  if (!label) return err('label_empty', 'Give the item a name — even just "Keys".');
  if (label.length > MAX_LABEL_LENGTH)
    return err('label_too_long', `Item names must be under ${MAX_LABEL_LENGTH} characters.`);
  return undefined;
}

export async function addLaunchpadItem(
  db: PrismaClient,
  input: AddLaunchpadItemInput,
): Promise<Result<LaunchpadItem, AddLaunchpadItemError>> {
  const label = input.label.trim();
  const validationError = validate(label);
  if (validationError) return validationError;

  try {
    const agg = await db.launchpadItem.aggregate({
      where: { userId: input.userId },
      _max: { displayOrder: true },
    });
    const displayOrder = (agg._max.displayOrder ?? -1) + 1;

    const item = await db.launchpadItem.create({
      data: {
        userId: input.userId,
        label,
        displayOrder,
        resetSchedule: input.resetSchedule ?? 'daily',
      },
    });
    return ok(item);
  } catch (e) {
    console.error('[launchpad] add failed:', e);
    return err('db_error', 'Failed to save the item. Please try again.');
  }
}
