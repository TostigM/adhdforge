/**
 * reorder-items.ts — Persist a new display order.
 * ──────────────────────────────────────────────────────────────────────────────
 * Takes the FULL ordered id list (same contract as tasks/reorder-steps) and
 * validates it matches the user's items exactly. Unlike steps there is no
 * unique constraint on (user, displayOrder), so a single-phase transactional
 * write is safe.
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type ReorderLaunchpadItemsInput = {
  userId: string;
  orderedItemIds: string[];
};

export type ReorderLaunchpadItemsError = 'invalid_item_set' | 'db_error';

export async function reorderLaunchpadItems(
  db: PrismaClient,
  input: ReorderLaunchpadItemsInput,
): Promise<Result<void, ReorderLaunchpadItemsError>> {
  try {
    const existing = await db.launchpadItem.findMany({
      where: { userId: input.userId },
      select: { id: true },
    });

    const existingIds = new Set(existing.map((i) => i.id));
    const providedIds = new Set(input.orderedItemIds);
    const sameSet =
      existingIds.size === providedIds.size &&
      input.orderedItemIds.every((id) => existingIds.has(id));
    if (!sameSet) {
      return err('invalid_item_set', 'The list changed — please refresh and try again.');
    }

    await db.$transaction(
      input.orderedItemIds.map((id, index) =>
        db.launchpadItem.update({ where: { id }, data: { displayOrder: index } }),
      ),
    );
    return ok(undefined);
  } catch (e) {
    console.error('[launchpad] reorder failed:', e);
    return err('db_error', 'Failed to reorder. Please try again.');
  }
}
