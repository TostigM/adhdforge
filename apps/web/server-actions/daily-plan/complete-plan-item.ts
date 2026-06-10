'use server';

/**
 * Server Action: Complete Plan Item
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks a Today item as done, completes the task, and runs bubble-up.
 * Returns { ok: true, doneCount } so the client can show a dopamine counter.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { completeTodayItem } from '@focus-forge/domain/daily-plan/complete-today-item';
import { checkSpeedRunEligibility } from '@focus-forge/domain/timer/speed-run-hook';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';

import { authOptions } from '@/lib/auth';

export type CompletePlanItemResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function completePlanItemAction(
  itemId: string,
  planId: string,
): Promise<CompletePlanItemResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await completeTodayItem(db, {
    itemId,
    planId,
    userId: session.user.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  // Speed-Run scaffolding hook (M6, hooks-only): fire the eligibility signal
  // when 2+ tasks complete within 15 min. No-op unless the user opted in.
  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });
    const { speedRunChallengesEnabled } = parsePreferences(user?.preferences);
    await checkSpeedRunEligibility(db, session.user.id, { enabled: speedRunChallengesEnabled });
  } catch {
    // non-fatal — never block a completion on the hook
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
