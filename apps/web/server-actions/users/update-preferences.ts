'use server';

/**
 * Server Action: Update User Preferences
 * ──────────────────────────────────────────────────────────────────────────────
 * Merges partial preference updates into user.preferences JSON.
 * Called from the account settings page.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { getPlanDate } from '@focus-forge/domain/daily-plan/plan-day';
import { updateUserPreferences } from '@focus-forge/domain/users/update-preferences';
import type { UserPreferences } from '@focus-forge/domain/users/update-preferences';

import { requireUser } from '@/lib/require-user';

export type UpdatePreferencesResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function updatePreferencesAction(
  update: UserPreferences,
): Promise<UpdatePreferencesResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await updateUserPreferences(db, auth.userId, update);

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  // If visibleSlots changed, apply it to today's plan immediately
  if (update.visibleSlots !== undefined) {
    const today = getPlanDate();
    await db.dailyPlan.updateMany({
      where: { userId: auth.userId, planDate: today },
      data: { visibleSlots: update.visibleSlots },
    });
  }

  revalidatePath('/account');
  revalidatePath('/dashboard');
  return { ok: true };
}
