'use server';

/**
 * Server Action: Swap Plan Item
 * ──────────────────────────────────────────────────────────────────────────────
 * Sends a flexible task back to the queue. Returns whether to show
 * the Gentle Reframe card for this task.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { swapTodayItem } from '@focus-forge/domain/daily-plan/swap-today-item';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';

import { requireUser } from '@/lib/require-user';

export type SwapPlanItemResult =
  | { ok: true; showReframeCard: boolean; taskId?: string }
  | { ok: false; error: string; message?: string };

export async function swapPlanItemAction(
  itemId: string,
  planId: string,
  taskId: string,
): Promise<SwapPlanItemResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  // Load user preferences for the gentle reframe behavior
  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { preferences: true },
  });
  const { gentleReframeEnabled, gentleReframeThreshold } = parsePreferences(user?.preferences);

  const result = await swapTodayItem(db, {
    itemId,
    planId,
    userId: auth.userId,
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
