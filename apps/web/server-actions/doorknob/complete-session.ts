'use server';

/**
 * Server Action: I'm Out The Door
 * ──────────────────────────────────────────────────────────────────────────────
 * Completes the Doorknob session; may award the doorknob_made badge.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { completeDoorknob } from '@focus-forge/domain/doorknob/complete-doorknob';
import { resetOnDepartureItems } from '@focus-forge/domain/launchpad/reset-launchpad';

import { requireUser } from '@/lib/require-user';

export type CompleteDoorknobActionResult =
  | { ok: true; newBadges: string[] }
  | { ok: false; error: string; message?: string };

export async function completeDoorknobAction(
  sessionId: string,
): Promise<CompleteDoorknobActionResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await completeDoorknob(db, { userId: auth.userId, sessionId });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  // Out the door → launchpad items on the 'on_departure' schedule uncheck for
  // next time (M9). Best-effort: the fn logs its own failures and the daily
  // reset never depends on it.
  await resetOnDepartureItems(db, auth.userId);

  revalidatePath('/doorknob');
  revalidatePath('/dashboard');
  revalidatePath('/launchpad');
  return { ok: true, newBadges: result.value.newBadges };
}
