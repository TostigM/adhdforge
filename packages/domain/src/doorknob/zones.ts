/**
 * zones.ts — Doorknob zone math (pure, no DB)
 * ──────────────────────────────────────────────────────────────────────────────
 * The Reverse Scheduler works backward from an arrival time and lays the
 * lead-up out as colored zones (design: 02-design-system.md §9 DoorknobTimeline):
 *
 *   NOW ─── YELLOW wrap up ── GREEN gather ── MAUVE door ── TRANSIT ── ARRIVE
 *
 *   • wrap_up — finish what you're doing, reach a stopping point
 *   • gather  — collect what you need (the pre-departure tasks)
 *   • door    — final buffer: shoes, keys, out
 *   • transit — travel time (user input)
 *
 * Colors are semantic keys; the UI maps them to design tokens. Mauve is the
 * "urgent" tone — never red (Inviolable Rule 1).
 */

export type DoorknobZoneKey = 'wrap_up' | 'gather' | 'door' | 'transit';

export type DoorknobZoneColor = 'yellow' | 'green' | 'mauve' | 'neutral';

export type DoorknobZone = {
  key: DoorknobZoneKey;
  label: string;
  color: DoorknobZoneColor;
  startsAt: Date;
  endsAt: Date;
};

/** Default zone lengths (minutes). Gather defaults apply when no tasks are selected. */
export const DEFAULT_WRAP_UP_MINUTES = 15;
export const DEFAULT_GATHER_MINUTES = 15;
export const DEFAULT_DOOR_MINUTES = 10;

const ZONE_PRESENTATION: Record<DoorknobZoneKey, { label: string; color: DoorknobZoneColor }> = {
  wrap_up: { label: 'Wrap up', color: 'yellow' },
  gather: { label: 'Gather', color: 'green' },
  door: { label: 'Door', color: 'mauve' },
  transit: { label: 'Transit', color: 'neutral' },
};

const MINUTE_MS = 60_000;

/**
 * Build the four zones working backward from `arrivalAt`.
 * Pure construction — input validation lives in calculate-schedule.ts.
 */
export function buildZones(
  arrivalAt: Date,
  durations: { wrapUpMinutes: number; gatherMinutes: number; doorMinutes: number; transitMinutes: number },
): DoorknobZone[] {
  const transitStart = new Date(arrivalAt.getTime() - durations.transitMinutes * MINUTE_MS);
  const doorStart = new Date(transitStart.getTime() - durations.doorMinutes * MINUTE_MS);
  const gatherStart = new Date(doorStart.getTime() - durations.gatherMinutes * MINUTE_MS);
  const wrapUpStart = new Date(gatherStart.getTime() - durations.wrapUpMinutes * MINUTE_MS);

  const bounds: Array<[DoorknobZoneKey, Date, Date]> = [
    ['wrap_up', wrapUpStart, gatherStart],
    ['gather', gatherStart, doorStart],
    ['door', doorStart, transitStart],
    ['transit', transitStart, arrivalAt],
  ];

  return bounds.map(([key, startsAt, endsAt]) => ({
    key,
    label: ZONE_PRESENTATION[key].label,
    color: ZONE_PRESENTATION[key].color,
    startsAt,
    endsAt,
  }));
}

export type CurrentPosition =
  | { state: 'before_start'; nextZone: DoorknobZoneKey }
  | { state: 'in_zone'; zone: DoorknobZoneKey }
  | { state: 'arrived' };

/** Where `now` falls on the timeline. Zone windows are [startsAt, endsAt). */
export function currentPosition(zones: DoorknobZone[], now: Date): CurrentPosition {
  const first = zones[0];
  const last = zones[zones.length - 1];
  if (!first || !last) return { state: 'arrived' };

  if (now.getTime() < first.startsAt.getTime()) {
    return { state: 'before_start', nextZone: first.key };
  }
  for (const zone of zones) {
    if (now.getTime() >= zone.startsAt.getTime() && now.getTime() < zone.endsAt.getTime()) {
      return { state: 'in_zone', zone: zone.key };
    }
  }
  return { state: 'arrived' };
}

/** Shift every zone boundary by `minutes` (the "Running late (+15 min)" action). */
export function shiftZones(zones: DoorknobZone[], minutes: number): DoorknobZone[] {
  const delta = minutes * MINUTE_MS;
  return zones.map((z) => ({
    ...z,
    startsAt: new Date(z.startsAt.getTime() + delta),
    endsAt: new Date(z.endsAt.getTime() + delta),
  }));
}
