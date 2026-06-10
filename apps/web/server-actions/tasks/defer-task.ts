'use server';

/**
 * Server Action: Defer Task
 * deferUntil is optional — if omitted, task floats back to backlog without a set time.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { deferTask } from '@focus-forge/domain/tasks/defer-task';

import { authOptions } from '@/lib/auth';

export type DeferTaskActionResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function deferTaskAction(
  taskId: string,
  deferUntil?: Date,
): Promise<DeferTaskActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await deferTask(db, {
    taskId,
    userId: session.user.id,
    deferUntil,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');

  return { ok: true };
}
