'use server';

/**
 * Server Action: Update User Preferences
 * ──────────────────────────────────────────────────────────────────────────────
 * Merges partial preference updates into user.preferences JSON.
 * Called from the account settings page.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { updateUserPreferences } from '@focus-forge/domain/users/update-preferences';
import type { UserPreferences } from '@focus-forge/domain/users/update-preferences';

import { authOptions } from '@/lib/auth';

export type UpdatePreferencesResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function updatePreferencesAction(
  update: UserPreferences,
): Promise<UpdatePreferencesResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await updateUserPreferences(db, session.user.id, update);

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  // If visibleSlots changed, apply it to today's plan immediately
  if (update.visibleSlots !== undefined) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await db.dailyPlan.updateMany({
      where: { userId: session.user.id, planDate: today },
      data: { visibleSlots: update.visibleSlots },
    });
  }

  revalidatePath('/account');
  revalidatePath('/dashboard');
  return { ok: true };
}
