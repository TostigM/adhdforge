/**
 * Unit tests: addToTodayPlan
 *
 * Covers:
 *   - Guards: plan_not_found, task_not_found, forbidden (plan or task userId mismatch),
 *     already_in_plan
 *   - Slot routing: slotState = 'today' when slots available, 'queue' when full
 *   - Position: end of the target state's list
 *   - source stored correctly ('ritual' | 'manual')
 *   - Returns { itemId, slotState } on success
 *   - db_error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addToTodayPlan } from '../add-to-today-plan';
import { makeMockPrisma, makeDailyPlan, makeTask } from '../../__test-utils__/mock-prisma';

const INPUT = {
  planId: 'plan_test_01',
  taskId: 'task_test_01',
  userId: 'user_test_01',
  source: 'ritual' as const,
};

describe('addToTodayPlan', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    // Default: plan + task exist, belong to same user, not already in plan, 1 of 3 slots used
    db.dailyPlan.findUnique.mockResolvedValue(
      makeDailyPlan({ id: 'plan_test_01', userId: 'user_test_01', visibleSlots: 3 }),
    );
    db.task.findUnique.mockResolvedValue(
      makeTask({ id: 'task_test_01', userId: 'user_test_01' }),
    );
    db.dailyPlanItem.findUnique.mockResolvedValue(null); // not already in plan
    db.dailyPlanItem.count.mockResolvedValue(1); // 1 of 3 slots used
    db.dailyPlanItem.aggregate.mockResolvedValue({ _max: { position: 0 } });
    db.dailyPlanItem.create.mockResolvedValue({ id: 'item_new_01' });
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("plan_not_found") when plan does not exist', async () => {
    db.dailyPlan.findUnique.mockResolvedValue(null);
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('plan_not_found');
  });

  it('returns err("task_not_found") when task does not exist', async () => {
    db.task.findUnique.mockResolvedValue(null);
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_not_found');
  });

  it('returns err("forbidden") when plan userId does not match', async () => {
    db.dailyPlan.findUnique.mockResolvedValue(
      makeDailyPlan({ userId: 'another_user' }),
    );
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns err("forbidden") when task userId does not match', async () => {
    db.task.findUnique.mockResolvedValue(
      makeTask({ userId: 'another_user' }),
    );
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns err("already_in_plan") when task is already in the plan', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue({ id: 'item_existing' });
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('already_in_plan');
  });

  // ── Slot routing ─────────────────────────────────────────────────────────────

  it('creates item with slotState "today" when slots are available', async () => {
    db.dailyPlanItem.count.mockResolvedValue(1); // 1 of 3 used
    await addToTodayPlan(db, INPUT);
    expect(db.dailyPlanItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slotState: 'today' }) }),
    );
  });

  it('creates item with slotState "queue" when all slots are full', async () => {
    db.dailyPlanItem.count.mockResolvedValue(3); // 3 of 3 used
    await addToTodayPlan(db, INPUT);
    expect(db.dailyPlanItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slotState: 'queue' }) }),
    );
  });

  it('returns slotState "today" in the result when slot available', async () => {
    db.dailyPlanItem.count.mockResolvedValue(0);
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.slotState).toBe('today');
  });

  it('returns slotState "queue" in the result when slots full', async () => {
    db.dailyPlanItem.count.mockResolvedValue(3);
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.slotState).toBe('queue');
  });

  // ── Position ─────────────────────────────────────────────────────────────────

  it('places item after the last existing item in the target state (max + 1)', async () => {
    db.dailyPlanItem.aggregate.mockResolvedValue({ _max: { position: 4 } });
    await addToTodayPlan(db, INPUT);
    expect(db.dailyPlanItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 5 }) }),
    );
  });

  it('places item at position 0 when target state is empty', async () => {
    db.dailyPlanItem.aggregate.mockResolvedValue({ _max: { position: null } });
    await addToTodayPlan(db, INPUT);
    expect(db.dailyPlanItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ position: 0 }) }),
    );
  });

  // ── Source ───────────────────────────────────────────────────────────────────

  it('stores the source field on the created item', async () => {
    await addToTodayPlan(db, { ...INPUT, source: 'manual' });
    expect(db.dailyPlanItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ source: 'manual' }) }),
    );
  });

  // ── Return value ─────────────────────────────────────────────────────────────

  it('returns the new itemId from the created record', async () => {
    db.dailyPlanItem.create.mockResolvedValue({ id: 'item_new_99' });
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.itemId).toBe('item_new_99');
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  it('returns err("db_error") when a DB call throws', async () => {
    db.dailyPlanItem.create.mockRejectedValue(new Error('deadlock'));
    const result = await addToTodayPlan(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
