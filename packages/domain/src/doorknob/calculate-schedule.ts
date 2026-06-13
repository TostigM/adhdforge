/**
 * calculate-schedule.ts — backward calculation for the Reverse Scheduler (pure)
 * ──────────────────────────────────────────────────────────────────────────────
 * arrival − transit − door − gather − wrap-up = start time.
 *
 * Pure and synchronous: DB persistence lives in create-doorknob-session.ts.
 */

import type { Result } from '../result';
import { err, ok } from '../result';
import type { DoorknobZone } from './zones';
import {
  buildZones,
  DEFAULT_DOOR_MINUTES,
  DEFAULT_GATHER_MINUTES,
  DEFAULT_WRAP_UP_MINUTES,
} from './zones';

export type CalculateScheduleInput = {
  arrivalAt: Date;
  transitMinutes: number;
  /** Sum of pre-departure task estimates. Defaults to 15. */
  gatherMinutes?: number;
  wrapUpMinutes?: number;
  doorMinutes?: number;
};

export type DoorknobSchedule = {
  arrivalAt: Date;
  /** When the user must walk out the door (arrival − transit). */
  departAt: Date;
  /** When the wrap-up zone begins — the answer to "when do I need to start?" */
  startAt: Date;
  zones: DoorknobZone[];
};

export type CalculateScheduleError = 'invalid_input';

const MAX_ZONE_MINUTES = 24 * 60;

function isInvalidMinutes(value: number, min: number): boolean {
  return !Number.isFinite(value) || !Number.isInteger(value) || value < min || value > MAX_ZONE_MINUTES;
}

export function calculateSchedule(
  input: CalculateScheduleInput,
): Result<DoorknobSchedule, CalculateScheduleError> {
  const wrapUpMinutes = input.wrapUpMinutes ?? DEFAULT_WRAP_UP_MINUTES;
  const gatherMinutes = input.gatherMinutes ?? DEFAULT_GATHER_MINUTES;
  const doorMinutes = input.doorMinutes ?? DEFAULT_DOOR_MINUTES;

  if (Number.isNaN(input.arrivalAt.getTime())) {
    return err('invalid_input', 'Arrival time is not a valid date.');
  }
  if (isInvalidMinutes(input.transitMinutes, 0)) {
    return err('invalid_input', 'Transit must be a whole number of minutes (0–1440).');
  }
  // Zones need at least 1 minute each so the timeline always has visible segments.
  if (isInvalidMinutes(wrapUpMinutes, 1) || isInvalidMinutes(gatherMinutes, 1) || isInvalidMinutes(doorMinutes, 1)) {
    return err('invalid_input', 'Zone lengths must be whole numbers of minutes (1–1440).');
  }

  const zones = buildZones(input.arrivalAt, {
    wrapUpMinutes,
    gatherMinutes,
    doorMinutes,
    transitMinutes: input.transitMinutes,
  });

  const transit = zones[zones.length - 1];
  const first = zones[0];
  if (!transit || !first) {
    return err('invalid_input', 'Could not build the schedule.');
  }

  return ok({
    arrivalAt: input.arrivalAt,
    departAt: transit.startsAt,
    startAt: first.startsAt,
    zones,
  });
}
