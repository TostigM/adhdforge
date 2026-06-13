'use server';

/**
 * Server Action: Cancel Doorknob Session
 * ──────────────────────────────────────────────────────────────────────────────
 * Plans change. Ends the session neutrally.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { cancelDoorknob } from '@focus-forge/domain/doorknob/cancel-doorknob';

import { authOptions } from '@/lib/auth';

export type CancelDoorknobActionResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function cancelDoorknobAction(
  sessionId: string,
): Promise<CancelDoorknobActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await cancelDoorknob(db, { userId: session.user.id, sessionId });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/doorknob');
  return { ok: true };
}
