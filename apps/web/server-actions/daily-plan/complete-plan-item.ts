'use server';

/**
 * Server Action: Complete Plan Item
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks a Today item as done, completes the task, and runs bubble-up.
 * Returns { ok: true, doneCount } so the client can show a dopamine counter.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { completeTodayItem } from '@focus-forge/domain/daily-plan/complete-today-item';
import { checkSpeedRunEligibility } from '@focus-forge/domain/timer/speed-run-hook';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';

import { requireUser } from '@/lib/require-user';

export type CompletePlanItemResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function completePlanItemAction(
  itemId: string,
  planId: string,
): Promise<CompletePlanItemResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await completeTodayItem(db, {
    itemId,
    planId,
    userId: auth.userId,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  // Speed-Run scaffolding hook (M6, hooks-only): fire the eligibility signal
  // when 2+ tasks complete within 15 min. No-op unless the user opted in.
  try {
    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: { preferences: true },
    });
    const { speedRunChallengesEnabled } = parsePreferences(user?.preferences);
    await checkSpeedRunEligibility(db, auth.userId, { enabled: speedRunChallengesEnabled });
  } catch {
    // non-fatal — never block a completion on the hook
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
