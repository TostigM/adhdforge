/**
 * Unit tests: getTodayView
 *
 * Covers:
 *   - Splits items: anchors go to scheduledAnchors, flex goes to todayItems
 *   - todayItems only includes flex items with slotState='today'
 *   - scheduledAnchors includes ALL anchor items (any slotState), sorted by scheduledFor
 *   - Doorknob window: isActive = true when within 30 min of scheduledFor
 *   - Doorknob window: isActive = false when scheduledFor is far future
 *   - Doorknob window: isActive = false when item isDone
 *   - queueCount only counts flex items in slotState='queue'
 *   - doneCount counts ALL items in slotState='done'
 *   - showReframeCard logic (threshold, offered, snoozed, priority exemptions)
 *   - ritualSuggestions returned when ritual is 'pending'
 *   - ritualSuggestions empty when ritual is 'completed' or 'skipped'
 *   - activeAnchorCount = number of active anchors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTodayView, DOORKNOB_MINUTES } from '../get-today-view';
import { makeMockPrisma, makeDailyPlan } from '../../__test-utils__/mock-prisma';

const PLAN_ID = 'plan_test_01';
const USER_ID = 'user_test_01';

/** An anchor task item shape (as returned by dailyPlanItem.findMany) */
function makeItemShape(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'item_01',
    slotState: 'today',
    position: 0,
    source: 'bubble',
    task: {
      id: 'task_01',
      rawText: 'Do something',
      title: null,
      priorityKind: 'flexible',
      priorityLevel: 'med',
      scheduledFor: null,
      estimatedMinutes: null,
      todaySwapCount: 0,
      reframeOfferedAt: null,
      reframeSnoozedUntil: null,
    },
    ...overrides,
  };
}

describe('getTodayView', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.dailyPlan.findUniqueOrThrow.mockResolvedValue(
      makeDailyPlan({ id: PLAN_ID, userId: USER_ID, visibleSlots: 3, ritualState: 'completed' }),
    );
    db.dailyPlanItem.findMany.mockResolvedValue([]);
    db.task.findMany.mockResolvedValue([]);
    // Queue is now backlog-based (db.task.count + db.task.findMany).
    db.task.count.mockResolvedValue(0);
  });

  // ── Item splitting ────────────────────────────────────────────────────────────

  it('puts anchor items in scheduledAnchors, not todayItems', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ task: { id: 't1', rawText: 'Meeting', title: 'Standup', priorityKind: 'anchor', priorityLevel: 'cant_miss', scheduledFor: new Date('2026-01-01T14:00:00Z'), estimatedMinutes: 30, todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.scheduledAnchors).toHaveLength(1);
    expect(view.todayItems).toHaveLength(0);
  });

  it('puts flexible "today" items in todayItems', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ slotState: 'today' }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.todayItems).toHaveLength(1);
    expect(view.scheduledAnchors).toHaveLength(0);
  });

  it('excludes flexible queue items from todayItems', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ slotState: 'today' }),
      makeItemShape({ id: 'item_02', slotState: 'queue' }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.todayItems).toHaveLength(1);
    expect(view.todayItems[0]?.itemId).toBe('item_01');
  });

  // ── Doorknob window ───────────────────────────────────────────────────────────

  it(`isActive = true when scheduledFor is within ${DOORKNOB_MINUTES} min`, async () => {
    const nearFuture = new Date(Date.now() + (DOORKNOB_MINUTES - 5) * 60_000);
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({
        task: { id: 't1', rawText: 'Meet', title: null, priorityKind: 'anchor', priorityLevel: 'high', scheduledFor: nearFuture, estimatedMinutes: null, todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null },
      }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.scheduledAnchors[0]?.isActive).toBe(true);
  });

  it('isActive = false when scheduledFor is far in the future', async () => {
    const farFuture = new Date(Date.now() + 4 * 3_600_000); // 4 hours away
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({
        task: { id: 't1', rawText: 'Meet', title: null, priorityKind: 'anchor', priorityLevel: 'high', scheduledFor: farFuture, estimatedMinutes: null, todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null },
      }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.scheduledAnchors[0]?.isActive).toBe(false);
  });

  it('isActive = false when anchor is done (even if within window)', async () => {
    const justPassed = new Date(Date.now() - 5 * 60_000);
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({
        slotState: 'done',
        task: { id: 't1', rawText: 'Meet', title: null, priorityKind: 'anchor', priorityLevel: 'high', scheduledFor: justPassed, estimatedMinutes: null, todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null },
      }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.scheduledAnchors[0]?.isActive).toBe(false);
  });

  // ── Counts ────────────────────────────────────────────────────────────────────

  it('queueCount is the backlog count (active flexible tasks not in a today slot)', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([makeItemShape({ slotState: 'today' })]);
    db.task.count.mockResolvedValue(2);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.queueCount).toBe(2);
    // The backlog query excludes the current today-card tasks and anchors.
    const where = db.task.count.mock.calls[0]?.[0].where as Record<string, unknown>;
    expect(where.priorityKind).toBe('flexible');
    expect(where.status).toBe('active');
  });

  it('doneCount counts ALL items in slotState="done" (flex + anchor)', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ slotState: 'done' }),
      makeItemShape({ id: 'item_02', slotState: 'done', task: { id: 't_anchor', rawText: 'Meet', title: null, priorityKind: 'anchor', priorityLevel: 'cant_miss', scheduledFor: null, estimatedMinutes: null, todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
      makeItemShape({ id: 'item_03', slotState: 'today' }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.doneCount).toBe(2);
  });

  it('activeAnchorCount reflects anchors within the doorknob window', async () => {
    const soon = new Date(Date.now() + 10 * 60_000);
    const later = new Date(Date.now() + 4 * 3_600_000);
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ id: 'a1', task: { id: 't1', rawText: 'Soon', title: null, priorityKind: 'anchor', priorityLevel: 'high', scheduledFor: soon, estimatedMinutes: null, todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
      makeItemShape({ id: 'a2', task: { id: 't2', rawText: 'Later', title: null, priorityKind: 'anchor', priorityLevel: 'high', scheduledFor: later, estimatedMinutes: null, todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.activeAnchorCount).toBe(1);
  });

  // ── showReframeCard ───────────────────────────────────────────────────────────

  it('showReframeCard = true when swap count >= threshold and not yet offered', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ task: { id: 't1', rawText: 'x', title: null, priorityKind: 'flexible', priorityLevel: 'high', scheduledFor: null, estimatedMinutes: null, todaySwapCount: 4, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.todayItems[0]?.showReframeCard).toBe(true);
  });

  it('showReframeCard = false when reframeOfferedAt is set', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ task: { id: 't1', rawText: 'x', title: null, priorityKind: 'flexible', priorityLevel: 'high', scheduledFor: null, estimatedMinutes: null, todaySwapCount: 5, reframeOfferedAt: new Date(), reframeSnoozedUntil: null } }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.todayItems[0]?.showReframeCard).toBe(false);
  });

  it('showReframeCard = false for "low" priority', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ task: { id: 't1', rawText: 'x', title: null, priorityKind: 'flexible', priorityLevel: 'low', scheduledFor: null, estimatedMinutes: null, todaySwapCount: 10, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.todayItems[0]?.showReframeCard).toBe(false);
  });

  // ── Ritual suggestions ────────────────────────────────────────────────────────

  it('returns ritualSuggestions when ritual is pending', async () => {
    db.dailyPlan.findUniqueOrThrow.mockResolvedValue(
      makeDailyPlan({ ritualState: 'pending' }),
    );
    db.task.findMany.mockResolvedValue([
      { id: 'sug_01', rawText: 'Suggested task', title: null, priorityKind: 'flexible', priorityLevel: 'high', scheduledFor: null },
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.ritualSuggestions).toHaveLength(1);
    expect(view.ritualSuggestions[0]?.taskId).toBe('sug_01');
  });

  it('returns empty ritualSuggestions when ritual is completed', async () => {
    db.dailyPlan.findUniqueOrThrow.mockResolvedValue(
      makeDailyPlan({ ritualState: 'completed' }),
    );

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.ritualSuggestions).toHaveLength(0);
    // (db.task.findMany still runs for the backlog query — only the ritual
    // suggestions branch is skipped when the ritual isn't pending.)
  });

  it('returns empty ritualSuggestions when ritual is skipped', async () => {
    db.dailyPlan.findUniqueOrThrow.mockResolvedValue(
      makeDailyPlan({ ritualState: 'skipped' }),
    );

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.ritualSuggestions).toHaveLength(0);
  });

  // ── Passthrough of visibleSlots ───────────────────────────────────────────────

  it('returns the plan visibleSlots value', async () => {
    db.dailyPlan.findUniqueOrThrow.mockResolvedValue(
      makeDailyPlan({ visibleSlots: 5 }),
    );

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.visibleSlots).toBe(5);
  });

  // ── queueItems (backlog drawer) ───────────────────────────────────────────────

  it('queueItems comes from the backlog (db.task.findMany)', async () => {
    db.task.count.mockResolvedValue(2);
    db.task.findMany.mockResolvedValue([
      { id: 'qi1', rawText: 'Queued A', title: null, priorityLevel: 'med', estimatedMinutes: null },
      { id: 'qi2', rawText: 'Queued B', title: null, priorityLevel: 'low', estimatedMinutes: 30 },
    ]);

    const view = await getTodayView(db, PLAN_ID, USER_ID);

    expect(view.queueItems).toHaveLength(2);
    expect(view.queueItems.map((q) => q.taskId)).toEqual(['qi1', 'qi2']);
    expect(view.queueItems[1]!.estimatedMinutes).toBe(30);
  });

  it('excludes the current today-card tasks from the backlog query', async () => {
    db.dailyPlanItem.findMany.mockResolvedValue([
      makeItemShape({ id: 'ti1', slotState: 'today', task: { id: 'shown_1', rawText: 'Shown', title: null, priorityKind: 'flexible', priorityLevel: 'med', scheduledFor: null, estimatedMinutes: null, todaySwapCount: 0, reframeOfferedAt: null, reframeSnoozedUntil: null } }),
    ]);
    db.task.count.mockResolvedValue(0);

    await getTodayView(db, PLAN_ID, USER_ID);

    const where = db.task.findMany.mock.calls[0]![0]!.where as { id?: { notIn: string[] } };
    expect(where.id?.notIn).toContain('shown_1');
  });

  it('orders the backlog query by pushed-back-today, then priority, then recency', async () => {
    db.task.findMany.mockResolvedValue([]);
    await getTodayView(db, PLAN_ID, USER_ID);
    const arg = db.task.findMany.mock.calls[0]![0]!;
    expect(arg.orderBy).toEqual([
      { todaySwapCount: 'asc' },
      { priorityLevel: 'asc' },
      { updatedAt: 'asc' },
    ]);
    expect(arg.take).toBe(20);
  });
});
