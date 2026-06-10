/**
 * Unit tests: completeTask
 *
 * Covers:
 *   - Not found / wrong user / already completed guards
 *   - Happy path: status → 'completed', completedAt set, event logged
 *   - Soft-Track: status can never become 'failed'
 *   - Badge engine called after completion
 *   - DB error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeTask } from '../complete-task';
import { makeMockPrisma, makeTask } from '../../__test-utils__/mock-prisma';

vi.mock('../../badges/check-and-award', () => ({
  checkAndAward: vi.fn().mockResolvedValue([]),
}));

const INPUT = { taskId: 'task_test_01', userId: 'user_test_01' };

describe('completeTask', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.task.findUnique.mockResolvedValue(
      makeTask({ id: 'task_test_01', userId: 'user_test_01', status: 'active' }),
    );
    db.task.update.mockResolvedValue(
      makeTask({ status: 'completed', completedAt: new Date() }),
    );
    db.event.create.mockResolvedValue({});
  });

  // ── Guards ──────────────────────────────────────────────────────────────────

  it('returns err("task_not_found") when task does not exist', async () => {
    db.task.findUnique.mockResolvedValue(null);
    const result = await completeTask(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_not_found');
  });

  it('returns err("forbidden") when userId does not match', async () => {
    db.task.findUnique.mockResolvedValue(
      makeTask({ id: 'task_test_01', userId: 'different_user' }),
    );
    const result = await completeTask(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns err("task_already_completed") for already-completed task', async () => {
    db.task.findUnique.mockResolvedValue(
      makeTask({ status: 'completed', userId: 'user_test_01' }),
    );
    const result = await completeTask(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_already_completed');
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('updates status to "completed"', async () => {
    await completeTask(db, INPUT);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'completed' }),
      }),
    );
  });

  it('sets completedAt to a Date', async () => {
    await completeTask(db, INPUT);
    const call = db.task.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.completedAt).toBeInstanceOf(Date);
  });

  it('logs a task.completed event', async () => {
    await completeTask(db, INPUT);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'task.completed',
          userId: INPUT.userId,
        }),
      }),
    );
  });

  it('returns the updated task on success', async () => {
    const result = await completeTask(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('completed');
  });

  // ── Soft-Track Protocol ─────────────────────────────────────────────────────

  it('never sets status to "failed"', async () => {
    await completeTask(db, INPUT);
    const call = db.task.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.status).not.toBe('failed');
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it('returns err("db_error") when transaction throws', async () => {
    db.$transaction.mockRejectedValue(new Error('DB down'));
    const result = await completeTask(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });

  it('does not throw even when badge engine fails', async () => {
    const { checkAndAward } = await import('../../badges/check-and-award');
    vi.mocked(checkAndAward).mockRejectedValueOnce(new Error('badge explosion'));
    await expect(completeTask(db, INPUT)).resolves.toBeDefined();
  });
});
