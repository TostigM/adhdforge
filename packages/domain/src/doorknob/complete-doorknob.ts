/**
 * complete-doorknob.ts — "I'm out the door"
 * ──────────────────────────────────────────────────────────────────────────────
 * Ends the session as made-it: retires the remaining pending alerts, logs
 * doorknob.completed, and lets the badge engine award doorknob_made ("On Time").
 */

import type { PrismaClient } from '@prisma/client';

import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompleteDoorknobInput = {
  userId: string;
  sessionId: string;
};

export type CompleteDoorknobError = 'not_found' | 'db_error';

export type CompleteDoorknobResult = {
  newBadges: string[];
};

// ─── Core function ────────────────────────────────────────────────────────────

export async function completeDoorknob(
  db: PrismaClient,
  input: CompleteDoorknobInput,
): Promise<Result<CompleteDoorknobResult, CompleteDoorknobError>> {
  try {
    const sessionAlerts = await db.scheduledAlert.count({
      where: {
        userId: input.userId,
        alertType: 'doorknob_zone',
        payload: { path: '$.sessionId', equals: input.sessionId },
      },
    });
    if (sessionAlerts === 0) {
      return err('not_found', 'This Doorknob session no longer exists.');
    }

    // Remaining zone alerts won't fire — the user is already out the door.
    await db.scheduledAlert.updateMany({
      where: {
        userId: input.userId,
        alertType: 'doorknob_zone',
        status: 'pending',
        payload: { path: '$.sessionId', equals: input.sessionId },
      },
      data: { status: 'cancelled' },
    });

    await db.event.create({
      data: {
        userId: input.userId,
        eventType: 'doorknob.completed',
        payload: { sessionId: input.sessionId },
      },
    });

    let newBadges: string[] = [];
    try {
      const { checkAndAward } = await import('../badges/check-and-award');
      newBadges = await checkAndAward(db, input.userId, 'doorknob.completed');
    } catch {
      // Badge engine failure is non-fatal
    }

    return ok({ newBadges });
  } catch (e) {
    console.error('[complete-doorknob] db error:', e);
    return err('db_error', 'Failed to complete the session.');
  }
}
