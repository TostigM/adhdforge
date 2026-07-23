/**
 * Unit tests: praise invite lifecycle (M10).
 * Token generation/hashing, contact limits, verification failure modes, and
 * revocation (deletes memos, returns audio paths for storage cleanup).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';
import { generateInviteToken, hashInviteToken } from '../invite-token';
import { createPraiseInvite, FREE_TRUSTED_CONTACT_LIMIT, INVITE_TTL_MS } from '../create-invite';
import { verifyPraiseInvite } from '../verify-invite';
import { revokePraiseContact } from '../revoke-invite';

describe('invite tokens', () => {
  it('generates 64-hex raw tokens with 32-byte hashes', () => {
    const t = generateInviteToken();
    expect(t.raw).toMatch(/^[0-9a-f]{64}$/);
    expect(t.hash.length).toBe(32);
  });

  it('hashInviteToken round-trips a generated token', () => {
    const t = generateInviteToken();
    expect(hashInviteToken(t.raw)?.equals(t.hash)).toBe(true);
  });

  it('rejects malformed tokens without hashing', () => {
    expect(hashInviteToken('nope')).toBeNull();
    expect(hashInviteToken('z'.repeat(64))).toBeNull();
    expect(hashInviteToken('ab'.repeat(31))).toBeNull();
  });

  it('two tokens never collide', () => {
    expect(generateInviteToken().raw).not.toBe(generateInviteToken().raw);
  });
});

describe('createPraiseInvite', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.user.findUnique.mockResolvedValue({ tier: 'free' });
    db.trustedContact.count.mockResolvedValue(0);
    db.trustedContact.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: 'contact_1', ...data }),
    );
    db.event.create.mockResolvedValue({});
  });

  it('rejects an empty or over-long display name', async () => {
    expect((await createPraiseInvite(db, { userId: 'u1', displayName: '  ' })).ok).toBe(false);
    expect(
      (await createPraiseInvite(db, { userId: 'u1', displayName: 'x'.repeat(81) })).ok,
    ).toBe(false);
    expect(db.trustedContact.create).not.toHaveBeenCalled();
  });

  it('creates a contact with a hashed token and creation+7d expiry (D2)', async () => {
    const before = Date.now();
    const r = await createPraiseInvite(db, { userId: 'u1', displayName: 'Mom' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.rawToken).toMatch(/^[0-9a-f]{64}$/);
    const created = db.trustedContact.create.mock.calls[0]?.[0].data;
    expect(created.displayName).toBe('Mom');
    // Stored as a fresh Uint8Array copy (Prisma 6 Bytes typing), 32 bytes = SHA-256
    expect(created.inviteTokenHash).toBeInstanceOf(Uint8Array);
    expect(created.inviteTokenHash.length).toBe(32);
    // The raw token itself must never be stored
    expect(JSON.stringify(created)).not.toContain(r.value.rawToken);
    const expiry = created.inviteExpiresAt.getTime() - before;
    expect(expiry).toBeGreaterThan(INVITE_TTL_MS - 5_000);
    expect(expiry).toBeLessThan(INVITE_TTL_MS + 5_000);
  });

  it('enforces the 5-contact free limit', async () => {
    db.trustedContact.count.mockResolvedValue(FREE_TRUSTED_CONTACT_LIMIT);
    const r = await createPraiseInvite(db, { userId: 'u1', displayName: 'Six' });
    expect(r).toMatchObject({ ok: false, error: 'contact_limit_reached' });
  });

  it('paid tiers skip the contact limit entirely', async () => {
    db.user.findUnique.mockResolvedValue({ tier: 'paid' });
    const r = await createPraiseInvite(db, { userId: 'u1', displayName: 'Coach' });
    expect(r.ok).toBe(true);
    expect(db.trustedContact.count).not.toHaveBeenCalled();
  });

  it('returns db_error (never throws) when the write fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    db.trustedContact.create.mockRejectedValue(new Error('boom'));
    const r = await createPraiseInvite(db, { userId: 'u1', displayName: 'Mom' });
    expect(r).toMatchObject({ ok: false, error: 'db_error' });
    spy.mockRestore();
  });
});

describe('verifyPraiseInvite', () => {
  let db: ReturnType<typeof makeMockPrisma>;
  const NOW = new Date('2026-07-17T12:00:00Z');
  const FUTURE = new Date('2026-07-20T12:00:00Z');
  const token = generateInviteToken();

  const activeContact = {
    id: 'contact_1',
    userId: 'u1',
    displayName: 'Mom',
    memosRemaining: 3,
    inviteExpiresAt: FUTURE,
    isRevoked: false,
  };

  beforeEach(() => {
    db = makeMockPrisma();
    db.trustedContact.findUnique.mockResolvedValue(activeContact);
  });

  it('resolves an active invite', async () => {
    const r = await verifyPraiseInvite(db, token.raw, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toMatchObject({ contactId: 'contact_1', displayName: 'Mom' });
  });

  it('rejects a malformed token without touching the DB', async () => {
    const r = await verifyPraiseInvite(db, 'not-a-token', NOW);
    expect(r).toMatchObject({ ok: false, error: 'invite_not_active' });
    expect(db.trustedContact.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown', null],
    ['revoked', { ...activeContact, isRevoked: true }],
    ['exhausted', { ...activeContact, memosRemaining: 0 }],
    ['expired', { ...activeContact, inviteExpiresAt: new Date('2026-07-01T00:00:00Z') }],
  ])('returns the SAME calm error for a %s invite (no reason leaking)', async (_label, row) => {
    db.trustedContact.findUnique.mockResolvedValue(row);
    const r = await verifyPraiseInvite(db, token.raw, NOW);
    expect(r).toMatchObject({ ok: false, error: 'invite_not_active' });
    if (!r.ok) expect(r.message).toMatch(/isn’t active/);
  });
});

describe('revokePraiseContact', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.trustedContact.findUnique.mockResolvedValue({ id: 'c1', userId: 'u1', isRevoked: false });
    db.praiseMemo.findMany.mockResolvedValue([
      { audioPath: 'praise/u1/m1.webm' },
      { audioPath: 'praise/u1/m2.webm' },
    ]);
    db.praiseMemo.deleteMany.mockResolvedValue({ count: 2 });
    db.trustedContact.update.mockResolvedValue({});
    db.event.create.mockResolvedValue({});
  });

  it("rejects another user's contact", async () => {
    const r = await revokePraiseContact(db, { userId: 'intruder', contactId: 'c1' });
    expect(r).toMatchObject({ ok: false, error: 'forbidden' });
    expect(db.praiseMemo.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes memo rows, marks revoked, and returns audio paths for R2 cleanup', async () => {
    const r = await revokePraiseContact(db, { userId: 'u1', contactId: 'c1' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.audioPaths).toEqual(['praise/u1/m1.webm', 'praise/u1/m2.webm']);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.praiseMemo.deleteMany).toHaveBeenCalledWith({
      where: { trustedContactId: 'c1' },
    });
    expect(db.trustedContact.update.mock.calls[0]?.[0].data.isRevoked).toBe(true);
  });
});
