/**
 * Integration tests: deferTaskAction (server action)
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests the full server action flow:
 *   - Auth check (unauthenticated → error)
 *   - Delegates to domain deferTask with correct ids
 *   - Propagates domain errors to the client
 *   - Returns { ok: true } on success
 *   - Passes optional deferUntil through to domain
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@focus-forge/database/client', () => ({ db: {} }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@focus-forge/domain/tasks/defer-task', () => ({
  deferTask: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { deferTask } from '@focus-forge/domain/tasks/defer-task';
import { deferTaskAction } from '../defer-task';

const FAKE_SESSION = { user: { id: 'user_test_01' } };
const TASK_ID = 'task_test_01';

describe('deferTaskAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(deferTask).mockResolvedValue({
      ok: true,
      value: { id: TASK_ID, status: 'deferred' } as never,
    });
  });

  it('returns unauthenticated error when no session', async () => {
    const result = await deferTaskAction(TASK_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unauthenticated');
  });

  it('calls deferTask with correct taskId and userId from session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    await deferTaskAction(TASK_ID);

    expect(deferTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ taskId: TASK_ID, userId: 'user_test_01' }),
    );
  });

  it('returns { ok: true } on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    const result = await deferTaskAction(TASK_ID);
    expect(result.ok).toBe(true);
  });

  it('propagates domain errors to the client', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(deferTask).mockResolvedValue({
      ok: false,
      error: 'task_already_completed',
      message: 'Cannot defer a completed task.',
    });

    const result = await deferTaskAction(TASK_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('task_already_completed');
      expect(result.message).toBe('Cannot defer a completed task.');
    }
  });

  it('passes deferUntil to the domain when provided', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    const deferUntil = new Date('2026-06-01T09:00:00Z');

    await deferTaskAction(TASK_ID, deferUntil);

    expect(deferTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deferUntil }),
    );
  });

  it('does not call revalidatePath when domain returns an error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(deferTask).mockResolvedValue({
      ok: false,
      error: 'forbidden',
      message: 'Access denied.',
    });

    await deferTaskAction(TASK_ID);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
