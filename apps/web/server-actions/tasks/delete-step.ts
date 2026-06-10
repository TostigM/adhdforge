'use server';

/**
 * Server Action: Delete Step
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { deleteStep } from '@focus-forge/domain/tasks/delete-step';

import { authOptions } from '@/lib/auth';

export type DeleteStepResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function deleteStepAction(stepId: string, taskId: string): Promise<DeleteStepResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await deleteStep(db, { stepId, userId: session.user.id });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
}
