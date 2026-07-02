/**
 * Tests: password-reset endpoints hardening (Session 13).
 * Regression coverage for:
 *   - rate limiting on request-password-reset (3/hour per account)
 *   - anti-enumeration responses stay identical when the limit is hit
 *   - reset-password revokes all live sessions in the same transaction
 */
import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@focus-forge/database/client', () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    passwordResetToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: { deleteMany: vi.fn() },
    auditLog: { count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { db } from '@focus-forge/database/client';
import { POST as requestReset } from '../request-password-reset/route';
import { POST as resetPassword } from '../reset-password/route';

const jsonRequest = (body: unknown) =>
  new Request('http://localhost/api/auth/test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockResolvedValue({ data: { id: 'email_1' }, error: null });
});

describe('POST /api/auth/request-password-reset', () => {
  it('sends the email and records the request when under the limit', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', name: 'T' } as never);
    vi.mocked(db.auditLog.count).mockResolvedValue(0);

    const res = await requestReset(jsonRequest({ email: 'a@b.test' }));

    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: { userId: 'u1', eventType: 'password_reset_requested' },
    });
  });

  it('stops sending after 3 requests in the window — with an identical response', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({ id: 'u1', name: 'T' } as never);
    vi.mocked(db.auditLog.count).mockResolvedValue(3);

    const res = await requestReset(jsonRequest({ email: 'a@b.test' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true }); // anti-enumeration: same shape as success
    expect(sendMock).not.toHaveBeenCalled();
    expect(db.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('returns ok without any writes for unknown emails', async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null);

    const res = await requestReset(jsonRequest({ email: 'nobody@b.test' }));

    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
    expect(db.auditLog.count).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/reset-password', () => {
  const validToken = () => {
    const raw = crypto.randomBytes(32);
    return { hex: raw.toString('hex') };
  };

  it('revokes all sessions in the same transaction as the password change', async () => {
    const { hex } = validToken();
    vi.mocked(db.passwordResetToken.findFirst).mockResolvedValue({
      id: 'tok1',
      userId: 'u1',
      expiresAt: new Date(Date.now() + 60 * 1000),
      usedAt: null,
    } as never);
    vi.mocked(db.$transaction).mockResolvedValue([] as never);

    const res = await resetPassword(jsonRequest({ token: hex, password: 'longenough1' }));

    expect(res.status).toBe(200);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    // The transaction array must include the session purge alongside the update.
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } }),
    );
  });

  it('rejects an expired token without touching sessions', async () => {
    const { hex } = validToken();
    vi.mocked(db.passwordResetToken.findFirst).mockResolvedValue({
      id: 'tok1',
      userId: 'u1',
      expiresAt: new Date(Date.now() - 60 * 1000),
      usedAt: null,
    } as never);

    const res = await resetPassword(jsonRequest({ token: hex, password: 'longenough1' }));

    expect(res.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
