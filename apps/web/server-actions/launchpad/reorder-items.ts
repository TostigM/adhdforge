'use server';

/**
 * Server Action: Reorder Launchpad Items (M9)
 * Accepts the full ordered id list (same contract as reorder-steps).
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { reorderLaunchpadItems } from '@focus-forge/domain/launchpad/reorder-items';

import { requireUser } from '@/lib/require-user';

export type ReorderLaunchpadItemsResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function reorderLaunchpadItemsAction(
  orderedItemIds: string[],
): Promise<ReorderLaunchpadItemsResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await reorderLaunchpadItems(db, { userId: auth.userId, orderedItemIds });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/launchpad');
  return { ok: true };
}
