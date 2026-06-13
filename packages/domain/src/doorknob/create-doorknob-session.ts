/**
 * create-doorknob-session.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Starts a Doorknob (Reverse Scheduler) session: calculates the backward
 * schedule and persists one pending scheduled_alert per future zone start.
 *
 * One session at a time: any previous pending doorknob alerts are cancelled
 * (neutrally — Rule 2, no failed states) before the new ones are created.
 */

import { createId } from '@paralleldrive/cuid2';
import { Prisma, type PrismaClient } from '@prisma/client';

import type { Result } from '../result';
import { err, ok } from '../result';
import type { DoorknobSchedule } from './calculate-schedule';
import { calculateSchedule } from './calculate-schedule';
import type { DoorknobAlertPayload, DoorknobSessionParams } from './_session';
import {
  DEFAULT_DOOR_MINUTES,
  DEFAULT_GATHER_MINUTES,
  DEFAULT_WRAP_UP_MINUTES,
} from './zones';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateDoorknobSessionInput = {
  userId: string;
  arrivalAt: Date;
  transitMinutes: number;
  gatherMinutes?: number;
  wrapUpMinutes?: number;
  doorMinutes?: number;
  /** Freeform pre-departure checklist (Launchpad integration lands in M9). */
  preDepartureTasks?: string[];
};

export type CreateDoorknobSessionError = 'invalid_input' | 'departure_passed' | 'db_error';

export type CreateDoorknobSessionResult = {
  sessionId: string;
  schedule: DoorknobSchedule;
};

const MAX_TASKS = 10;
const MAX_TASK_LENGTH = 200;

// ─── Core function ────────────────────────────────────────────────────────────

export async function createDoorknobSession(
  db: PrismaClient,
  input: CreateDoorknobSessionInput,
  now: Date = new Date(),
): Promise<Result<CreateDoorknobSessionResult, CreateDoorknobSessionError>> {
  const calculated = calculateSchedule({
    arrivalAt: input.arrivalAt,
    transitMinutes: input.transitMinutes,
    gatherMinutes: input.gatherMinutes,
    wrapUpMinutes: input.wrapUpMinutes,
    doorMinutes: input.doorMinutes,
  });
  if (!calculated.ok) return calculated;
  const schedule = calculated.value;

  // The session must still be actionable: you can't leave in the past.
  if (schedule.departAt.getTime() <= now.getTime()) {
    return err('departure_passed', 'That arrival time would mean leaving in the past. Pick a later time.');
  }

  const preDepartureTasks = (input.preDepartureTasks ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, MAX_TASKS)
    .map((t) => (t.length > MAX_TASK_LENGTH ? t.slice(0, MAX_TASK_LENGTH) : t));

  const sessionId = createId();
  const params: DoorknobSessionParams = {
    arrivalAtIso: schedule.arrivalAt.toISOString(),
    transitMinutes: input.transitMinutes,
    gatherMinutes: input.gatherMinutes ?? DEFAULT_GATHER_MINUTES,
    wrapUpMinutes: input.wrapUpMinutes ?? DEFAULT_WRAP_UP_MINUTES,
    doorMinutes: input.doorMinutes ?? DEFAULT_DOOR_MINUTES,
    preDepartureTasks,
    createdAtIso: now.toISOString(),
  };

  try {
    // One active session at a time: retire any previous pending doorknob alerts.
    await db.scheduledAlert.updateMany({
      where: { userId: input.userId, alertType: 'doorknob_zone', status: 'pending' },
      data: { status: 'cancelled' },
    });

    // One alert per zone start that is still in the future. The transit alert
    // (= departure) is always future here, so at least one row exists.
    const alerts = schedule.zones
      .filter((zone) => zone.startsAt.getTime() > now.getTime())
      .map((zone) => {
        const payload: DoorknobAlertPayload = { sessionId, zoneKey: zone.key, session: params };
        return {
          userId: input.userId,
          alertType: 'doorknob_zone' as const,
          scheduledFor: zone.startsAt,
          payload: payload as unknown as Prisma.InputJsonValue,
        };
      });

    await db.scheduledAlert.createMany({ data: alerts });

    await db.event.create({
      data: {
        userId: input.userId,
        eventType: 'doorknob.created',
        payload: { sessionId, arrivalAt: params.arrivalAtIso, transitMinutes: params.transitMinutes },
      },
    });

    return ok({ sessionId, schedule });
  } catch (e) {
    console.error('[create-doorknob-session] db error:', e);
    return err('db_error', 'Failed to start the Doorknob session.');
  }
}
