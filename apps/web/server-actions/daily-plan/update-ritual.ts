'use server';

/**
 * Server Action: Update Ritual State
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks the morning ritual as completed or skipped.
 * Ritual skip costs nothing — app is fully usable without it.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { updateRitualState } from '@focus-forge/domain/daily-plan/update-ritual-state';

import { requireUser } from '@/lib/require-user';

export type UpdateRitualResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function updateRitualAction(
  planId: string,
  action: 'complete' | 'skip',
): Promise<UpdateRitualResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await updateRitualState(db, {
    planId,
    userId: auth.userId,
    action,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
