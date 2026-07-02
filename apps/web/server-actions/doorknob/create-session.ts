'use server';

/**
 * Server Action: Create Doorknob Session
 * ──────────────────────────────────────────────────────────────────────────────
 * Starts a Reverse Scheduler session from the setup form.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { createDoorknobSession } from '@focus-forge/domain/doorknob/create-doorknob-session';

import { requireUser } from '@/lib/require-user';

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
  const auth = await requireUser('create_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const arrivalAt = new Date(input.arrivalAtIso);
  const result = await createDoorknobSession(db, {
    userId: auth.userId,
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
