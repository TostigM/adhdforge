/**
 * Unit tests: lastResetBoundary — the 04:00 workday-time reset line.
 * PDT = UTC-7 → 04:00 local = 11:00 UTC. PST = UTC-8 → 04:00 local = 12:00 UTC.
 */

import { describe, expect, it } from 'vitest';
import { lastResetBoundary } from '../reset-boundary';

describe('lastResetBoundary', () => {
  it('afternoon local → today 04:00 local (PDT)', () => {
    // 2026-07-08 15:00 PDT = 22:00 UTC
    const now = new Date('2026-07-08T22:00:00Z');
    expect(lastResetBoundary(now).toISOString()).toBe('2026-07-08T11:00:00.000Z');
  });

  it('2 AM local (before the boundary) → YESTERDAY 04:00 local', () => {
    // 2026-07-08 02:00 PDT = 09:00 UTC
    const now = new Date('2026-07-08T09:00:00Z');
    expect(lastResetBoundary(now).toISOString()).toBe('2026-07-07T11:00:00.000Z');
  });

  it('exactly 04:00 local → that same instant', () => {
    const now = new Date('2026-07-08T11:00:00.000Z'); // 04:00 PDT
    expect(lastResetBoundary(now).toISOString()).toBe('2026-07-08T11:00:00.000Z');
  });

  it('one second before 04:00 local → yesterday', () => {
    const now = new Date('2026-07-08T10:59:59.000Z'); // 03:59:59 PDT
    expect(lastResetBoundary(now).toISOString()).toBe('2026-07-07T11:00:00.000Z');
  });

  it('winter (PST) → 04:00 local is 12:00 UTC', () => {
    // 2026-01-15 08:00 PST = 16:00 UTC
    const now = new Date('2026-01-15T16:00:00Z');
    expect(lastResetBoundary(now).toISOString()).toBe('2026-01-15T12:00:00.000Z');
  });

  it('late-night UTC spillover: 10 PM local is the NEXT calendar day in UTC', () => {
    // 2026-07-08 22:30 PDT = 2026-07-09T05:30Z — boundary is still July 8's 04:00
    const now = new Date('2026-07-09T05:30:00Z');
    expect(lastResetBoundary(now).toISOString()).toBe('2026-07-08T11:00:00.000Z');
  });

  it('spring-forward day (2026-03-08): after the jump, boundary is that day 04:00 PDT', () => {
    // 2026-03-08 08:00 PDT = 15:00 UTC. Clocks jumped 02:00→03:00; 04:00 existed (PDT).
    const now = new Date('2026-03-08T15:00:00Z');
    expect(lastResetBoundary(now).toISOString()).toBe('2026-03-08T11:00:00.000Z');
  });

  it('fall-back day (2026-11-01): after the repeat hour, boundary is that day 04:00 PST', () => {
    // 2026-11-01 08:00 PST = 16:00 UTC. 04:00 local that day is PST → 12:00 UTC.
    const now = new Date('2026-11-01T16:00:00Z');
    expect(lastResetBoundary(now).toISOString()).toBe('2026-11-01T12:00:00.000Z');
  });

  it('before 04:00 on the day AFTER fall-back reaches back across the transition', () => {
    // 2026-11-02 03:00 PST = 11:00 UTC → boundary = Nov 1 04:00 PST = 12:00 UTC
    const now = new Date('2026-11-02T11:00:00Z');
    expect(lastResetBoundary(now).toISOString()).toBe('2026-11-01T12:00:00.000Z');
  });
});
