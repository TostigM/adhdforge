/**
 * Unit tests: getQuotaWindow — the 04:00 UTC quota day + reset.
 */

import { describe, it, expect } from 'vitest';
import { getQuotaWindow } from '../quota-window';

describe('getQuotaWindow', () => {
  it('rolls the quota day at exactly 04:00 UTC', () => {
    // 03:59 UTC still belongs to the previous quota day
    const before = getQuotaWindow(new Date('2026-06-08T03:59:00Z'));
    expect(before.quotaDayStr).toBe('2026-06-07');

    // 04:00 UTC starts the new quota day
    const at = getQuotaWindow(new Date('2026-06-08T04:00:00Z'));
    expect(at.quotaDayStr).toBe('2026-06-08');

    const after = getQuotaWindow(new Date('2026-06-08T04:01:00Z'));
    expect(after.quotaDayStr).toBe('2026-06-08');
  });

  it('computes the next reset as the next 04:00 UTC', () => {
    const w = getQuotaWindow(new Date('2026-06-08T10:00:00Z'));
    expect(w.quotaDayStr).toBe('2026-06-08');
    expect(w.resetsAtUtc.toISOString()).toBe('2026-06-09T04:00:00.000Z');
  });

  it('reset is later the same UTC calendar day when before 04:00', () => {
    const w = getQuotaWindow(new Date('2026-06-08T02:00:00Z'));
    expect(w.quotaDayStr).toBe('2026-06-07');
    expect(w.resetsAtUtc.toISOString()).toBe('2026-06-08T04:00:00.000Z');
  });

  it('handles month boundaries', () => {
    const w = getQuotaWindow(new Date('2026-07-01T02:00:00Z'));
    expect(w.quotaDayStr).toBe('2026-06-30');
    expect(w.resetsAtUtc.toISOString()).toBe('2026-07-01T04:00:00.000Z');
  });
});
