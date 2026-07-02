'use server';

/**
 * Server Action: Complete Step
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks a step done. Reports whether this finished the task (all steps complete)
 * and any badges newly awarded (first_step, first_complete).
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { completeStep } from '@focus-forge/domain/tasks/complete-step';

import { requireUser } from '@/lib/require-user';

export type CompleteStepResult =
  | { ok: true; taskCompleted: boolean; newBadges: string[] }
  | { ok: false; error: string; message?: string };

export async function completeStepAction(
  stepId: string,
  taskId: string,
): Promise<CompleteStepResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await completeStep(db, { stepId, userId: auth.userId });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath(`/walk/${taskId}`);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath('/dashboard');
  return { ok: true, taskCompleted: result.value.taskCompleted, newBadges: result.value.newBadges };
}
