'use server';

/**
 * Server Action: Add Task to Today Plan
 * ──────────────────────────────────────────────────────────────────────────────
 * Used by the morning ritual and the "Add to today" manual action.
 * Returns the slot state so the UI knows whether the task is now visible
 * or queued.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { addToTodayPlan } from '@focus-forge/domain/daily-plan/add-to-today-plan';

import { authOptions } from '@/lib/auth';

export type AddToPlanResult =
  | { ok: true; slotState: 'today' | 'queue' }
  | { ok: false; error: string; message?: string };

export async function addToPlanAction(
  planId: string,
  taskId: string,
  source: 'ritual' | 'manual',
): Promise<AddToPlanResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await addToTodayPlan(db, {
    planId,
    taskId,
    userId: session.user.id,
    source,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');
  return { ok: true, slotState: result.value.slotState };
}
