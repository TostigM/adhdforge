'use server';

/**
 * Server Action: Reorder Steps
 * Accepts the full ordered list of step ids for a task.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { reorderSteps } from '@focus-forge/domain/tasks/reorder-steps';

import { authOptions } from '@/lib/auth';

export type ReorderStepsResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function reorderStepsAction(
  taskId: string,
  orderedStepIds: string[],
): Promise<ReorderStepsResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await reorderSteps(db, { taskId, userId: session.user.id, orderedStepIds });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}
