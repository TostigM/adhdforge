/**
 * Unit tests: addStep
 *
 * Covers:
 *   - Guards: text_empty, text_too_long, task_not_found, forbidden
 *   - stepOrder = max + 1 (0 when no steps exist)
 *   - text is trimmed; status starts 'active'
 *   - db_error handled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addStep } from '../add-step';
import { makeMockPrisma, makeTask } from '../../__test-utils__/mock-prisma';

const INPUT = { taskId: 'task_test_01', userId: 'user_test_01', text: 'Open the document' };

describe('addStep', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.task.findUnique.mockResolvedValue(makeTask({ id: 'task_test_01', userId: 'user_test_01' }));
    db.taskStep.aggregate.mockResolvedValue({ _max: { stepOrder: null } });
    db.taskStep.create.mockResolvedValue({ id: 'step_new_01', stepOrder: 0, text: 'Open the document', status: 'active' });
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("text_empty") for blank text', async () => {
    const result = await addStep(db, { ...INPUT, text: '   ' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('text_empty');
  });

  it('returns err("text_too_long") past the limit', async () => {
    const result = await addStep(db, { ...INPUT, text: 'x'.repeat(2_001) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('text_too_long');
  });

  it('returns err("task_not_found") when task is missing', async () => {
    db.task.findUnique.mockResolvedValue(null);
    const result = await addStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_not_found');
  });

  it('returns err("forbidden") when the task belongs to another user', async () => {
    db.task.findUnique.mockResolvedValue(makeTask({ userId: 'someone_else' }));
    const result = await addStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  // ── stepOrder ──────────────────────────────────────────────────────────────

  it('assigns stepOrder 0 for the first step', async () => {
    db.taskStep.aggregate.mockResolvedValue({ _max: { stepOrder: null } });
    await addStep(db, INPUT);
    expect(db.taskStep.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stepOrder: 0 }) }),
    );
  });

  it('assigns stepOrder max + 1 when steps exist', async () => {
    db.taskStep.aggregate.mockResolvedValue({ _max: { stepOrder: 4 } });
    await addStep(db, INPUT);
    expect(db.taskStep.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stepOrder: 5 }) }),
    );
  });

  // ── Content ──────────────────────────────────────────────────────────────────

  it('trims the text and starts status "active"', async () => {
    await addStep(db, { ...INPUT, text: '  Buy milk  ' });
    expect(db.taskStep.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ text: 'Buy milk', status: 'active' }) }),
    );
  });

  it('returns the created step', async () => {
    const result = await addStep(db, INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.id).toBe('step_new_01');
  });

  // ── Errors ─────────────────────────────────────────────────────────────────

  it('returns err("db_error") when create throws', async () => {
    db.taskStep.create.mockRejectedValue(new Error('connection lost'));
    const result = await addStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
