'use server';

/**
 * Server Action: Add Step (manual)
 * ──────────────────────────────────────────────────────────────────────────────
 * M5 "Walk Me Through It" — manual step creation. No AI here (that's M7).
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { addStep } from '@focus-forge/domain/tasks/add-step';

import { authOptions } from '@/lib/auth';

export type AddStepResult =
  | { ok: true; stepId: string }
  | { ok: false; error: string; message?: string };

export async function addStepAction(taskId: string, text: string): Promise<AddStepResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await addStep(db, { taskId, userId: session.user.id, text });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return { ok: true, stepId: result.value.id };
}
