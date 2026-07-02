'use server';

/**
 * Server Action: Cancel Doorknob Session
 * ──────────────────────────────────────────────────────────────────────────────
 * Plans change. Ends the session neutrally.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { cancelDoorknob } from '@focus-forge/domain/doorknob/cancel-doorknob';

import { requireUser } from '@/lib/require-user';

export type CancelDoorknobActionResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function cancelDoorknobAction(
  sessionId: string,
): Promise<CancelDoorknobActionResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await cancelDoorknob(db, { userId: auth.userId, sessionId });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/doorknob');
  return { ok: true };
}
