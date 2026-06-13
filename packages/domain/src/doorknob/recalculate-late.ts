/**
 * recalculate-late.ts — the "Running late (+15 min)" button
 * ──────────────────────────────────────────────────────────────────────────────
 * Shifts the entire remaining schedule later by N minutes (default 15): the
 * arrival time moves, every pending zone alert moves with it, and the updated
 * session params are written back into each alert's payload. Alerts that
 * already fired stay fired — the past doesn't move.
 *
 * One click, no judgment (Rule 5): being late is a replan, not a failure.
 */

import { Prisma, type PrismaClient } from '@prisma/client';

import type { Result } from '../result';
import { err, ok } from '../result';
import type { DoorknobSchedule } from './calculate-schedule';
import type { DoorknobAlertPayload, DoorknobSessionParams } from './_session';
import { parseAlertPayload, scheduleFromParams } from './_session';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecalculateLateInput = {
  userId: string;
  sessionId: string;
  /** How much later. Default 15, max 120 per click. */
  minutes?: number;
};

export type RecalculateLateError = 'invalid_input' | 'not_found' | 'db_error';

const MINUTE_MS = 60_000;

// ─── Core function ────────────────────────────────────────────────────────────

export async function recalculateLate(
  db: PrismaClient,
  input: RecalculateLateInput,
): Promise<Result<DoorknobSchedule, RecalculateLateError>> {
  const minutes = input.minutes ?? 15;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
    return err('invalid_input', 'Shift must be between 1 and 120 minutes.');
  }

  try {
    const rows = await db.scheduledAlert.findMany({
      where: {
        userId: input.userId,
        alertType: 'doorknob_zone',
        status: 'pending',
        payload: { path: '$.sessionId', equals: input.sessionId },
      },
      select: { id: true, payload: true },
    });

    if (rows.length === 0) {
      return err('not_found', 'No active Doorknob session to adjust.');
    }

    const first = parseAlertPayload(rows[0]?.payload);
    if (!first) return err('not_found', 'No active Doorknob session to adjust.');

    const shiftedParams: DoorknobSessionParams = {
      ...first.session,
      arrivalAtIso: new Date(
        new Date(first.session.arrivalAtIso).getTime() + minutes * MINUTE_MS,
      ).toISOString(),
    };

    const schedule = scheduleFromParams(shiftedParams);
    if (!schedule) return err('invalid_input', 'Could not rebuild the schedule.');

    const zoneStarts = new Map(schedule.zones.map((z) => [z.key, z.startsAt]));

    for (const row of rows) {
      const parsed = parseAlertPayload(row.payload);
      if (!parsed) continue;
      const newStart = zoneStarts.get(parsed.zoneKey);
      if (!newStart) continue;

      const payload: DoorknobAlertPayload = { ...parsed, session: shiftedParams };
      await db.scheduledAlert.update({
        where: { id: row.id },
        data: {
          scheduledFor: newStart,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });
    }

    await db.event.create({
      data: {
        userId: input.userId,
        eventType: 'doorknob.recalculated',
        payload: { sessionId: input.sessionId, minutes },
      },
    });

    return ok(schedule);
  } catch (e) {
    console.error('[recalculate-late] db error:', e);
    return err('db_error', 'Failed to adjust the schedule.');
  }
}
