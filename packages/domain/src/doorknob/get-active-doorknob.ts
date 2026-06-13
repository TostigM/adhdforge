/**
 * get-active-doorknob.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Reconstructs the user's active Doorknob session from their pending
 * doorknob_zone alerts. Returns ok(null) when there is no live session —
 * including when the arrival time has passed (the hourly cron sweeps those
 * alerts to 'fired'; this read never mutates).
 */

import type { PrismaClient } from '@prisma/client';

import type { Result } from '../result';
import { err, ok } from '../result';
import type { DoorknobSchedule } from './calculate-schedule';
import { parseAlertPayload, scheduleFromParams } from './_session';
import type { CurrentPosition } from './zones';
import { currentPosition } from './zones';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActiveDoorknobSession = {
  sessionId: string;
  schedule: DoorknobSchedule;
  preDepartureTasks: string[];
  position: CurrentPosition;
  /** Zone starts that still have a pending alert (for client-side notifications). */
  pendingAlerts: Array<{ zoneKey: string; scheduledFor: Date }>;
};

export type GetActiveDoorknobError = 'db_error';

// ─── Core function ────────────────────────────────────────────────────────────

export async function getActiveDoorknob(
  db: PrismaClient,
  userId: string,
  now: Date = new Date(),
): Promise<Result<ActiveDoorknobSession | null, GetActiveDoorknobError>> {
  try {
    const rows = await db.scheduledAlert.findMany({
      where: { userId, alertType: 'doorknob_zone', status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: { payload: true, scheduledFor: true },
    });

    // Latest session wins (create cancels predecessors, so normally only one exists).
    for (const row of rows) {
      const payload = parseAlertPayload(row.payload);
      if (!payload) continue;

      const schedule = scheduleFromParams(payload.session);
      if (!schedule) continue;

      // Arrival passed → the session is over. Neutral: it simply ends.
      if (schedule.arrivalAt.getTime() <= now.getTime()) return ok(null);

      const sessionAlerts = rows
        .map((r) => ({ parsed: parseAlertPayload(r.payload), scheduledFor: r.scheduledFor }))
        .filter((r) => r.parsed?.sessionId === payload.sessionId)
        .map((r) => ({ zoneKey: r.parsed!.zoneKey, scheduledFor: r.scheduledFor }));

      return ok({
        sessionId: payload.sessionId,
        schedule,
        preDepartureTasks: payload.session.preDepartureTasks,
        position: currentPosition(schedule.zones, now),
        pendingAlerts: sessionAlerts,
      });
    }

    return ok(null);
  } catch (e) {
    console.error('[get-active-doorknob] db error:', e);
    return err('db_error', 'Failed to load the Doorknob session.');
  }
}
