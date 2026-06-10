'use server';

/**
 * Server Action: Swap Plan Item
 * ──────────────────────────────────────────────────────────────────────────────
 * Sends a flexible task back to the queue. Returns whether to show
 * the Gentle Reframe card for this task.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { swapTodayItem } from '@focus-forge/domain/daily-plan/swap-today-item';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';

import { authOptions } from '@/lib/auth';

export type SwapPlanItemResult =
  | { ok: true; showReframeCard: boolean; taskId?: string }
  | { ok: false; error: string; message?: string };

export async function swapPlanItemAction(
  itemId: string,
  planId: string,
  taskId: string,
): Promise<SwapPlanItemResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  // Load user preferences for the gentle reframe behavior
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { preferences: true },
  });
  const { gentleReframeEnabled, gentleReframeThreshold } = parsePreferences(user?.preferences);

  const result = await swapTodayItem(db, {
    itemId,
    planId,
    userId: session.user.id,
    // When reframe is disabled, use an unreachable threshold so the card never fires
    gentleReframeThreshold: gentleReframeEnabled ? gentleReframeThreshold : Number.MAX_SAFE_INTEGER,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');
  return {
    ok: true,
    showReframeCard: result.value.showReframeCard,
    taskId: result.value.showReframeCard ? taskId : undefined,
  };
}
