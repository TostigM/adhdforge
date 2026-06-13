/**
 * calculate-schedule.test.ts — backward calculation
 */

import { describe, expect, it } from 'vitest';
import { calculateSchedule } from '../calculate-schedule';

const ARRIVAL = new Date('2026-06-15T20:00:00Z');

describe('calculateSchedule', () => {
  it('arrival − transit = departure; departure − zones = start', () => {
    const r = calculateSchedule({
      arrivalAt: ARRIVAL,
      transitMinutes: 30,
      gatherMinutes: 20,
      wrapUpMinutes: 15,
      doorMinutes: 10,
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // depart = 20:00 − 30 = 19:30
    expect(r.value.departAt.toISOString()).toBe('2026-06-15T19:30:00.000Z');
    // start = 19:30 − 10 − 20 − 15 = 18:45
    expect(r.value.startAt.toISOString()).toBe('2026-06-15T18:45:00.000Z');
    expect(r.value.arrivalAt.toISOString()).toBe(ARRIVAL.toISOString());
    expect(r.value.zones).toHaveLength(4);
  });

  it('applies defaults: wrap-up 15, gather 15, door 10', () => {
    const r = calculateSchedule({ arrivalAt: ARRIVAL, transitMinutes: 20 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 20:00 − 20 transit − 10 door − 15 gather − 15 wrap = 19:00
    expect(r.value.startAt.toISOString()).toBe('2026-06-15T19:00:00.000Z');
  });

  it('rejects an invalid arrival date', () => {
    const r = calculateSchedule({ arrivalAt: new Date('nonsense'), transitMinutes: 10 });
    expect(r).toMatchObject({ ok: false, error: 'invalid_input' });
  });

  it('rejects negative, fractional, and oversized transit', () => {
    for (const transitMinutes of [-5, 2.5, 24 * 60 + 1, Number.NaN]) {
      const r = calculateSchedule({ arrivalAt: ARRIVAL, transitMinutes });
      expect(r, `transit=${transitMinutes}`).toMatchObject({ ok: false, error: 'invalid_input' });
    }
  });

  it('accepts zero transit (arriving = being there)', () => {
    const r = calculateSchedule({ arrivalAt: ARRIVAL, transitMinutes: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.departAt.toISOString()).toBe(ARRIVAL.toISOString());
  });

  it('rejects zone lengths below 1 minute', () => {
    const r = calculateSchedule({ arrivalAt: ARRIVAL, transitMinutes: 10, gatherMinutes: 0 });
    expect(r).toMatchObject({ ok: false, error: 'invalid_input' });
  });
});
