'use server';

/**
 * Server Action: Update Launchpad Item (rename / reset schedule) (M9)
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import type { UpdateLaunchpadItemInput } from '@focus-forge/domain/launchpad/update-item';
import { updateLaunchpadItem } from '@focus-forge/domain/launchpad/update-item';

import { requireUser } from '@/lib/require-user';

export type UpdateLaunchpadItemResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function updateLaunchpadItemAction(
  itemId: string,
  update: Pick<UpdateLaunchpadItemInput, 'label' | 'resetSchedule'>,
): Promise<UpdateLaunchpadItemResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await updateLaunchpadItem(db, { itemId, userId: auth.userId, ...update });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/launchpad');
  revalidatePath('/dashboard');
  return { ok: true };
}
