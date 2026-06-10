'use server';

/**
 * Server Action: Reframe Plan Item
 * ──────────────────────────────────────────────────────────────────────────────
 * Handles the two immediately-actionable Gentle Reframe choices:
 *   snooze — suppresses the reframe card for 24 hours
 *   lower  — drops task priority to 'low' (Bronze)
 *
 * 'break' and 'anchor' are M5+ features handled as forward-pointing toasts
 * in the client — they don't call this action.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { reframeTodayItem } from '@focus-forge/domain/daily-plan/reframe-today-item';
import type { ReframeAction } from '@focus-forge/domain/daily-plan/reframe-today-item';

import { authOptions } from '@/lib/auth';

export type ReframePlanItemResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function reframePlanItemAction(
  taskId: string,
  action: ReframeAction,
): Promise<ReframePlanItemResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await reframeTodayItem(db, {
    taskId,
    userId: session.user.id,
    action,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');
  return { ok: true };
}
