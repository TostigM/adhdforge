/**
 * Unit tests: submitPraiseMemo (M10).
 * 60s cap, atomic slot spend, recipient-name precedence, free-tier
 * auto-archival of the oldest active memo, sender IP storage (D4).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';
import { generateInviteToken } from '../invite-token';
import { submitPraiseMemo, MAX_MEMO_DURATION_MS, FREE_ACTIVE_MEMO_LIMIT } from '../submit-memo';

const token = generateInviteToken();

const BASE_INPUT = {
  rawToken: token.raw,
  audioPath: 'praise/u1/m_new.webm',
  audioDurationMs: 42_000,
  audioSizeBytes: 500_000,
  senderIp: Buffer.from([203, 0, 113, 7]),
};

describe('submitPraiseMemo', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    // verify-invite path
    db.trustedContact.findUnique
      .mockResolvedValueOnce({
        id: 'c1',
        userId: 'recipient_1',
        displayName: 'Mom',
        memosRemaining: 2,
        inviteExpiresAt: new Date(Date.now() + 86_400_000),
        isRevoked: false,
      })
      // post-decrement re-read inside the transaction
      .mockResolvedValue({ memosRemaining: 1 });
    db.user.findUnique.mockResolvedValue({ tier: 'free' });
    db.trustedContact.updateMany.mockResolvedValue({ count: 1 });
    db.praiseMemo.findMany.mockResolvedValue([]);
    db.praiseMemo.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: 'memo_new', ...data }),
    );
    db.praiseMemo.update.mockResolvedValue({});
    db.event.create.mockResolvedValue({});
  });

  it('rejects audio over 60 seconds', async () => {
    const r = await submitPraiseMemo(db, {
      ...BASE_INPUT,
      audioDurationMs: MAX_MEMO_DURATION_MS + 1,
    });
    expect(r).toMatchObject({ ok: false, error: 'audio_too_long' });
    expect(db.praiseMemo.create).not.toHaveBeenCalled();
  });

  it('rejects zero/NaN duration or size', async () => {
    expect((await submitPraiseMemo(db, { ...BASE_INPUT, audioDurationMs: 0 })).ok).toBe(false);
    expect(
      (await submitPraiseMemo(db, { ...BASE_INPUT, audioSizeBytes: Number.NaN })).ok,
    ).toBe(false);
  });

  it("stores the RECIPIENT's display name — their framing wins (doc 01 §10.2)", async () => {
    const r = await submitPraiseMemo(db, BASE_INPUT);
    expect(r.ok).toBe(true);
    expect(db.praiseMemo.create.mock.calls[0]?.[0].data.senderDisplayName).toBe('Mom');
  });

  it('stores the sender IP for the 7-day abuse window (D4)', async () => {
    await submitPraiseMemo(db, BASE_INPUT);
    const stored = db.praiseMemo.create.mock.calls[0]?.[0].data.senderIp;
    expect(stored).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(stored).equals(Buffer.from([203, 0, 113, 7]))).toBe(true);
  });

  it('spends the invite slot atomically — a raced-out submit is refused', async () => {
    db.trustedContact.updateMany.mockResolvedValue({ count: 0 });
    const r = await submitPraiseMemo(db, BASE_INPUT);
    expect(r).toMatchObject({ ok: false, error: 'invite_not_active' });
    expect(db.praiseMemo.create).not.toHaveBeenCalled();
  });

  it('auto-archives the oldest active memo when a free recipient already has 3', async () => {
    db.praiseMemo.findMany.mockResolvedValue([
      { id: 'oldest' },
      { id: 'mid' },
      { id: 'newest' },
    ]);
    const r = await submitPraiseMemo(db, BASE_INPUT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.archivedMemoId).toBe('oldest');
    expect(db.praiseMemo.update).toHaveBeenCalledWith({
      where: { id: 'oldest' },
      data: { isArchived: true },
    });
  });

  it(`does not archive below the ${FREE_ACTIVE_MEMO_LIMIT}-memo threshold`, async () => {
    db.praiseMemo.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const r = await submitPraiseMemo(db, BASE_INPUT);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.archivedMemoId).toBeNull();
    expect(db.praiseMemo.update).not.toHaveBeenCalled();
  });

  it('paid recipients never auto-archive', async () => {
    db.user.findUnique.mockResolvedValue({ tier: 'paid' });
    const r = await submitPraiseMemo(db, BASE_INPUT);
    expect(r.ok).toBe(true);
    expect(db.praiseMemo.findMany).not.toHaveBeenCalled();
  });

  it('logs praise_memo.received for the recipient (drives the sync poll)', async () => {
    await submitPraiseMemo(db, BASE_INPUT);
    expect(db.event.create).toHaveBeenCalledWith({
      data: {
        userId: 'recipient_1',
        eventType: 'praise_memo.received',
        payload: { memoId: 'memo_new' },
      },
    });
  });

  it('returns db_error (never throws) when the transaction fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    db.praiseMemo.create.mockRejectedValue(new Error('boom'));
    const r = await submitPraiseMemo(db, BASE_INPUT);
    expect(r).toMatchObject({ ok: false, error: 'db_error' });
    spy.mockRestore();
  });
});
