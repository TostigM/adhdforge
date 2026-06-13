/**
 * cancel-doorknob.ts — end a session without judgment
 * ──────────────────────────────────────────────────────────────────────────────
 * Plans change. Cancelling retires the pending alerts and logs a neutral
 * doorknob.cancelled event. No badge, no shame, no "failed" anything (Rule 2).
 */

import type { PrismaClient } from '@prisma/client';

import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CancelDoorknobInput = {
  userId: string;
  sessionId: string;
};

export type CancelDoorknobError = 'not_found' | 'db_error';

// ─── Core function ────────────────────────────────────────────────────────────

export async function cancelDoorknob(
  db: PrismaClient,
  input: CancelDoorknobInput,
): Promise<Result<void, CancelDoorknobError>> {
  try {
    const { count } = await db.scheduledAlert.updateMany({
      where: {
        userId: input.userId,
        alertType: 'doorknob_zone',
        status: 'pending',
        payload: { path: '$.sessionId', equals: input.sessionId },
      },
      data: { status: 'cancelled' },
    });

    if (count === 0) {
      return err('not_found', 'This Doorknob session no longer exists.');
    }

    await db.event.create({
      data: {
        userId: input.userId,
        eventType: 'doorknob.cancelled',
        payload: { sessionId: input.sessionId },
      },
    });

    return ok(undefined);
  } catch (e) {
    console.error('[cancel-doorknob] db error:', e);
    return err('db_error', 'Failed to cancel the session.');
  }
}
