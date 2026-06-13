/**
 * _session.ts — internal: the Doorknob session ↔ scheduled_alerts mapping
 * ──────────────────────────────────────────────────────────────────────────────
 * M8 decision: a Doorknob session has NO table of its own. It is persisted as
 * its set of `doorknob_zone` rows in scheduled_alerts — one alert per zone
 * start — linked by `payload.sessionId`. Every alert carries the full session
 * parameters so the timeline can be rebuilt from any single row.
 *
 * Not exported from the package: only doorknob/* modules use this.
 */

import type { DoorknobSchedule } from './calculate-schedule';
import { calculateSchedule } from './calculate-schedule';
import type { DoorknobZoneKey } from './zones';

/** The session parameters embedded in every alert's payload. */
export type DoorknobSessionParams = {
  arrivalAtIso: string;
  transitMinutes: number;
  gatherMinutes: number;
  wrapUpMinutes: number;
  doorMinutes: number;
  preDepartureTasks: string[];
  createdAtIso: string;
};

export type DoorknobAlertPayload = {
  sessionId: string;
  /** The zone whose START this alert announces. */
  zoneKey: DoorknobZoneKey;
  session: DoorknobSessionParams;
};

const ZONE_KEYS: readonly string[] = ['wrap_up', 'gather', 'door', 'transit'];

/** Defensive parse of an alert payload read back from the DB. */
export function parseAlertPayload(raw: unknown): DoorknobAlertPayload | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.sessionId !== 'string') return null;
  if (typeof p.zoneKey !== 'string' || !ZONE_KEYS.includes(p.zoneKey)) return null;

  const s = p.session;
  if (typeof s !== 'object' || s === null) return null;
  const sp = s as Record<string, unknown>;
  if (typeof sp.arrivalAtIso !== 'string' || Number.isNaN(Date.parse(sp.arrivalAtIso))) return null;
  if (
    typeof sp.transitMinutes !== 'number' ||
    typeof sp.gatherMinutes !== 'number' ||
    typeof sp.wrapUpMinutes !== 'number' ||
    typeof sp.doorMinutes !== 'number'
  ) {
    return null;
  }

  const tasks = Array.isArray(sp.preDepartureTasks)
    ? sp.preDepartureTasks.filter((t): t is string => typeof t === 'string')
    : [];

  return {
    sessionId: p.sessionId,
    zoneKey: p.zoneKey as DoorknobZoneKey,
    session: {
      arrivalAtIso: sp.arrivalAtIso,
      transitMinutes: sp.transitMinutes,
      gatherMinutes: sp.gatherMinutes,
      wrapUpMinutes: sp.wrapUpMinutes,
      doorMinutes: sp.doorMinutes,
      preDepartureTasks: tasks,
      createdAtIso: typeof sp.createdAtIso === 'string' ? sp.createdAtIso : new Date(0).toISOString(),
    },
  };
}

/** Rebuild the schedule a set of session params describes. Null if params are corrupt. */
export function scheduleFromParams(params: DoorknobSessionParams): DoorknobSchedule | null {
  const result = calculateSchedule({
    arrivalAt: new Date(params.arrivalAtIso),
    transitMinutes: params.transitMinutes,
    gatherMinutes: params.gatherMinutes,
    wrapUpMinutes: params.wrapUpMinutes,
    doorMinutes: params.doorMinutes,
  });
  return result.ok ? result.value : null;
}
