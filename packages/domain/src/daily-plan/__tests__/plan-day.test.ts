/**
 * plan-day.test.ts — workday boundary math
 *
 * The plan day rolls over at midnight America/Los_Angeles, not midnight UTC.
 * 2026 DST facts used below: PDT (UTC-7) begins March 8, PST (UTC-8) returns
 * November 1 — both at 2:00 AM local.
 */

import { describe, expect, it } from 'vitest';
import { getPlanDate, getPlanDayWindow, WORKDAY_TIMEZONE } from '../plan-day';

describe('WORKDAY_TIMEZONE', () => {
  it('is America/Los_Angeles until the M15.3 per-user preference lands', () => {
    expect(WORKDAY_TIMEZONE).toBe('America/Los_Angeles');
  });
});

describe('getPlanDate', () => {
  it('returns UTC midnight of the Pacific calendar date', () => {
    // 3 PM UTC = 8 AM PDT on the same calendar date
    const planDate = getPlanDate(new Date('2026-06-10T15:00:00Z'));
    expect(planDate.toISOString()).toBe('2026-06-10T00:00:00.000Z');
  });

  it('stays on the previous day during the Pacific evening (the original bug)', () => {
    // 05:30 UTC June 10 = 10:30 PM PDT June 9 — still June 9 for the user
    const planDate = getPlanDate(new Date('2026-06-10T05:30:00Z'));
    expect(planDate.toISOString()).toBe('2026-06-09T00:00:00.000Z');
  });

  it('rolls over exactly at Pacific midnight (PDT)', () => {
    const before = getPlanDate(new Date('2026-06-10T06:59:59Z')); // 11:59:59 PM PDT June 9
    const after = getPlanDate(new Date('2026-06-10T07:00:00Z')); // 12:00:00 AM PDT June 10
    expect(before.toISOString()).toBe('2026-06-09T00:00:00.000Z');
    expect(after.toISOString()).toBe('2026-06-10T00:00:00.000Z');
  });

  it('rolls over exactly at Pacific midnight (PST, winter)', () => {
    const before = getPlanDate(new Date('2026-01-15T07:59:59Z')); // 11:59:59 PM PST Jan 14
    const after = getPlanDate(new Date('2026-01-15T08:00:00Z')); // 12:00:00 AM PST Jan 15
    expect(before.toISOString()).toBe('2026-01-14T00:00:00.000Z');
    expect(after.toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
});

describe('getPlanDayWindow', () => {
  it('returns the real Pacific midnight-to-midnight instants (PDT)', () => {
    const { dayStart, dayEnd } = getPlanDayWindow(new Date('2026-06-10T00:00:00Z'));
    expect(dayStart.toISOString()).toBe('2026-06-10T07:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-06-11T07:00:00.000Z');
  });

  it('returns the real Pacific midnight-to-midnight instants (PST)', () => {
    const { dayStart, dayEnd } = getPlanDayWindow(new Date('2026-01-15T00:00:00Z'));
    expect(dayStart.toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-01-16T08:00:00.000Z');
  });

  it('spring-forward day is 23 hours long', () => {
    // March 8, 2026: clocks jump 2:00 → 3:00 AM PDT
    const { dayStart, dayEnd } = getPlanDayWindow(new Date('2026-03-08T00:00:00Z'));
    expect(dayStart.toISOString()).toBe('2026-03-08T08:00:00.000Z'); // midnight PST
    expect(dayEnd.toISOString()).toBe('2026-03-09T07:00:00.000Z'); // midnight PDT
    expect(dayEnd.getTime() - dayStart.getTime()).toBe(23 * 3_600_000);
  });

  it('fall-back day is 25 hours long', () => {
    // November 1, 2026: clocks fall 2:00 → 1:00 AM PST
    const { dayStart, dayEnd } = getPlanDayWindow(new Date('2026-11-01T00:00:00Z'));
    expect(dayStart.toISOString()).toBe('2026-11-01T07:00:00.000Z'); // midnight PDT
    expect(dayEnd.toISOString()).toBe('2026-11-02T08:00:00.000Z'); // midnight PST
    expect(dayEnd.getTime() - dayStart.getTime()).toBe(25 * 3_600_000);
  });

  it('an evening anchor falls inside its own day window (the seedAnchors case)', () => {
    // 9 PM PDT June 10 = 2026-06-11T04:00:00Z — outside the UTC day of the
    // label, inside the Pacific day window. This is exactly what the old
    // UTC-window code got wrong.
    const eveningAnchor = new Date('2026-06-11T04:00:00Z');
    const { dayStart, dayEnd } = getPlanDayWindow(new Date('2026-06-10T00:00:00Z'));
    expect(eveningAnchor.getTime()).toBeGreaterThanOrEqual(dayStart.getTime());
    expect(eveningAnchor.getTime()).toBeLessThan(dayEnd.getTime());
  });

  it('label and window are consistent: any instant maps to a window containing it', () => {
    const samples = [
      '2026-06-10T05:30:00Z', // PDT evening
      '2026-06-10T15:00:00Z', // PDT morning
      '2026-01-15T08:00:00Z', // PST midnight exactly
      '2026-03-08T09:59:00Z', // during the spring-forward gap hour
      '2026-11-01T08:30:00Z', // during the repeated fall-back hour
    ];
    for (const iso of samples) {
      const now = new Date(iso);
      const { dayStart, dayEnd } = getPlanDayWindow(getPlanDate(now));
      expect(now.getTime(), `${iso} >= dayStart`).toBeGreaterThanOrEqual(dayStart.getTime());
      expect(now.getTime(), `${iso} < dayEnd`).toBeLessThan(dayEnd.getTime());
    }
  });
});
