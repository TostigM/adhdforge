/**
 * Unit tests: reorderSteps
 *
 * Covers:
 *   - Guards: task_not_found, forbidden, step_set_mismatch (missing/extra/foreign ids)
 *   - Two-phase update: temp range then final 0..n-1 orders
 *   - db_error handled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reorderSteps } from '../reorder-steps';
import { makeMockPrisma, makeTask } from '../../__test-utils__/mock-prisma';

const TASK = 'task_test_01';
const USER = 'user_test_01';

describe('reorderSteps', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.task.findUnique.mockResolvedValue(makeTask({ id: TASK, userId: USER }));
    db.taskStep.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }]);
    db.taskStep.update.mockResolvedValue({});
    // $transaction calls the callback with the same mock db
    db.$transaction.mockImplementation((cb) => cb(db));
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("task_not_found") when task is missing', async () => {
    db.task.findUnique.mockResolvedValue(null);
    const result = await reorderSteps(db, { taskId: TASK, userId: USER, orderedStepIds: ['s1', 's2', 's3'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_not_found');
  });

  it('returns err("forbidden") for another user', async () => {
    db.task.findUnique.mockResolvedValue(makeTask({ userId: 'someone_else' }));
    const result = await reorderSteps(db, { taskId: TASK, userId: USER, orderedStepIds: ['s1', 's2', 's3'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns err("step_set_mismatch") when an id is missing', async () => {
    const result = await reorderSteps(db, { taskId: TASK, userId: USER, orderedStepIds: ['s1', 's2'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('step_set_mismatch');
  });

  it('returns err("step_set_mismatch") when a foreign id is included', async () => {
    const result = await reorderSteps(db, { taskId: TASK, userId: USER, orderedStepIds: ['s1', 's2', 'sX'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('step_set_mismatch');
  });

  it('returns err("step_set_mismatch") on duplicate ids', async () => {
    const result = await reorderSteps(db, { taskId: TASK, userId: USER, orderedStepIds: ['s1', 's1', 's2'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('step_set_mismatch');
  });

  // ── Two-phase update ─────────────────────────────────────────────────────────

  it('parks steps in a temp range, then writes final 0..n-1 orders', async () => {
    const result = await reorderSteps(db, { taskId: TASK, userId: USER, orderedStepIds: ['s3', 's1', 's2'] });
    expect(result.ok).toBe(true);

    // 6 updates total: 3 temp (phase 1) + 3 final (phase 2)
    expect(db.taskStep.update).toHaveBeenCalledTimes(6);

    const calls = db.taskStep.update.mock.calls.map((c) => c[0] as { where: { id: string }; data: { stepOrder: number } });
    const phase1 = calls.slice(0, 3);
    const phase2 = calls.slice(3, 6);

    // Phase 1: all temp orders are >= 10000 (non-colliding)
    expect(phase1.every((c) => c.data.stepOrder >= 10_000)).toBe(true);

    // Phase 2: final order follows the requested sequence s3=0, s1=1, s2=2
    expect(phase2).toEqual([
      { where: { id: 's3' }, data: { stepOrder: 0 } },
      { where: { id: 's1' }, data: { stepOrder: 1 } },
      { where: { id: 's2' }, data: { stepOrder: 2 } },
    ]);
  });

  // ── Errors ─────────────────────────────────────────────────────────────────

  it('returns err("db_error") when a transaction update throws', async () => {
    db.taskStep.update.mockRejectedValue(new Error('lock timeout'));
    const result = await reorderSteps(db, { taskId: TASK, userId: USER, orderedStepIds: ['s1', 's2', 's3'] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
