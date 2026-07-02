'use server';

/**
 * Server Action: Add Step (manual)
 * ──────────────────────────────────────────────────────────────────────────────
 * M5 "Walk Me Through It" — manual step creation. No AI here (that's M7).
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { addStep } from '@focus-forge/domain/tasks/add-step';

import { requireUser } from '@/lib/require-user';

export type AddStepResult =
  | { ok: true; stepId: string }
  | { ok: false; error: string; message?: string };

export async function addStepAction(taskId: string, text: string): Promise<AddStepResult> {
  const auth = await requireUser('create_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await addStep(db, { taskId, userId: auth.userId, text });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return { ok: true, stepId: result.value.id };
}
