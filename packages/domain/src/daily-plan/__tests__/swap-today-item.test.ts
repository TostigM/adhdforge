/**
 * Unit tests: swapTodayItem
 *
 * Covers:
 *   - Guards: item_not_found, forbidden, item_not_in_today, cannot_swap_anchor
 *   - Happy path: item → queue, swap counter incremented, bubbleUp called
 *   - Gentle Reframe card trigger conditions:
 *       showReframeCard = true when count >= threshold AND not offered AND not snoozed
 *       showReframeCard = false when below threshold
 *       showReframeCard = false when reframeOfferedAt already set (fire-once)
 *       showReframeCard = false when snoozed (reframeSnoozedUntil in future)
 *       showReframeCard = false for 'low' priority
 *       showReframeCard = false for 'cant_miss' priority
 *   - reframeOfferedAt written when card fires (fire-once enforcement)
 *   - Custom threshold respected
 *   - db_error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { swapTodayItem } from '../swap-today-item';
import { makeMockPrisma, makePlanItem } from '../../__test-utils__/mock-prisma';

vi.mock('../_bubble-up', () => ({ bubbleUp: vi.fn().mockResolvedValue(undefined) }));

const INPUT = { itemId: 'item_test_01', planId: 'plan_test_01', userId: 'user_test_01' };

/** Task shape returned after the swap-counter increment */
function makeUpdatedTask(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    todaySwapCount: 1,
    priorityLevel: 'med',
    reframeOfferedAt: null,
    reframeSnoozedUntil: null,
    ...overrides,
  };
}

describe('swapTodayItem', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.dailyPlanItem.findUnique.mockResolvedValue(makePlanItem());
    db.dailyPlanItem.aggregate.mockResolvedValue({ _max: { position: 2 } });
    db.dailyPlanItem.update.mockResolvedValue({});
    db.task.update.mockResolvedValue(makeUpdatedTask());
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("item_not_found") when item does not exist', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue(null);
    const result = await swapTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('item_not_found');
  });

  it('returns err("forbidden") when userId does not match plan owner', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue(
      makePlanItem({ dailyPlan: { id: 'plan_test_01', userId: 'another_user', visibleSlots: 3 } }),
    );
    const result = await swapTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns err("item_not_in_today") when slotState is not "today"', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue(makePlanItem({ slotState: 'done' }));
    const result = await swapTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('item_not_in_today');
  });

  it('returns err("cannot_swap_anchor") for anchor tasks', async () => {
    db.dailyPlanItem.findUnique.mockResolvedValue(
      makePlanItem({ task: { id: 'task_test_01', status: 'active', priorityKind: 'anchor', priorityLevel: 'cant_miss', todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
    );
    const result = await swapTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('cannot_swap_anchor');
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it('moves item to queue state', async () => {
    await swapTodayItem(db, INPUT);
    expect(db.dailyPlanItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slotState: 'queue' }) }),
    );
  });

  it('increments the task swap counter', async () => {
    await swapTodayItem(db, INPUT);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ todaySwapCount: { increment: 1 } }),
      }),
    );
  });

  it('calls bubbleUp to fill the freed slot', async () => {
    const { bubbleUp } = await import('../_bubble-up');
    await swapTodayItem(db, INPUT);
    expect(bubbleUp).toHaveBeenCalledWith(db, INPUT.planId, INPUT.userId, 3);
  });

  it('returns ok({ showReframeCard: false }) by default', async () => {
    const result = await swapTodayItem(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.showReframeCard).toBe(false);
  });

  // ── Gentle Reframe card ──────────────────────────────────────────────────────

  it('showReframeCard = true when swap count hits default threshold (4)', async () => {
    db.task.update.mockResolvedValue(makeUpdatedTask({ todaySwapCount: 4 }));
    const result = await swapTodayItem(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.showReframeCard).toBe(true);
  });

  it('showReframeCard = false when below threshold', async () => {
    db.task.update.mockResolvedValue(makeUpdatedTask({ todaySwapCount: 3 }));
    const result = await swapTodayItem(db, INPUT);
    if (result.ok) expect(result.value.showReframeCard).toBe(false);
  });

  it('showReframeCard = false when reframeOfferedAt is already set (fire-once)', async () => {
    db.task.update.mockResolvedValue(
      makeUpdatedTask({ todaySwapCount: 5, reframeOfferedAt: new Date('2026-01-01T08:00:00Z') }),
    );
    const result = await swapTodayItem(db, INPUT);
    if (result.ok) expect(result.value.showReframeCard).toBe(false);
  });

  it('showReframeCard = false when snoozed until a future time', async () => {
    const future = new Date(Date.now() + 3_600_000); // 1 hour from now
    db.task.update.mockResolvedValue(
      makeUpdatedTask({ todaySwapCount: 5, reframeSnoozedUntil: future }),
    );
    const result = await swapTodayItem(db, INPUT);
    if (result.ok) expect(result.value.showReframeCard).toBe(false);
  });

  it('showReframeCard = false for "low" priority tasks', async () => {
    db.task.update.mockResolvedValue(makeUpdatedTask({ todaySwapCount: 5, priorityLevel: 'low' }));
    const result = await swapTodayItem(db, INPUT);
    if (result.ok) expect(result.value.showReframeCard).toBe(false);
  });

  it('showReframeCard = false for "cant_miss" priority tasks', async () => {
    db.task.update.mockResolvedValue(makeUpdatedTask({ todaySwapCount: 5, priorityLevel: 'cant_miss' }));
    const result = await swapTodayItem(db, INPUT);
    if (result.ok) expect(result.value.showReframeCard).toBe(false);
  });

  it('respects a custom gentleReframeThreshold', async () => {
    db.task.update.mockResolvedValue(makeUpdatedTask({ todaySwapCount: 3 }));
    const result = await swapTodayItem(db, { ...INPUT, gentleReframeThreshold: 3 });
    if (result.ok) expect(result.value.showReframeCard).toBe(true);
  });

  it('writes reframeOfferedAt when showReframeCard fires (fire-once enforcement)', async () => {
    db.task.update
      .mockResolvedValueOnce(makeUpdatedTask({ todaySwapCount: 4 })) // swap counter call
      .mockResolvedValueOnce({}); // reframeOfferedAt write call
    await swapTodayItem(db, INPUT);
    // Second task.update call should set reframeOfferedAt
    const secondCall = db.task.update.mock.calls[1]?.[0] as { data: Record<string, unknown> } | undefined;
    expect(secondCall?.data.reframeOfferedAt).toBeInstanceOf(Date);
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  it('returns err("db_error") when a DB call throws', async () => {
    db.dailyPlanItem.update.mockRejectedValue(new Error('lock timeout'));
    const result = await swapTodayItem(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
