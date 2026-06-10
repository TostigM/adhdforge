/**
 * Unit tests: listSteps
 *
 * Covers: task_not_found, forbidden, ordered fetch, db_error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listSteps } from '../list-steps';
import { makeMockPrisma, makeTask } from '../../__test-utils__/mock-prisma';

const INPUT = { taskId: 'task_test_01', userId: 'user_test_01' };

describe('listSteps', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.task.findUnique.mockResolvedValue(makeTask({ id: 'task_test_01', userId: 'user_test_01' }));
    db.taskStep.findMany.mockResolvedValue([
      { id: 's1', stepOrder: 0, text: 'First', status: 'active' },
      { id: 's2', stepOrder: 1, text: 'Second', status: 'active' },
    ]);
  });

  it('returns err("task_not_found") when missing', async () => {
    db.task.findUnique.mockResolvedValue(null);
    const result = await listSteps(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_not_found');
  });

  it('returns err("forbidden") for another user', async () => {
    db.task.findUnique.mockResolvedValue(makeTask({ userId: 'someone_else' }));
    const result = await listSteps(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns steps ordered by stepOrder asc', async () => {
    const result = await listSteps(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(db.taskStep.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { stepOrder: 'asc' } }),
    );
  });

  it('returns err("db_error") when the query throws', async () => {
    db.taskStep.findMany.mockRejectedValue(new Error('connection lost'));
    const result = await listSteps(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
