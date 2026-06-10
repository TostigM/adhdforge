/**
 * Integration tests: updateTaskPriorityAction (server action)
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests the full server action flow:
 *   - Auth check (unauthenticated → error)
 *   - Soft-Track Protocol enforcement (cant_miss requires anchor)
 *   - Ownership check (userId must match)
 *   - Task not found
 *   - Success → { ok: true }, db.task.update called with merged values
 *   - Combined cant_miss check (when new level is cant_miss but existing kind is flexible)
 *   - DB errors → { ok: false, error: 'db_error' }
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@focus-forge/database/client', () => ({
  db: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { db } from '@focus-forge/database/client';
import { updateTaskPriorityAction } from '../update-task-priority';

const FAKE_SESSION = { user: { id: 'user_test_01' } };
const TASK_ID = 'task_test_01';

const EXISTING_FLEXIBLE_MED = {
  userId: 'user_test_01',
  priorityKind: 'flexible' as const,
  priorityLevel: 'med' as const,
};

describe('updateTaskPriorityAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(db.task.findUnique).mockResolvedValue(EXISTING_FLEXIBLE_MED as never);
    vi.mocked(db.task.update).mockResolvedValue({} as never);
  });

  it('returns unauthenticated error when no session', async () => {
    const result = await updateTaskPriorityAction({ taskId: TASK_ID });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('unauthenticated');
  });

  it('rejects cant_miss + flexible before hitting the DB (Soft-Track Protocol)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    const result = await updateTaskPriorityAction({
      taskId: TASK_ID,
      priorityLevel: 'cant_miss',
      priorityKind: 'flexible',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('cant_miss_requires_anchor');
    expect(db.task.findUnique).not.toHaveBeenCalled();
  });

  it('returns task_not_found when task does not exist', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(db.task.findUnique).mockResolvedValue(null as never);

    const result = await updateTaskPriorityAction({ taskId: TASK_ID, priorityLevel: 'high' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('task_not_found');
  });

  it('returns forbidden when task belongs to a different user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(db.task.findUnique).mockResolvedValue({
      ...EXISTING_FLEXIBLE_MED,
      userId: 'other_user_99',
    } as never);

    const result = await updateTaskPriorityAction({ taskId: TASK_ID, priorityLevel: 'high' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('forbidden');
  });

  it('returns { ok: true } and calls db.task.update on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    const result = await updateTaskPriorityAction({ taskId: TASK_ID, priorityLevel: 'high' });

    expect(result.ok).toBe(true);
    expect(db.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TASK_ID },
        data: expect.objectContaining({ priorityLevel: 'high', priorityKind: 'flexible' }),
      }),
    );
  });

  it('blocks cant_miss when combined level from existing task would be invalid', async () => {
    // Scenario: task is currently cant_miss + anchor. User updates only priorityKind → flexible.
    // The combined result is cant_miss + flexible which violates Soft-Track Protocol.
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(db.task.findUnique).mockResolvedValue({
      userId: 'user_test_01',
      priorityKind: 'anchor',
      priorityLevel: 'cant_miss',
    } as never);

    // Only update kind (to flexible), keeping level as cant_miss — should fail
    const result = await updateTaskPriorityAction({
      taskId: TASK_ID,
      priorityKind: 'flexible',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('cant_miss_requires_anchor');
    expect(db.task.update).not.toHaveBeenCalled();
  });

  it('returns db_error when the database throws', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(db.task.findUnique).mockRejectedValue(new Error('Connection refused'));

    const result = await updateTaskPriorityAction({ taskId: TASK_ID, priorityLevel: 'low' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });

  it('calls revalidatePath on success and not on failure', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);

    await updateTaskPriorityAction({ taskId: TASK_ID, priorityLevel: 'low' });
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard');

    vi.mocked(revalidatePath).mockClear();

    vi.mocked(db.task.findUnique).mockResolvedValue(null as never);
    await updateTaskPriorityAction({ taskId: TASK_ID, priorityLevel: 'low' });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
