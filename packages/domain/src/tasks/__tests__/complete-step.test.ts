/**
 * Unit tests: completeStep
 *
 * Covers:
 *   - Guards: step_not_found, forbidden
 *   - Idempotent: completing an already-complete step does nothing
 *   - Happy path: step → completed, event logged, first_step badge checked
 *   - Auto-complete: last step done → task completes + task.completed event
 *   - Not-last step → task stays active, taskCompleted=false
 *   - Soft-Track: never sets a "failed" status
 *   - Badge engine failure is non-fatal
 *   - db_error handled
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeStep } from '../complete-step';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';

vi.mock('../../badges/check-and-award', () => ({
  checkAndAward: vi.fn().mockResolvedValue([]),
}));

const INPUT = { stepId: 'step_test_01', userId: 'user_test_01' };

function makeStepRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'step_test_01',
    status: 'active',
    taskId: 'task_test_01',
    task: { id: 'task_test_01', userId: 'user_test_01', status: 'active' },
    ...overrides,
  };
}

describe('completeStep', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.taskStep.findUnique.mockResolvedValue(makeStepRow());
    db.taskStep.update.mockResolvedValue({});
    db.event.create.mockResolvedValue({});
    db.taskStep.count.mockResolvedValue(1); // 1 step still incomplete by default → no auto-complete
    db.task.update.mockResolvedValue({});
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("step_not_found") when the step is missing', async () => {
    db.taskStep.findUnique.mockResolvedValue(null);
    const result = await completeStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('step_not_found');
  });

  it('returns err("forbidden") for another user\'s step', async () => {
    db.taskStep.findUnique.mockResolvedValue(
      makeStepRow({ task: { id: 'task_test_01', userId: 'someone_else', status: 'active' } }),
    );
    const result = await completeStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  // ── Idempotency ──────────────────────────────────────────────────────────────

  it('is a no-op when the step is already completed', async () => {
    db.taskStep.findUnique.mockResolvedValue(makeStepRow({ status: 'completed' }));
    const result = await completeStep(db, INPUT);
    expect(result.ok).toBe(true);
    expect(db.taskStep.update).not.toHaveBeenCalled();
    expect(db.event.create).not.toHaveBeenCalled();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('marks the step completed with a timestamp', async () => {
    await completeStep(db, INPUT);
    const call = db.taskStep.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.status).toBe('completed');
    expect(call.data.completedAt).toBeInstanceOf(Date);
  });

  it('logs a task_step.completed event', async () => {
    await completeStep(db, INPUT);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'task_step.completed', userId: INPUT.userId }),
      }),
    );
  });

  it('checks badges for task_step.completed', async () => {
    const { checkAndAward } = await import('../../badges/check-and-award');
    await completeStep(db, INPUT);
    expect(checkAndAward).toHaveBeenCalledWith(db, INPUT.userId, 'task_step.completed');
  });

  // ── Auto-complete the task ─────────────────────────────────────────────────

  it('does NOT complete the task while steps remain', async () => {
    db.taskStep.count.mockResolvedValue(2); // still incomplete
    const result = await completeStep(db, INPUT);
    expect(db.task.update).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.taskCompleted).toBe(false);
  });

  it('auto-completes the task when the last step is done', async () => {
    db.taskStep.count.mockResolvedValue(0); // none left incomplete
    const result = await completeStep(db, INPUT);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'completed' }) }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.taskCompleted).toBe(true);
  });

  it('logs a task.completed event on auto-complete', async () => {
    db.taskStep.count.mockResolvedValue(0);
    await completeStep(db, INPUT);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'task.completed' }),
      }),
    );
  });

  it('does not re-complete an already-completed task', async () => {
    db.taskStep.findUnique.mockResolvedValue(
      makeStepRow({ task: { id: 'task_test_01', userId: 'user_test_01', status: 'completed' } }),
    );
    db.taskStep.count.mockResolvedValue(0);
    await completeStep(db, INPUT);
    expect(db.task.update).not.toHaveBeenCalled();
  });

  // ── Soft-Track ───────────────────────────────────────────────────────────────

  it('never sets a "failed" status', async () => {
    await completeStep(db, INPUT);
    const call = db.taskStep.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.status).not.toBe('failed');
  });

  // ── Resilience ───────────────────────────────────────────────────────────────

  it('does not throw when the badge engine fails', async () => {
    const { checkAndAward } = await import('../../badges/check-and-award');
    vi.mocked(checkAndAward).mockRejectedValueOnce(new Error('badge boom'));
    await expect(completeStep(db, INPUT)).resolves.toBeDefined();
  });

  it('returns err("db_error") when the step update throws', async () => {
    db.taskStep.update.mockRejectedValue(new Error('deadlock'));
    const result = await completeStep(db, INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
