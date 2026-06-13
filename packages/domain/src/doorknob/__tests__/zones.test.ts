/**
 * zones.test.ts — zone boundary math
 */

import { describe, expect, it } from 'vitest';
import { buildZones, currentPosition, shiftZones } from '../zones';

const ARRIVAL = new Date('2026-06-15T20:00:00Z'); // 1 PM PDT

const STANDARD = { wrapUpMinutes: 15, gatherMinutes: 15, doorMinutes: 10, transitMinutes: 20 };

describe('buildZones', () => {
  it('lays zones back-to-back, ending at arrival', () => {
    const zones = buildZones(ARRIVAL, STANDARD);

    expect(zones.map((z) => z.key)).toEqual(['wrap_up', 'gather', 'door', 'transit']);
    expect(zones[3]?.endsAt.toISOString()).toBe(ARRIVAL.toISOString());
    // transit 20 min → departure 19:40
    expect(zones[3]?.startsAt.toISOString()).toBe('2026-06-15T19:40:00.000Z');
    // door 10 min → 19:30
    expect(zones[2]?.startsAt.toISOString()).toBe('2026-06-15T19:30:00.000Z');
    // gather 15 min → 19:15
    expect(zones[1]?.startsAt.toISOString()).toBe('2026-06-15T19:15:00.000Z');
    // wrap_up 15 min → 19:00 (the "start getting ready" moment)
    expect(zones[0]?.startsAt.toISOString()).toBe('2026-06-15T19:00:00.000Z');
  });

  it('zones are contiguous: each ends where the next starts', () => {
    const zones = buildZones(ARRIVAL, STANDARD);
    for (let i = 0; i < zones.length - 1; i++) {
      expect(zones[i]?.endsAt.toISOString()).toBe(zones[i + 1]?.startsAt.toISOString());
    }
  });

  it('uses the calm palette: yellow → green → mauve, never red', () => {
    const zones = buildZones(ARRIVAL, STANDARD);
    expect(zones.map((z) => z.color)).toEqual(['yellow', 'green', 'mauve', 'neutral']);
  });

  it('zero transit puts departure at arrival', () => {
    const zones = buildZones(ARRIVAL, { ...STANDARD, transitMinutes: 0 });
    expect(zones[3]?.startsAt.toISOString()).toBe(ARRIVAL.toISOString());
  });
});

describe('currentPosition', () => {
  const zones = buildZones(ARRIVAL, STANDARD); // wrap_up starts 19:00Z

  it('before the first zone → before_start', () => {
    const pos = currentPosition(zones, new Date('2026-06-15T18:30:00Z'));
    expect(pos).toEqual({ state: 'before_start', nextZone: 'wrap_up' });
  });

  it('zone windows are [start, end): boundary instant belongs to the later zone', () => {
    expect(currentPosition(zones, new Date('2026-06-15T19:00:00Z'))).toEqual({
      state: 'in_zone',
      zone: 'wrap_up',
    });
    expect(currentPosition(zones, new Date('2026-06-15T19:15:00Z'))).toEqual({
      state: 'in_zone',
      zone: 'gather',
    });
    expect(currentPosition(zones, new Date('2026-06-15T19:30:00Z'))).toEqual({
      state: 'in_zone',
      zone: 'door',
    });
    expect(currentPosition(zones, new Date('2026-06-15T19:40:00Z'))).toEqual({
      state: 'in_zone',
      zone: 'transit',
    });
  });

  it('at or after arrival → arrived', () => {
    expect(currentPosition(zones, ARRIVAL)).toEqual({ state: 'arrived' });
    expect(currentPosition(zones, new Date('2026-06-15T21:00:00Z'))).toEqual({ state: 'arrived' });
  });
});

describe('shiftZones', () => {
  it('moves every boundary by the same amount (+15)', () => {
    const zones = buildZones(ARRIVAL, STANDARD);
    const shifted = shiftZones(zones, 15);

    expect(shifted[0]?.startsAt.toISOString()).toBe('2026-06-15T19:15:00.000Z');
    expect(shifted[3]?.endsAt.toISOString()).toBe('2026-06-15T20:15:00.000Z');
    // Durations unchanged
    for (let i = 0; i < zones.length; i++) {
      const before = zones[i]!.endsAt.getTime() - zones[i]!.startsAt.getTime();
      const after = shifted[i]!.endsAt.getTime() - shifted[i]!.startsAt.getTime();
      expect(after).toBe(before);
    }
  });

  it('does not mutate the input zones', () => {
    const zones = buildZones(ARRIVAL, STANDARD);
    const original = zones[0]!.startsAt.getTime();
    shiftZones(zones, 15);
    expect(zones[0]!.startsAt.getTime()).toBe(original);
  });
});
