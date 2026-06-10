'use server';

/**
 * Server Action: Update Ritual State
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks the morning ritual as completed or skipped.
 * Ritual skip costs nothing — app is fully usable without it.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { updateRitualState } from '@focus-forge/domain/daily-plan/update-ritual-state';

import { authOptions } from '@/lib/auth';

export type UpdateRitualResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function updateRitualAction(
  planId: string,
  action: 'complete' | 'skip',
): Promise<UpdateRitualResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await updateRitualState(db, {
    planId,
    userId: session.user.id,
    action,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
