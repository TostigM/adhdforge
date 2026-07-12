/**
 * Unit tests: resetDailyItems + resetOnDepartureItems.
 * The lazy/cron reset must only touch daily items checked before the boundary,
 * and must be idempotent (filter excludes already-unchecked rows by design).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';
import { resetDailyItems, resetOnDepartureItems } from '../reset-launchpad';

// 2026-07-08 15:00 PDT → boundary 2026-07-08T11:00Z
const NOW = new Date('2026-07-08T22:00:00Z');
const BOUNDARY = new Date('2026-07-08T11:00:00.000Z');

describe('resetDailyItems', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.launchpadItem.updateMany.mockResolvedValue({ count: 2 });
  });

  it('unchecks only daily items checked before the boundary (scoped to the user)', async () => {
    const result = await resetDailyItems(db, { userId: 'user_1', now: NOW });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.reset).toBe(2);
    expect(db.launchpadItem.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user_1',
        resetSchedule: 'daily',
        isChecked: true,
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: BOUNDARY } }],
      },
      data: { isChecked: false },
    });
  });

  it('omitting userId sweeps ALL users (the cron backstop)', async () => {
    await resetDailyItems(db, { now: NOW });
    const call = db.launchpadItem.updateMany.mock.calls[0]?.[0];
    expect(call?.where.userId).toBeUndefined();
    expect(call?.where.resetSchedule).toBe('daily');
  });

  it('returns db_error (never throws) when the write fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    db.launchpadItem.updateMany.mockRejectedValue(new Error('boom'));

    const result = await resetDailyItems(db, { userId: 'user_1', now: NOW });
    expect(result).toMatchObject({ ok: false, error: 'db_error' });
    spy.mockRestore();
  });
});

describe('resetOnDepartureItems', () => {
  it('unchecks only on_departure items for the user', async () => {
    const db = makeMockPrisma();
    db.launchpadItem.updateMany.mockResolvedValue({ count: 1 });

    const result = await resetOnDepartureItems(db, 'user_1');

    expect(result.ok).toBe(true);
    expect(db.launchpadItem.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user_1', resetSchedule: 'on_departure', isChecked: true },
      data: { isChecked: false },
    });
  });
});
