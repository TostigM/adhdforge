/**
 * Integration tests: createTaskAction (server action)
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests the full server action flow:
 *   - Auth check (unauthenticated → error)
 *   - Delegates to domain createTask
 *   - Propagates domain validation errors to the client
 *   - Returns { ok: true, taskId } on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@focus-forge/database/client', () => ({ db: {} }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@focus-forge/domain/tasks/create-task', () => ({
  createTask: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { createTask } from '@focus-forge/domain/tasks/create-task';
import { createTaskAction } from '../create-task';

const FAKE_SESSION = { user: { id: 'user_test_01' } };
const VALID_INPUT = { rawText: 'Buy oranges' };

describe('createTaskAction', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(createTask).mockResolvedValue({ ok: true, value: { id: 'task_new_01' } as never });
  });

  it('returns unauthenticated error when no session', async () => {
    const result = await createTaskAction(VALID_INPUT);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unauthenticated');
  });

  it('calls createTask with correct userId from session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    await createTaskAction(VALID_INPUT);

    expect(createTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: 'user_test_01', rawText: 'Buy oranges' }),
    );
  });

  it('returns { ok: true, taskId } on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    const result = await createTaskAction(VALID_INPUT);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.taskId).toBe('task_new_01');
  });

  it('propagates domain validation errors to the client', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(createTask).mockResolvedValue({
      ok: false,
      error: 'raw_text_empty',
      message: 'Task text cannot be empty.',
    });

    const result = await createTaskAction({ rawText: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('raw_text_empty');
      expect(result.message).toBe('Task text cannot be empty.');
    }
  });

  it('sets captureMethod to "text" regardless of input', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    await createTaskAction(VALID_INPUT);

    expect(createTask).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ captureMethod: 'text' }),
    );
  });
});
