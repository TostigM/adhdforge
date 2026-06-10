/**
 * Unit tests: deleteStep
 *
 * Covers: step_not_found, forbidden, happy path (delete called), db_error.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteStep } from '../delete-step';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';

const INPUT = { stepId: 'step_test_01', userId: 'user_test_01' };

describe('deleteStep', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.taskStep.findUnique.mockResolvedValue({ id: 'step_test_01', task: { userId: 'user_test_01' } });
    db.taskStep.delete.mockResolvedValue({});
  });

  it('returns err("step_not_found") when missing', async () => {
    db.taskStep.findUnique.mockResolvedValue(null);
    const result = await deleteStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('step_not_found');
  });

  it('returns err("forbidden") for another user\'s step', async () => {
    db.taskStep.findUnique.mockResolvedValue({ id: 'step_test_01', task: { userId: 'someone_else' } });
    const result = await deleteStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('deletes the step on the happy path', async () => {
    const result = await deleteStep(db, INPUT);
    expect(result.ok).toBe(true);
    expect(db.taskStep.delete).toHaveBeenCalledWith({ where: { id: 'step_test_01' } });
  });

  it('returns err("db_error") when delete throws', async () => {
    db.taskStep.delete.mockRejectedValue(new Error('fk constraint'));
    const result = await deleteStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
