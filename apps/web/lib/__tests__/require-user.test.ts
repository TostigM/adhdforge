/**
 * Tests: require-user guards (account-state enforcement, Session 13).
 * Regression coverage for the "suspended/paused users keep full access on a
 * live session" finding — mutation capability must be denied for paused and
 * suspended states, and an expired pause must count as active immediately.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { db } from '@focus-forge/database/client';

import { requirePageUser, requireUser } from '../require-user';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock('@focus-forge/database/client', () => ({
  db: { user: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockSession = (user: Record<string, unknown> | null) =>
  vi.mocked(getServerSession).mockResolvedValue(user ? { user } : null);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requireUser', () => {
  it('rejects when there is no session', async () => {
    mockSession(null);
    const result = await requireUser('mutate_data');
    expect(result).toMatchObject({ ok: false, error: 'unauthenticated' });
  });

  it('allows an active user to mutate', async () => {
    mockSession({ id: 'u1', accountState: 'active' });
    const result = await requireUser('mutate_data');
    expect(result).toMatchObject({ ok: true, userId: 'u1', accountState: 'active' });
  });

  it('treats a session without accountState as active (test-stub sessions)', async () => {
    mockSession({ id: 'u1' });
    const result = await requireUser('mutate_data');
    expect(result).toMatchObject({ ok: true, userId: 'u1' });
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it('blocks a paused user from mutating, with calm copy', async () => {
    mockSession({ id: 'u1', accountState: 'paused' });
    vi.mocked(db.user.findUnique).mockResolvedValue({
      pausedUntil: new Date(Date.now() + 60 * 60 * 1000),
    } as never);

    const result = await requireUser('mutate_data');
    expect(result).toMatchObject({ ok: false, error: 'account_restricted' });
    if (!result.ok) {
      expect(result.message).toMatch(/paused/i);
      expect(result.message).not.toMatch(/fail|lock|block/i); // no shame framing
    }
  });

  it('still lets a paused user read their data', async () => {
    mockSession({ id: 'u1', accountState: 'paused' });
    vi.mocked(db.user.findUnique).mockResolvedValue({
      pausedUntil: new Date(Date.now() + 60 * 60 * 1000),
    } as never);

    const result = await requireUser('read_data');
    expect(result).toMatchObject({ ok: true, accountState: 'paused' });
  });

  it('treats an expired pause as active without waiting for the cron', async () => {
    mockSession({ id: 'u1', accountState: 'paused' });
    vi.mocked(db.user.findUnique).mockResolvedValue({
      pausedUntil: new Date(Date.now() - 60 * 1000),
    } as never);

    const result = await requireUser('mutate_data');
    expect(result).toMatchObject({ ok: true, accountState: 'active' });
  });

  it('an indefinite pause (no pausedUntil) stays read-only', async () => {
    mockSession({ id: 'u1', accountState: 'paused' });
    vi.mocked(db.user.findUnique).mockResolvedValue({ pausedUntil: null } as never);

    const result = await requireUser('create_data');
    expect(result).toMatchObject({ ok: false, error: 'account_restricted' });
  });

  it('blocks a suspended user entirely', async () => {
    mockSession({ id: 'u1', accountState: 'suspended' });
    const result = await requireUser('read_data');
    expect(result).toMatchObject({ ok: false, error: 'account_restricted' });
  });

  it('allows a pending_delete user full access (self-recovery window)', async () => {
    mockSession({ id: 'u1', accountState: 'pending_delete' });
    const result = await requireUser('mutate_data');
    expect(result).toMatchObject({ ok: true });
  });
});

describe('requirePageUser', () => {
  it('redirects unauthenticated users to /signin with the callback path', async () => {
    mockSession(null);
    await expect(requirePageUser('/dashboard')).rejects.toThrow(
      'REDIRECT:/signin?callbackUrl=%2Fdashboard',
    );
    expect(redirect).toHaveBeenCalledWith('/signin?callbackUrl=%2Fdashboard');
  });

  it('redirects suspended users to /account/suspended', async () => {
    mockSession({ id: 'u1', accountState: 'suspended' });
    await expect(requirePageUser()).rejects.toThrow('REDIRECT:/account/suspended');
  });

  it('returns the user for active sessions', async () => {
    mockSession({ id: 'u1', accountState: 'active', name: 'T', email: 't@x.test' });
    const user = await requirePageUser();
    expect(user).toMatchObject({ userId: 'u1', accountState: 'active', name: 'T' });
  });

  it('lets paused users through to pages (read is allowed)', async () => {
    mockSession({ id: 'u1', accountState: 'paused' });
    vi.mocked(db.user.findUnique).mockResolvedValue({
      pausedUntil: new Date(Date.now() + 60 * 60 * 1000),
    } as never);

    const user = await requirePageUser();
    expect(user).toMatchObject({ userId: 'u1', accountState: 'paused' });
  });
});
