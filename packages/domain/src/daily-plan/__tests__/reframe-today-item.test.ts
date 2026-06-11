/**
 * Unit tests: reframeTodayItem
 *
 * Covers:
 *   - Guards: task_not_found, forbidden
 *   - snooze: sets reframeSnoozedUntil to ~24h from now
 *   - lower: sets priorityLevel to 'low'
 *   - Neither action sets a "failed" or shame-based field
 *   - db_error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reframeTodayItem, SNOOZE_DURATION_MS } from '../reframe-today-item';
import { makeMockPrisma, makeTask } from '../../__test-utils__/mock-prisma';

const INPUT_BASE = { taskId: 'task_test_01', userId: 'user_test_01' };

describe('reframeTodayItem', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.task.findUnique.mockResolvedValue(
      makeTask({ id: 'task_test_01', userId: 'user_test_01' }),
    );
    db.task.update.mockResolvedValue({});
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("task_not_found") when task does not exist', async () => {
    db.task.findUnique.mockResolvedValue(null);
    const result = await reframeTodayItem(db, { ...INPUT_BASE, action: 'snooze' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_not_found');
  });

  it('returns err("forbidden") when userId does not match task owner', async () => {
    db.task.findUnique.mockResolvedValue(
      makeTask({ userId: 'another_user' }),
    );
    const result = await reframeTodayItem(db, { ...INPUT_BASE, action: 'lower' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  // ── Snooze ───────────────────────────────────────────────────────────────────

  it('sets reframeSnoozedUntil ~24 hours from now on snooze', async () => {
    const before = Date.now();
    await reframeTodayItem(db, { ...INPUT_BASE, action: 'snooze' });
    const after = Date.now();

    const call = db.task.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    const snoozedUntil = call.data.reframeSnoozedUntil as Date;

    expect(snoozedUntil).toBeInstanceOf(Date);
    // Should be within a ~1 second window of now + 24h
    expect(snoozedUntil.getTime()).toBeGreaterThanOrEqual(before + SNOOZE_DURATION_MS);
    expect(snoozedUntil.getTime()).toBeLessThanOrEqual(after + SNOOZE_DURATION_MS);
  });

  it('snooze does not change priorityLevel', async () => {
    await reframeTodayItem(db, { ...INPUT_BASE, action: 'snooze' });
    const call = db.task.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.priorityLevel).toBeUndefined();
  });

  it('returns ok on snooze', async () => {
    const result = await reframeTodayItem(db, { ...INPUT_BASE, action: 'snooze' });
    expect(result.ok).toBe(true);
  });

  // ── Lower ────────────────────────────────────────────────────────────────────

  it('sets priorityLevel to "low" on lower', async () => {
    await reframeTodayItem(db, { ...INPUT_BASE, action: 'lower' });
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priorityLevel: 'low' }) }),
    );
  });

  it('lower does not set reframeSnoozedUntil', async () => {
    await reframeTodayItem(db, { ...INPUT_BASE, action: 'lower' });
    const call = db.task.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.reframeSnoozedUntil).toBeUndefined();
  });

  it('returns ok on lower', async () => {
    const result = await reframeTodayItem(db, { ...INPUT_BASE, action: 'lower' });
    expect(result.ok).toBe(true);
  });

  // ── Soft-Track: no shame fields ──────────────────────────────────────────────

  it('never sets status to "failed"', async () => {
    await reframeTodayItem(db, { ...INPUT_BASE, action: 'lower' });
    const call = db.task.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.status).not.toBe('failed');
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  it('returns err("db_error") when update throws', async () => {
    db.task.update.mockRejectedValue(new Error('connection lost'));
    const result = await reframeTodayItem(db, { ...INPUT_BASE, action: 'snooze' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
