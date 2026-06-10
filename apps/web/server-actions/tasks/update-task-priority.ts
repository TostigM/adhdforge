'use server';

/**
 * Server Action: Update Task Priority
 * ──────────────────────────────────────────────────────────────────────────────
 * Validates Soft-Track Protocol: cant_miss requires anchor; no 'urgent' or 'red'.
 */

import type { TaskPriorityKind, TaskPriorityLevel } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';

import { authOptions } from '@/lib/auth';

export type UpdateTaskPriorityInput = {
  taskId: string;
  priorityKind?: TaskPriorityKind;
  priorityLevel?: TaskPriorityLevel;
};

export type UpdateTaskPriorityResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function updateTaskPriorityAction(
  input: UpdateTaskPriorityInput,
): Promise<UpdateTaskPriorityResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  // Soft-Track: cant_miss is only valid for anchor tasks
  if (input.priorityLevel === 'cant_miss' && input.priorityKind !== 'anchor') {
    return {
      ok: false,
      error: 'cant_miss_requires_anchor',
      message: "'Can't Miss' is only valid for anchor tasks.",
    };
  }

  try {
    const existing = await db.task.findUnique({
      where: { id: input.taskId },
      select: { userId: true, priorityKind: true, priorityLevel: true },
    });

    if (!existing) return { ok: false, error: 'task_not_found', message: 'Task not found.' };
    if (existing.userId !== session.user.id) {
      return { ok: false, error: 'forbidden', message: 'Access denied.' };
    }

    const newKind = input.priorityKind ?? existing.priorityKind;
    const newLevel = input.priorityLevel ?? existing.priorityLevel;

    // Re-check combined values after applying defaults
    if (newLevel === 'cant_miss' && newKind !== 'anchor') {
      return {
        ok: false,
        error: 'cant_miss_requires_anchor',
        message: "'Can't Miss' is only valid for anchor tasks.",
      };
    }

    await db.task.update({
      where: { id: input.taskId },
      data: {
        priorityKind: newKind,
        priorityLevel: newLevel,
      },
    });

    revalidatePath('/dashboard');

    return { ok: true };
  } catch (e) {
    console.error('[update-task-priority] db error:', e);
    return { ok: false, error: 'db_error', message: 'Failed to update priority.' };
  }
}
