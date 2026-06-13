'use server';

/**
 * Server Action: Running Late (+N minutes)
 * ──────────────────────────────────────────────────────────────────────────────
 * Shifts the whole remaining Doorknob schedule later. One click, no judgment.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { recalculateLate } from '@focus-forge/domain/doorknob/recalculate-late';

import { authOptions } from '@/lib/auth';

export type RecalculateLateActionResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function recalculateLateAction(
  sessionId: string,
  minutes = 15,
): Promise<RecalculateLateActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await recalculateLate(db, {
    userId: session.user.id,
    sessionId,
    minutes,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/doorknob');
  return { ok: true };
}
