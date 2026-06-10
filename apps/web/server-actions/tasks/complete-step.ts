'use server';

/**
 * Server Action: Complete Step
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks a step done. Reports whether this finished the task (all steps complete)
 * and any badges newly awarded (first_step, first_complete).
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { completeStep } from '@focus-forge/domain/tasks/complete-step';

import { authOptions } from '@/lib/auth';

export type CompleteStepResult =
  | { ok: true; taskCompleted: boolean; newBadges: string[] }
  | { ok: false; error: string; message?: string };

export async function completeStepAction(
  stepId: string,
  taskId: string,
): Promise<CompleteStepResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await completeStep(db, { stepId, userId: session.user.id });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath(`/walk/${taskId}`);
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath('/dashboard');
  return { ok: true, taskCompleted: result.value.taskCompleted, newBadges: result.value.newBadges };
}
