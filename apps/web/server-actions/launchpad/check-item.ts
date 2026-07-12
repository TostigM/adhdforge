'use server';

/**
 * Server Action: Check / Uncheck Launchpad Item (M9)
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { checkLaunchpadItem } from '@focus-forge/domain/launchpad/check-item';

import { requireUser } from '@/lib/require-user';

export type CheckLaunchpadItemResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function checkLaunchpadItemAction(
  itemId: string,
  checked: boolean,
): Promise<CheckLaunchpadItemResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await checkLaunchpadItem(db, { itemId, userId: auth.userId, checked });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/launchpad');
  revalidatePath('/dashboard');
  return { ok: true };
}
