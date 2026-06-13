'use server';

/**
 * Server Action: I'm Out The Door
 * ──────────────────────────────────────────────────────────────────────────────
 * Completes the Doorknob session; may award the doorknob_made badge.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { completeDoorknob } from '@focus-forge/domain/doorknob/complete-doorknob';

import { authOptions } from '@/lib/auth';

export type CompleteDoorknobActionResult =
  | { ok: true; newBadges: string[] }
  | { ok: false; error: string; message?: string };

export async function completeDoorknobAction(
  sessionId: string,
): Promise<CompleteDoorknobActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await completeDoorknob(db, { userId: session.user.id, sessionId });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/doorknob');
  revalidatePath('/dashboard');
  return { ok: true, newBadges: result.value.newBadges };
}
