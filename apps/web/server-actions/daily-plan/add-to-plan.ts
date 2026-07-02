'use server';

/**
 * Server Action: Add Task to Today Plan
 * ──────────────────────────────────────────────────────────────────────────────
 * Used by the morning ritual and the "Add to today" manual action.
 * Returns the slot state so the UI knows whether the task is now visible
 * or queued.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { addToTodayPlan } from '@focus-forge/domain/daily-plan/add-to-today-plan';

import { requireUser } from '@/lib/require-user';

export type AddToPlanResult =
  | { ok: true; slotState: 'today' | 'queue' }
  | { ok: false; error: string; message?: string };

export async function addToPlanAction(
  planId: string,
  taskId: string,
  source: 'ritual' | 'manual',
): Promise<AddToPlanResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await addToTodayPlan(db, {
    planId,
    taskId,
    userId: auth.userId,
    source,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');
  return { ok: true, slotState: result.value.slotState };
}
