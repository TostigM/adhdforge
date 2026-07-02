'use server';

/**
 * Server Action: Delete Step
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { deleteStep } from '@focus-forge/domain/tasks/delete-step';

import { requireUser } from '@/lib/require-user';

export type DeleteStepResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function deleteStepAction(stepId: string, taskId: string): Promise<DeleteStepResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await deleteStep(db, { stepId, userId: auth.userId });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}
