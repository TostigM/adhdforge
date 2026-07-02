'use server';

/**
 * Server Action: Running Late (+N minutes)
 * ──────────────────────────────────────────────────────────────────────────────
 * Shifts the whole remaining Doorknob schedule later. One click, no judgment.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { recalculateLate } from '@focus-forge/domain/doorknob/recalculate-late';

import { requireUser } from '@/lib/require-user';

export type RecalculateLateActionResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function recalculateLateAction(
  sessionId: string,
  minutes = 15,
): Promise<RecalculateLateActionResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await recalculateLate(db, {
    userId: auth.userId,
    sessionId,
    minutes,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/doorknob');
  return { ok: true };
}
