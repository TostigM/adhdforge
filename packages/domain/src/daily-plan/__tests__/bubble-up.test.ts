/**
 * Unit tests: bubbleUp (internal) — unified, recency-ranked backlog pull.
 *
 * Covers:
 *   - Noop when slots are already full
 *   - Pulls from ONE ranked pool ordered by (priority, updatedAt asc)
 *   - Only flexible tasks; current 'today' cards excluded from candidates
 *   - A candidate WITH an existing queue plan item is UPDATEd (not duplicated)
 *   - A candidate WITHOUT a plan item is CREATEd
 *   - Promotes only `needed` candidates
 *   - Tolerates the P2002 unique-constraint race on create
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bubbleUp } from '../_bubble-up';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';

const PLAN_ID = 'plan_test_01';
const USER_ID = 'user_test_01';
const VISIBLE_SLOTS = 3;

describe('bubbleUp', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.dailyPlanItem.count.mockResolvedValue(VISIBLE_SLOTS); // full by default
    db.dailyPlanItem.findMany.mockResolvedValue([]); // plan items
    db.dailyPlanItem.aggregate.mockResolvedValue({ _max: { position: null } });
    db.dailyPlanItem.update.mockResolvedValue({});
    db.dailyPlanItem.create.mockResolvedValue({});
    db.task.findMany.mockResolvedValue([]); // candidates
  });

  it('does nothing when visible slots are already full', async () => {
    db.dailyPlanItem.count.mockResolvedValue(3);
    await bubbleUp(db, PLAN_ID, USER_ID, VISIBLE_SLOTS);
    expect(db.task.findMany).not.toHaveBeenCalled();
    expect(db.dailyPlanItem.create).not.toHaveBeenCalled();
    expect(db.dailyPlanItem.update).not.toHaveBeenCalled();
  });

  it('queries candidates by (todaySwapCount, priorityLevel, updatedAt asc), flexible only, excluding today cards', async () => {
    db.dailyPlanItem.count.mockResolvedValue(2); // 1 needed
    db.dailyPlanItem.findMany.mockResolvedValue([
      { id: 'pi_today', taskId: 'shown_task', slotState: 'today' },
    ]);
    db.task.findMany.mockResolvedValue([]);

    await bubbleUp(db, PLAN_ID, USER_ID, VISIBLE_SLOTS);

    const arg = db.task.findMany.mock.calls[0]![0]!;
    expect(arg.where).toMatchObject({ priorityKind: 'flexible', status: 'active' });
    expect(arg.where.id).toEqual({ notIn: ['shown_task'] });
    expect(arg.orderBy).toEqual([
      { todaySwapCount: 'asc' },
      { priorityLevel: 'asc' },
      { updatedAt: 'asc' },
    ]);
    expect(arg.take).toBe(1);
  });

  it('CREATES a new today item for a backlog task with no plan item', async () => {
    db.dailyPlanItem.count.mockResolvedValue(2); // 1 needed
    db.dailyPlanItem.findMany.mockResolvedValue([]); // no plan items
    db.task.findMany.mockResolvedValue([{ id: 'backlog_1' }]);
    db.dailyPlanItem.aggregate.mockResolvedValue({ _max: { position: 1 } });

    await bubbleUp(db, PLAN_ID, USER_ID, VISIBLE_SLOTS);

    expect(db.dailyPlanItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taskId: 'backlog_1', slotState: 'today', source: 'bubble', position: 2 }),
      }),
    );
    expect(db.dailyPlanItem.update).not.toHaveBeenCalled();
  });

  it('UPDATES an existing queue plan item (a swapped-back task), not creating a duplicate', async () => {
    db.dailyPlanItem.count.mockResolvedValue(2); // 1 needed
    db.dailyPlanItem.findMany.mockResolvedValue([
      { id: 'pi_queue', taskId: 'swapped_back', slotState: 'queue' },
    ]);
    db.task.findMany.mockResolvedValue([{ id: 'swapped_back' }]);

    await bubbleUp(db, PLAN_ID, USER_ID, VISIBLE_SLOTS);

    expect(db.dailyPlanItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pi_queue' }, data: expect.objectContaining({ slotState: 'today' }) }),
    );
    expect(db.dailyPlanItem.create).not.toHaveBeenCalled();
  });

  it('promotes exactly the candidates returned (ordered by the DB), preserving order', async () => {
    db.dailyPlanItem.count.mockResolvedValue(0); // 3 needed
    db.dailyPlanItem.findMany.mockResolvedValue([]);
    // DB already returns them ranked; bubbleUp preserves that order.
    db.task.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    db.dailyPlanItem.aggregate.mockResolvedValue({ _max: { position: null } });

    await bubbleUp(db, PLAN_ID, USER_ID, VISIBLE_SLOTS);

    const created = db.dailyPlanItem.create.mock.calls.map((c) => (c[0] as { data: { taskId: string; position: number } }).data);
    expect(created.map((d) => d.taskId)).toEqual(['a', 'b', 'c']);
    expect(created.map((d) => d.position)).toEqual([0, 1, 2]);
  });

  it('tolerates a P2002 unique-constraint race on create', async () => {
    db.dailyPlanItem.count.mockResolvedValue(2);
    db.dailyPlanItem.findMany.mockResolvedValue([]);
    db.task.findMany.mockResolvedValue([{ id: 'raced' }]);
    db.dailyPlanItem.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));

    await expect(bubbleUp(db, PLAN_ID, USER_ID, VISIBLE_SLOTS)).resolves.toBeUndefined();
  });

  it('rethrows non-P2002 errors', async () => {
    db.dailyPlanItem.count.mockResolvedValue(2);
    db.dailyPlanItem.findMany.mockResolvedValue([]);
    db.task.findMany.mockResolvedValue([{ id: 'boom' }]);
    db.dailyPlanItem.create.mockRejectedValue(Object.assign(new Error('down'), { code: 'P2010' }));

    await expect(bubbleUp(db, PLAN_ID, USER_ID, VISIBLE_SLOTS)).rejects.toThrow('down');
  });
});
