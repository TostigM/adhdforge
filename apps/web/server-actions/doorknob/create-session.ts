'use server';

/**
 * Server Action: Create Doorknob Session
 * ──────────────────────────────────────────────────────────────────────────────
 * Starts a Reverse Scheduler session from the setup form.
 */

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { createDoorknobSession } from '@focus-forge/domain/doorknob/create-doorknob-session';

import { authOptions } from '@/lib/auth';

export type CreateDoorknobActionInput = {
  arrivalAtIso: string;
  transitMinutes: number;
  gatherMinutes?: number;
  preDepartureTasks?: string[];
};

export type CreateDoorknobActionResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string; message?: string };

export async function createDoorknobSessionAction(
  input: CreateDoorknobActionInput,
): Promise<CreateDoorknobActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const arrivalAt = new Date(input.arrivalAtIso);
  const result = await createDoorknobSession(db, {
    userId: session.user.id,
    arrivalAt,
    transitMinutes: input.transitMinutes,
    gatherMinutes: input.gatherMinutes,
    preDepartureTasks: input.preDepartureTasks,
  });

  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/doorknob');
  return { ok: true, sessionId: result.value.sessionId };
}
