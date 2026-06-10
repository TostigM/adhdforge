'use server';

/**
 * Server Action: Complete Task
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { completeTask } from '@focus-forge/domain/tasks/complete-task';

import { authOptions } from '@/lib/auth';

export type CompleteTaskActionResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function completeTaskAction(
  taskId: string,
): Promise<CompleteTaskActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await completeTask(db, { taskId, userId: session.user.id });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');

  return { ok: true };
}
