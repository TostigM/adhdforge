/**
 * Unit tests: createTask
 *
 * Covers:
 *   - Input validation (empty text, too long, cant_miss without anchor)
 *   - Happy path: task created, event logged, badge check triggered
 *   - Soft-Track Protocol: status always starts as 'active'
 *   - DB error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTask } from '../create-task';
import { makeMockPrisma, makeTask } from '../../__test-utils__/mock-prisma';

// ── Mock the badge engine so it doesn't interfere with task tests ─────────────
vi.mock('../../badges/check-and-award', () => ({
  checkAndAward: vi.fn().mockResolvedValue([]),
}));

const BASE_INPUT = {
  userId: 'user_test_01',
  rawText: 'Buy oranges',
};

describe('createTask', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    // Default: task.create succeeds
    db.task.create.mockResolvedValue(makeTask());
    // Default: event.create succeeds
    db.event.create.mockResolvedValue({});
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  describe('input validation', () => {
    it('rejects empty rawText', async () => {
      const result = await createTask(db, { ...BASE_INPUT, rawText: '' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('raw_text_empty');
    });

    it('rejects whitespace-only rawText', async () => {
      const result = await createTask(db, { ...BASE_INPUT, rawText: '   ' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('raw_text_empty');
    });

    it('rejects rawText over 10,000 characters', async () => {
      const result = await createTask(db, { ...BASE_INPUT, rawText: 'x'.repeat(10_001) });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('raw_text_too_long');
    });

    it('accepts rawText at exactly 10,000 characters', async () => {
      const result = await createTask(db, { ...BASE_INPUT, rawText: 'x'.repeat(10_000) });
      expect(result.ok).toBe(true);
    });

    it('rejects cant_miss priority on a flexible task', async () => {
      const result = await createTask(db, {
        ...BASE_INPUT,
        priorityKind: 'flexible',
        priorityLevel: 'cant_miss',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('cant_miss_requires_anchor');
    });

    it('accepts cant_miss priority on an anchor task', async () => {
      const result = await createTask(db, {
        ...BASE_INPUT,
        priorityKind: 'anchor',
        priorityLevel: 'cant_miss',
      });
      expect(result.ok).toBe(true);
    });
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('returns the created task on success', async () => {
      const task = makeTask({ rawText: 'Buy oranges' });
      db.task.create.mockResolvedValue(task);

      const result = await createTask(db, BASE_INPUT);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe(task.id);
    });

    it('trims leading/trailing whitespace from rawText', async () => {
      await createTask(db, { ...BASE_INPUT, rawText: '  Buy oranges  ' });

      expect(db.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rawText: 'Buy oranges' }),
        }),
      );
    });

    it('sets status to "active" regardless of any input', async () => {
      await createTask(db, BASE_INPUT);

      expect(db.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'active' }),
        }),
      );
    });

    it('defaults priorityKind to "flexible"', async () => {
      await createTask(db, BASE_INPUT);
      expect(db.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priorityKind: 'flexible' }),
        }),
      );
    });

    it('defaults priorityLevel to "med"', async () => {
      await createTask(db, BASE_INPUT);
      expect(db.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priorityLevel: 'med' }),
        }),
      );
    });

    it('defaults captureMethod to "text"', async () => {
      await createTask(db, BASE_INPUT);
      expect(db.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ captureMethod: 'text' }),
        }),
      );
    });

    it('logs a task.created event inside the transaction', async () => {
      await createTask(db, BASE_INPUT);
      expect(db.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: BASE_INPUT.userId,
            eventType: 'task.created',
          }),
        }),
      );
    });
  });

  // ── Soft-Track Protocol ─────────────────────────────────────────────────────

  describe('Soft-Track Protocol', () => {
    it('never sets status to "failed"', async () => {
      await createTask(db, BASE_INPUT);
      const call = db.task.create.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(call.data.status).not.toBe('failed');
    });

    it('never sets status to "overdue"', async () => {
      await createTask(db, BASE_INPUT);
      const call = db.task.create.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(call.data.status).not.toBe('overdue');
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns err("db_error") when the database throws', async () => {
      db.$transaction.mockRejectedValue(new Error('Connection refused'));
      const result = await createTask(db, BASE_INPUT);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('db_error');
    });

    it('does not throw — always returns a Result', async () => {
      db.$transaction.mockRejectedValue(new Error('Unexpected'));
      await expect(createTask(db, BASE_INPUT)).resolves.toBeDefined();
    });
  });
});
