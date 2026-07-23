/**
 * Unit tests: inbox (hidden-by-report derivation), play (quota gate),
 * report (dedupe), and the 7-day sender-IP purge (M10).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';
import { getPraiseInbox } from '../list-inbox';
import { playPraiseMemo, PLAY_QUOTA_SOFT_MESSAGE } from '../play-memo';
import { reportPraiseMemo } from '../report-memo';
import { purgeSenderIps, SENDER_IP_RETENTION_MS } from '../purge-sender-ips';

vi.mock('../../quota/check-quota', () => ({ checkQuota: vi.fn() }));
vi.mock('../../quota/increment-quota', () => ({ incrementQuota: vi.fn() }));

import { checkQuota } from '../../quota/check-quota';
import { incrementQuota } from '../../quota/increment-quota';

const memoRow = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  senderDisplayName: 'Mom',
  audioDurationMs: 30_000,
  transcript: null,
  transcriptStatus: 'pending',
  category: null,
  isArchived: false,
  playCount: 0,
  lastPlayedAt: null,
  createdAt: new Date('2026-07-15T00:00:00Z'),
  ...over,
});

describe('getPraiseInbox', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.contentReport.findMany.mockResolvedValue([]);
    db.praiseMemo.findMany.mockResolvedValue([
      memoRow('m1'),
      memoRow('m2', { isArchived: true }),
    ]);
  });

  it('splits active and archived memos', async () => {
    const r = await getPraiseInbox(db, 'u1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.memos.map((m) => m.id)).toEqual(['m1']);
    expect(r.value.archived.map((m) => m.id)).toEqual(['m2']);
  });

  it('excludes memos with an open report via the query (derived hiding)', async () => {
    db.contentReport.findMany.mockResolvedValue([{ contentId: 'm_reported' }]);
    await getPraiseInbox(db, 'u1');
    const where = db.praiseMemo.findMany.mock.calls[0]?.[0].where;
    expect(where.id).toEqual({ notIn: ['m_reported'] });
    // and only OPEN statuses hide — resolved_no_action must NOT be in the filter
    const statusFilter = db.contentReport.findMany.mock.calls[0]?.[0].where.status.in;
    expect(statusFilter).toContain('pending_review');
    expect(statusFilter).not.toContain('resolved_no_action');
  });
});

describe('playPraiseMemo', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.praiseMemo.findUnique.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      audioPath: 'praise/u1/m1.webm',
    });
    vi.mocked(checkQuota).mockResolvedValue({
      allowed: true,
      used: 3,
      limit: 15,
      resetsAtUtc: new Date(),
    } as never);
    db.praiseMemo.update.mockResolvedValue({});
    db.event.create.mockResolvedValue({});
  });

  it("rejects another user's memo", async () => {
    const r = await playPraiseMemo(db, { userId: 'intruder', memoId: 'm1' });
    expect(r).toMatchObject({ ok: false, error: 'forbidden' });
    expect(checkQuota).not.toHaveBeenCalled();
  });

  it('blocks over quota with the approved soft message, VERBATIM', async () => {
    vi.mocked(checkQuota).mockResolvedValue({ allowed: false, used: 15, limit: 15 } as never);
    const r = await playPraiseMemo(db, { userId: 'u1', memoId: 'm1' });
    expect(r).toMatchObject({ ok: false, error: 'quota_reached' });
    if (!r.ok) {
      expect(r.message).toBe(PLAY_QUOTA_SOFT_MESSAGE);
      expect(r.message).not.toMatch(/too much/i); // never usage-shaming
    }
    expect(db.praiseMemo.update).not.toHaveBeenCalled();
  });

  it('grants the play: counts it, logs play_started, meters the quota', async () => {
    const r = await playPraiseMemo(db, { userId: 'u1', memoId: 'm1' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.audioPath).toBe('praise/u1/m1.webm');
    expect(db.praiseMemo.update.mock.calls[0]?.[0].data.playCount).toEqual({ increment: 1 });
    expect(db.event.create.mock.calls[0]?.[0].data.eventType).toBe('praise_memo.play_started');
    expect(incrementQuota).toHaveBeenCalledWith(db, 'u1', 'praise_play');
  });
});

describe('reportPraiseMemo', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.praiseMemo.findUnique.mockResolvedValue({ id: 'm1', userId: 'u1' });
    db.contentReport.findFirst.mockResolvedValue(null);
    db.contentReport.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: 'report_1', ...data }),
    );
    db.event.create.mockResolvedValue({});
  });

  it('creates the report row with no reportedUserId (sender has no account)', async () => {
    const r = await reportPraiseMemo(db, {
      userId: 'u1',
      memoId: 'm1',
      reasonCategory: 'inappropriate',
      reasonDetails: '  details  ',
    });
    expect(r.ok).toBe(true);
    const data = db.contentReport.create.mock.calls[0]?.[0].data;
    expect(data).toMatchObject({
      reporterUserId: 'u1',
      reportedUserId: null,
      contentType: 'praise_memo',
      contentId: 'm1',
      reasonCategory: 'inappropriate',
      reasonDetails: 'details',
    });
  });

  it('refuses a duplicate open report', async () => {
    db.contentReport.findFirst.mockResolvedValue({ id: 'existing' });
    const r = await reportPraiseMemo(db, {
      userId: 'u1',
      memoId: 'm1',
      reasonCategory: 'spam',
    });
    expect(r).toMatchObject({ ok: false, error: 'already_reported' });
    expect(db.contentReport.create).not.toHaveBeenCalled();
  });
});

describe('purgeSenderIps', () => {
  it('nulls IPs on memos older than 7 days, and only those', async () => {
    const db = makeMockPrisma();
    db.praiseMemo.updateMany.mockResolvedValue({ count: 4 });
    const now = new Date('2026-07-17T00:00:00Z');

    const r = await purgeSenderIps(db, now);
    expect(r).toMatchObject({ ok: true, value: { purged: 4 } });

    const call = db.praiseMemo.updateMany.mock.calls[0]?.[0];
    expect(call?.data).toEqual({ senderIp: null });
    expect(call?.where.senderIp).toEqual({ not: null });
    expect(call?.where.createdAt.lt.getTime()).toBe(now.getTime() - SENDER_IP_RETENTION_MS);
  });
});
