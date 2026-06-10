/**
 * Integration tests: completeTaskAction (server action)
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests the full server action flow:
 *   - Auth check (unauthenticated → error)
 *   - Delegates to domain completeTask with correct ids
 *   - Propagates domain errors to the client
 *   - Returns { ok: true } on success
 *   - Calls revalidatePath only on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@focus-forge/database/client', () => ({ db: {} }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@focus-forge/domain/tasks/complete-task', () => ({
  completeTask: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { completeTask } from '@focus-forge/domain/tasks/complete-task';
import { completeTaskAction } from '../complete-task';

const FAKE_SESSION = { user: { id: 'user_test_01' } };
const TASK_ID = 'task_test_01';

describe('completeTaskAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(completeTask).mockResolvedValue({
      ok: true,
      value: { id: TASK_ID, status: 'completed' } as never,
    });
  });

  it('returns unauthenticated error when no session', async () => {
    const result = await completeTaskAction(TASK_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unauthenticated');
  });

  it('calls completeTask with correct taskId and userId from session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    await completeTaskAction(TASK_ID);

    expect(completeTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taskId: TASK_ID, userId: 'user_test_01' }),
    );
  });

  it('returns { ok: true } on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    const result = await completeTaskAction(TASK_ID);
    expect(result.ok).toBe(true);
  });

  it('propagates domain errors to the client', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(completeTask).mockResolvedValue({
      ok: false,
      error: 'task_already_completed',
      message: 'This task is already done.',
    });

    const result = await completeTaskAction(TASK_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('task_already_completed');
      expect(result.message).toBe('This task is already done.');
    }
  });

  it('does not call revalidatePath when domain returns an error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(completeTask).mockResolvedValue({
      ok: false,
      error: 'forbidden',
      message: 'Access denied.',
    });

    await completeTaskAction(TASK_ID);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
