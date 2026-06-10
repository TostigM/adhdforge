/**
 * Unit tests: completeTodayItem
 *
 * Covers:
 *   - Guards: item_not_found, forbidden, item_not_in_today
 *   - Happy path: planItem → 'done', task → 'completed', event logged
 *   - Skips task update when task is already completed
 *   - bubble-up called after completion
 *   - Badge engine called (non-fatal)
 *   - db_error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeTodayItem } from '../complete-today-item';
import { makeMockPrisma, makePlanItem } from '../../__test-utils__/mock-prisma';

vi.mock('../_bubble-up', () => ({ bubbleUp: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../badges/check-and-award', () => ({
  checkAndAward: vi.fn().mockResolvedValue([]),
}));

const INPUT = { itemId: 'item_test_01', planId: 'plan_test_01', userId: 'user_test_01' };

describe('completeTodayItem', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.dailyPlanItem.findUnique.mockResolvedValue(makePlanItem());
    db.dailyPlanItem.update.mockResolvedValue({});
    db.task.update.mockResolvedValue({});
    db.event.create.mockResolvedValue({});
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("item_not_found") when item does not exist', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue(null);
    const result = await completeTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('item_not_found');
  });

  it('returns err("forbidden") when userId does not match plan owner', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue(
      makePlanItem({ dailyPlan: { id: 'plan_test_01', userId: 'another_user', visibleSlots: 3 } }),
    );
    const result = await completeTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns err("item_not_in_today") when slotState is not "today"', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue(makePlanItem({ slotState: 'queue' }));
    const result = await completeTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('item_not_in_today');
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it('marks planItem slotState as "done"', async () => {
    await completeTodayItem(db, INPUT);
    expect(db.dailyPlanItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slotState: 'done' }) }),
    );
  });

  it('sets completedAt on the planItem', async () => {
    await completeTodayItem(db, INPUT);
    const call = db.dailyPlanItem.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.completedAt).toBeInstanceOf(Date);
  });

  it('updates the underlying task to "completed"', async () => {
    await completeTodayItem(db, INPUT);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    );
  });

  it('logs a task.completed event', async () => {
    await completeTodayItem(db, INPUT);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'task.completed', userId: INPUT.userId }),
      }),
    );
  });

  it('calls bubbleUp to refill the freed slot', async () => {
    const { bubbleUp } = await import('../_bubble-up');
    await completeTodayItem(db, INPUT);
    expect(bubbleUp).toHaveBeenCalledWith(db, INPUT.planId, INPUT.userId, 3);
  });

  it('returns ok(undefined) on success', async () => {
    const result = await completeTodayItem(db, INPUT);
    expect(result.ok).toBe(true);
  });

  // ── Already-completed task ───────────────────────────────────────────────────

  it('skips task update when task is already completed', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue(
      makePlanItem({ task: { id: 'task_test_01', status: 'completed', priorityKind: 'flexible', priorityLevel: 'med', todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
    );
    await completeTodayItem(db, INPUT);
    expect(db.task.update).not.toHaveBeenCalled();
    expect(db.event.create).not.toHaveBeenCalled();
  });

  // ── Soft-Track: no "failed" status ──────────────────────────────────────────

  it('never sets task status to "failed"', async () => {
    await completeTodayItem(db, INPUT);
    const call = db.task.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.status).not.toBe('failed');
  });

  // ── Non-fatal badge engine ───────────────────────────────────────────────────

  it('does not throw when badge engine fails', async () => {
    const { checkAndAward } = await import('../../badges/check-and-award');
    vi.mocked(checkAndAward).mockRejectedValueOnce(new Error('badge explosion'));
    await expect(completeTodayItem(db, INPUT)).resolves.toBeDefined();
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  it('returns err("db_error") when a DB call throws', async () => {
    db.dailyPlanItem.update.mockRejectedValue(new Error('connection lost'));
    const result = await completeTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
