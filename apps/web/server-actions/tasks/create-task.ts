'use server';

/**
 * Server Action: Create Task
 * ──────────────────────────────────────────────────────────────────────────────
 * Auth-gated. Calls domain function. Returns typed result for the client.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import type { CreateTaskInput } from '@focus-forge/domain/tasks/create-task';
import { createTask } from '@focus-forge/domain/tasks/create-task';

import { authOptions } from '@/lib/auth';

export type CreateTaskActionInput = Pick<
  CreateTaskInput,
  'rawText' | 'title' | 'notes' | 'priorityKind' | 'priorityLevel' | 'scheduledFor' | 'estimatedMinutes'
>;

export type CreateTaskActionResult =
  | { ok: true; taskId: string; newBadges?: string[] }
  | { ok: false; error: string; message?: string };

export async function createTaskAction(
  input: CreateTaskActionInput,
): Promise<CreateTaskActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const result = await createTask(db, {
    ...input,
    userId: session.user.id,
    captureMethod: 'text',
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/dashboard');

  return { ok: true, taskId: result.value.id };
}
