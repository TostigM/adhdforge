/**
 * Unit tests: reactive moderation (M10, doc 06 §10.6).
 * Content access only through open reports; resolution paths; memo removal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';
import { getReportForReview, listOpenReports, resolveReport } from '../admin-review';

describe('listOpenReports', () => {
  it('queries only open praise_memo reports, oldest first', async () => {
    const db = makeMockPrisma();
    db.contentReport.findMany.mockResolvedValue([]);
    await listOpenReports(db);
    const call = db.contentReport.findMany.mock.calls[0]?.[0];
    expect(call?.where.status.in).toEqual(['pending_review', 'reviewing']);
    expect(call?.orderBy).toEqual({ createdAt: 'asc' });
  });
});

describe('getReportForReview', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  const openReport = {
    id: 'r1',
    status: 'pending_review',
    contentType: 'praise_memo',
    contentId: 'm1',
    reasonCategory: 'harassment',
    reasonDetails: 'details',
  };

  beforeEach(() => {
    db = makeMockPrisma();
    db.contentReport.findUnique.mockResolvedValue(openReport);
    db.praiseMemo.findUnique.mockResolvedValue({
      id: 'm1',
      audioPath: 'praise/u1/m1.webm',
      audioDurationMs: 30_000,
      senderDisplayName: 'Mom',
    });
    db.contentReport.update.mockResolvedValue({});
  });

  it('opens the memo and moves pending_review → reviewing with the reviewer stamped', async () => {
    const r = await getReportForReview(db, { reportId: 'r1', adminUserId: 'admin_1' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.audioPath).toBe('praise/u1/m1.webm');
    const update = db.contentReport.update.mock.calls[0]?.[0];
    expect(update?.data.status).toBe('reviewing');
    expect(update?.data.reviewedByAdminId).toBe('admin_1');
  });

  it.each([
    ['resolved', { ...openReport, status: 'resolved_no_action' }],
    ['duplicate', { ...openReport, status: 'duplicate' }],
    ['missing', null],
  ])('refuses content access for a %s report — no open report, no audio', async (_l, row) => {
    db.contentReport.findUnique.mockResolvedValue(row);
    const r = await getReportForReview(db, { reportId: 'r1', adminUserId: 'admin_1' });
    expect(r).toMatchObject({ ok: false, error: 'report_not_reviewable' });
    expect(db.praiseMemo.findUnique).not.toHaveBeenCalled();
  });
});

describe('resolveReport', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.contentReport.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'reviewing',
      contentType: 'praise_memo',
      contentId: 'm1',
    });
    db.praiseMemo.findUnique.mockResolvedValue({ audioPath: 'praise/u1/m1.webm' });
    db.praiseMemo.delete.mockResolvedValue({});
    db.contentReport.update.mockResolvedValue({});
  });

  it('no_action keeps the memo (inbox visibility returns automatically)', async () => {
    const r = await resolveReport(db, {
      reportId: 'r1',
      adminUserId: 'admin_1',
      resolution: 'resolved_no_action',
      reviewNotes: 'Benign — grandma being grandma.',
    });
    expect(r).toMatchObject({ ok: true, value: { removedAudioPath: null } });
    expect(db.praiseMemo.delete).not.toHaveBeenCalled();
    expect(db.contentReport.update.mock.calls[0]?.[0].data.status).toBe('resolved_no_action');
  });

  it('action_taken requires the action to be named', async () => {
    const r = await resolveReport(db, {
      reportId: 'r1',
      adminUserId: 'admin_1',
      resolution: 'resolved_action_taken',
      reviewNotes: 'Removing.',
    });
    expect(r).toMatchObject({ ok: false, error: 'action_required' });
  });

  it('memo_removed deletes the row atomically and returns the path for R2 cleanup', async () => {
    const r = await resolveReport(db, {
      reportId: 'r1',
      adminUserId: 'admin_1',
      resolution: 'resolved_action_taken',
      reviewNotes: 'Clear harassment.',
      actionTaken: 'memo_removed',
    });
    expect(r).toMatchObject({ ok: true, value: { removedAudioPath: 'praise/u1/m1.webm' } });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(db.praiseMemo.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('refuses to resolve an already-closed report', async () => {
    db.contentReport.findUnique.mockResolvedValue({
      id: 'r1',
      status: 'resolved_no_action',
      contentType: 'praise_memo',
      contentId: 'm1',
    });
    const r = await resolveReport(db, {
      reportId: 'r1',
      adminUserId: 'admin_1',
      resolution: 'resolved_no_action',
      reviewNotes: 'again',
    });
    expect(r).toMatchObject({ ok: false, error: 'report_not_reviewable' });
  });
});
