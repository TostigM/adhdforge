'use server';

/**
 * Server Action: Reorder Steps
 * Accepts the full ordered list of step ids for a task.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { reorderSteps } from '@focus-forge/domain/tasks/reorder-steps';

import { requireUser } from '@/lib/require-user';

export type ReorderStepsResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function reorderStepsAction(
  taskId: string,
  orderedStepIds: string[],
): Promise<ReorderStepsResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await reorderSteps(db, { taskId, userId: auth.userId, orderedStepIds });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}
