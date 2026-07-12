'use server';

/**
 * Server Action: Delete Launchpad Item (M9)
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { deleteLaunchpadItem } from '@focus-forge/domain/launchpad/delete-item';

import { requireUser } from '@/lib/require-user';

export type DeleteLaunchpadItemResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function deleteLaunchpadItemAction(
  itemId: string,
): Promise<DeleteLaunchpadItemResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await deleteLaunchpadItem(db, { itemId, userId: auth.userId });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/launchpad');
  revalidatePath('/dashboard');
  return { ok: true };
}
