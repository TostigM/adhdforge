/**
 * focus-session.ts — Focus timer lifecycle (M6).
 * ──────────────────────────────────────────────────────────────────────────────
 * start → (pause ↔ resume)* → end.
 *
 * - start logs `focus_session.started` → first_focus badge.
 * - end with status 'completed' logs `focus_session.completed` → focus_complete
 *   badge (repeatable). end with 'incomplete' is NEUTRAL, never "failed"
 *   (Soft-Track Protocol).
 *
 * Elapsed time is tracked client-side; the client passes actualDurationSeconds
 * on end. The server records lifecycle + status for history and badges.
 *
 * See 06-build-roadmap.md §6.1, 04-mysql-schema.md §4.12
 */

import type { FocusSession, PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { checkAndAward } from '../badges/check-and-award';

// ─── start ────────────────────────────────────────────────────────────────────

export type StartFocusSessionInput = {
  userId: string;
  taskId?: string | null;
  plannedDurationSeconds: number;
  soundFamily?: string | null;
  alertIntervalSeconds?: number | null;
};

export type StartFocusSessionResult = {
  session: FocusSession;
  newBadges: string[];
};

export type StartFocusSessionError = 'invalid_duration' | 'db_error';

const MAX_DURATION_SECONDS = 6 * 60 * 60; // 6h sanity cap

export async function startFocusSession(
  db: PrismaClient,
  input: StartFocusSessionInput,
): Promise<Result<StartFocusSessionResult, StartFocusSessionError>> {
  const planned = Math.round(input.plannedDurationSeconds);
  if (!Number.isFinite(planned) || planned <= 0 || planned > MAX_DURATION_SECONDS) {
    return err('invalid_duration', 'Pick a duration between 1 second and 6 hours.');
  }

  try {
    const session = await db.focusSession.create({
      data: {
        userId: input.userId,
        taskId: input.taskId ?? null,
        plannedDurationSeconds: planned,
        soundFamily: input.soundFamily ?? null,
        alertIntervalSeconds: input.alertIntervalSeconds ?? null,
        status: 'running',
      },
    });

    await db.event.create({
      data: {
        userId: input.userId,
        eventType: 'focus_session.started',
        payload: { focusSessionId: session.id, plannedDurationSeconds: planned },
      },
    });

    let newBadges: string[] = [];
    try {
      newBadges = await checkAndAward(db, input.userId, 'focus_session.started');
    } catch {
      // non-fatal
    }

    return ok({ session, newBadges });
  } catch (e) {
    console.error('[focus-session:start] db error:', e);
    return err('db_error', 'Could not start the timer.');
  }
}

// ─── pause / resume ───────────────────────────────────────────────────────────

export type FocusSessionStatusError =
  | 'session_not_found'
  | 'forbidden'
  | 'invalid_state'
  | 'db_error';

async function loadOwned(
  db: PrismaClient,
  sessionId: string,
  userId: string,
): Promise<Result<FocusSession, FocusSessionStatusError>> {
  const session = await db.focusSession.findUnique({ where: { id: sessionId } });
  if (!session) return err('session_not_found', 'This timer no longer exists.');
  if (session.userId !== userId) return err('forbidden', 'Access denied.');
  return ok(session);
}

export async function pauseFocusSession(
  db: PrismaClient,
  input: { sessionId: string; userId: string },
): Promise<Result<void, FocusSessionStatusError>> {
  try {
    const loaded = await loadOwned(db, input.sessionId, input.userId);
    if (!loaded.ok) return loaded;
    if (loaded.value.status !== 'running') return err('invalid_state', 'Only a running timer can pause.');

    await db.focusSession.update({ where: { id: input.sessionId }, data: { status: 'paused' } });
    return ok(undefined);
  } catch (e) {
    console.error('[focus-session:pause] db error:', e);
    return err('db_error', 'Could not pause the timer.');
  }
}

export async function resumeFocusSession(
  db: PrismaClient,
  input: { sessionId: string; userId: string },
): Promise<Result<void, FocusSessionStatusError>> {
  try {
    const loaded = await loadOwned(db, input.sessionId, input.userId);
    if (!loaded.ok) return loaded;
    if (loaded.value.status !== 'paused') return err('invalid_state', 'Only a paused timer can resume.');

    await db.focusSession.update({ where: { id: input.sessionId }, data: { status: 'running' } });
    return ok(undefined);
  } catch (e) {
    console.error('[focus-session:resume] db error:', e);
    return err('db_error', 'Could not resume the timer.');
  }
}

// ─── end ──────────────────────────────────────────────────────────────────────

export type EndFocusSessionInput = {
  sessionId: string;
  userId: string;
  actualDurationSeconds: number;
  /** 'completed' = ran to plan; 'incomplete' = user exited early (NEUTRAL). */
  status: 'completed' | 'incomplete';
};

export type EndFocusSessionResult = {
  newBadges: string[];
};

export async function endFocusSession(
  db: PrismaClient,
  input: EndFocusSessionInput,
): Promise<Result<EndFocusSessionResult, FocusSessionStatusError>> {
  try {
    const loaded = await loadOwned(db, input.sessionId, input.userId);
    if (!loaded.ok) return loaded;

    const current = loaded.value;
    // Idempotent: already ended → no duplicate events.
    if (current.status === 'completed' || current.status === 'incomplete') {
      return ok({ newBadges: [] });
    }

    const actual = Math.max(0, Math.round(input.actualDurationSeconds));

    await db.focusSession.update({
      where: { id: input.sessionId },
      data: {
        status: input.status,
        actualDurationSeconds: actual,
        endedAt: new Date(),
      },
    });

    let newBadges: string[] = [];
    if (input.status === 'completed') {
      await db.event.create({
        data: {
          userId: input.userId,
          eventType: 'focus_session.completed',
          payload: { focusSessionId: input.sessionId, actualDurationSeconds: actual },
        },
      });
      try {
        newBadges = await checkAndAward(db, input.userId, 'focus_session.completed');
      } catch {
        // non-fatal
      }
    }

    return ok({ newBadges });
  } catch (e) {
    console.error('[focus-session:end] db error:', e);
    return err('db_error', 'Could not end the timer.');
  }
}
