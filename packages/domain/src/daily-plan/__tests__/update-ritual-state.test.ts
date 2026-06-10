/**
 * Unit tests: updateRitualState
 *
 * Covers:
 *   - Guards: plan_not_found, forbidden
 *   - complete action: ritualState → 'completed', ritualCompletedAt set
 *   - skip action: ritualState → 'skipped', ritualCompletedAt NOT set
 *   - db_error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateRitualState } from '../update-ritual-state';
import { makeMockPrisma, makeDailyPlan } from '../../__test-utils__/mock-prisma';

describe('updateRitualState', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.dailyPlan.findUnique.mockResolvedValue(
      makeDailyPlan({ id: 'plan_test_01', userId: 'user_test_01' }),
    );
    db.dailyPlan.update.mockResolvedValue({});
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("plan_not_found") when plan does not exist', async () => {
    db.dailyPlan.findUnique.mockResolvedValue(null);
    const result = await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'complete' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('plan_not_found');
  });

  it('returns err("forbidden") when userId does not match plan owner', async () => {
    db.dailyPlan.findUnique.mockResolvedValue(
      makeDailyPlan({ userId: 'another_user' }),
    );
    const result = await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'complete' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  // ── Complete action ──────────────────────────────────────────────────────────

  it('sets ritualState to "completed" when action is "complete"', async () => {
    await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'complete' });
    expect(db.dailyPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ritualState: 'completed' }) }),
    );
  });

  it('sets ritualCompletedAt to a Date when action is "complete"', async () => {
    await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'complete' });
    const call = db.dailyPlan.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.ritualCompletedAt).toBeInstanceOf(Date);
  });

  it('returns ok on complete', async () => {
    const result = await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'complete' });
    expect(result.ok).toBe(true);
  });

  // ── Skip action ──────────────────────────────────────────────────────────────

  it('sets ritualState to "skipped" when action is "skip"', async () => {
    await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'skip' });
    expect(db.dailyPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ritualState: 'skipped' }) }),
    );
  });

  it('does NOT set ritualCompletedAt when action is "skip"', async () => {
    await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'skip' });
    const call = db.dailyPlan.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.ritualCompletedAt).toBeUndefined();
  });

  it('returns ok on skip', async () => {
    const result = await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'skip' });
    expect(result.ok).toBe(true);
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  it('returns err("db_error") when update throws', async () => {
    db.dailyPlan.update.mockRejectedValue(new Error('connection error'));
    const result = await updateRitualState(db, { planId: 'plan_test_01', userId: 'user_test_01', action: 'complete' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
