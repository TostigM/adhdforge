'use server';

/**
 * Server Action: Add Launchpad Item (M9)
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import type { AddLaunchpadItemInput } from '@focus-forge/domain/launchpad/add-item';
import { addLaunchpadItem } from '@focus-forge/domain/launchpad/add-item';

import { requireUser } from '@/lib/require-user';

export type AddLaunchpadItemResult =
  | { ok: true; itemId: string }
  | { ok: false; error: string; message?: string };

export async function addLaunchpadItemAction(
  label: string,
  resetSchedule?: AddLaunchpadItemInput['resetSchedule'],
): Promise<AddLaunchpadItemResult> {
  const auth = await requireUser('create_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await addLaunchpadItem(db, { userId: auth.userId, label, resetSchedule });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/launchpad');
  revalidatePath('/dashboard');
  return { ok: true, itemId: result.value.id };
}
