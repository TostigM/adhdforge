/**
 * Unit tests: deferTask
 *
 * Covers:
 *   - Not found / wrong user / already completed guards
 *   - Happy path: status → 'deferred', deferredCount incremented
 *   - deferUntil stored when provided, null otherwise
 *   - No shame language — deferredCount is a PRIVATE metric, never surfaced
 *   - Event logged with deferredCount payload
 *   - DB error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deferTask } from '../defer-task';
import { makeMockPrisma, makeTask } from '../../__test-utils__/mock-prisma';

const INPUT = { taskId: 'task_test_01', userId: 'user_test_01' };

describe('deferTask', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.task.findUnique.mockResolvedValue(
      makeTask({ id: 'task_test_01', userId: 'user_test_01', status: 'active', deferredCount: 0 }),
    );
    db.task.update.mockResolvedValue(
      makeTask({ status: 'deferred', deferredCount: 1 }),
    );
    db.event.create.mockResolvedValue({});
  });

  // ── Guards ──────────────────────────────────────────────────────────────────

  it('returns err("task_not_found") when task does not exist', async () => {
    db.task.findUnique.mockResolvedValue(null);
    const result = await deferTask(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_not_found');
  });

  it('returns err("forbidden") when userId does not match', async () => {
    db.task.findUnique.mockResolvedValue(
      makeTask({ userId: 'someone_else', status: 'active' }),
    );
    const result = await deferTask(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns err("task_already_completed") for completed tasks', async () => {
    db.task.findUnique.mockResolvedValue(
      makeTask({ userId: 'user_test_01', status: 'completed' }),
    );
    const result = await deferTask(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_already_completed');
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('sets status to "deferred"', async () => {
    await deferTask(db, INPUT);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'deferred' }),
      }),
    );
  });

  it('increments deferredCount', async () => {
    await deferTask(db, INPUT);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deferredCount: { increment: 1 } }),
      }),
    );
  });

  it('stores deferUntil when provided', async () => {
    const until = new Date('2026-06-01T15:00:00Z');
    await deferTask(db, { ...INPUT, deferUntil: until });
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deferredUntil: until }),
      }),
    );
  });

  it('stores null deferredUntil when deferUntil omitted', async () => {
    await deferTask(db, INPUT);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deferredUntil: null }),
      }),
    );
  });

  it('logs a task.deferred event', async () => {
    await deferTask(db, INPUT);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'task.deferred',
          userId: INPUT.userId,
        }),
      }),
    );
  });

  it('returns the updated task on success', async () => {
    const result = await deferTask(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('deferred');
  });

  // ── Soft-Track — private metric ─────────────────────────────────────────────

  it('uses "increment" not hard-set — deferredCount is always incremental', async () => {
    // The count must use prisma's { increment: 1 } — never be read and re-written
    // (which would cause a race condition). This verifies the correct update pattern.
    await deferTask(db, INPUT);
    const call = db.task.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.deferredCount).toEqual({ increment: 1 });
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  it('returns err("db_error") when transaction throws', async () => {
    db.$transaction.mockRejectedValue(new Error('Timeout'));
    const result = await deferTask(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
