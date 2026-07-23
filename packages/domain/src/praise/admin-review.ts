/**
 * admin-review.ts — Reactive moderation of reported memos (M10, doc 06 §10.6).
 * ──────────────────────────────────────────────────────────────────────────────
 * Privacy boundary, enforced here regardless of caller: memo content is only
 * reachable through a report in 'pending_review' or 'reviewing'. There is no
 * function that lists or opens memo audio outside a report — that absence is
 * the design. Every content access is audit-logged by the caller (the action
 * wraps this + logAdminAction in one transaction).
 *
 * Resolution paths:
 *   resolved_no_action   → memo reappears in the inbox automatically (the
 *                          inbox query only hides memos with OPEN reports).
 *   resolved_action_taken (memo_removed) → memo row deleted here; the caller
 *                          deletes the R2 object best-effort.
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Queue ────────────────────────────────────────────────────────────────────

export type ReportQueueItem = {
  id: string;
  reasonCategory: string;
  reasonDetails: string | null;
  status: string;
  memoId: string | null;
  createdAt: Date;
};

export async function listOpenReports(
  db: PrismaClient,
): Promise<Result<ReportQueueItem[], 'db_error'>> {
  try {
    const reports = await db.contentReport.findMany({
      where: { contentType: 'praise_memo', status: { in: ['pending_review', 'reviewing'] } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        reasonCategory: true,
        reasonDetails: true,
        status: true,
        contentId: true,
        createdAt: true,
      },
    });
    return ok(
      reports.map((r) => ({
        id: r.id,
        reasonCategory: r.reasonCategory,
        reasonDetails: r.reasonDetails,
        status: r.status,
        memoId: r.contentId,
        createdAt: r.createdAt,
      })),
    );
  } catch (e) {
    console.error('[praise] report queue failed:', e);
    return err('db_error', 'Could not load the report queue.');
  }
}

// ─── Time-bounded content access ──────────────────────────────────────────────

export type ReviewAccessError = 'report_not_reviewable' | 'db_error';

export type ReviewAccess = {
  reportId: string;
  memoId: string;
  /** Caller exchanges this for a 30-minute signed URL. */
  audioPath: string;
  audioDurationMs: number;
  senderDisplayName: string;
  reasonCategory: string;
  reasonDetails: string | null;
};

/**
 * Opens a reported memo for review. Also moves a 'pending_review' report to
 * 'reviewing' and stamps the reviewer, so the queue shows who has it.
 */
export async function getReportForReview(
  db: PrismaClient,
  input: { reportId: string; adminUserId: string },
): Promise<Result<ReviewAccess, ReviewAccessError>> {
  try {
    const report = await db.contentReport.findUnique({
      where: { id: input.reportId },
      select: { id: true, status: true, contentType: true, contentId: true, reasonCategory: true, reasonDetails: true },
    });
    if (
      !report ||
      report.contentType !== 'praise_memo' ||
      !report.contentId ||
      !['pending_review', 'reviewing'].includes(report.status)
    ) {
      return err('report_not_reviewable', 'This report is not open for review.');
    }

    const memo = await db.praiseMemo.findUnique({
      where: { id: report.contentId },
      select: { id: true, audioPath: true, audioDurationMs: true, senderDisplayName: true },
    });
    if (!memo) return err('report_not_reviewable', 'The reported memo no longer exists.');

    if (report.status === 'pending_review') {
      await db.contentReport.update({
        where: { id: report.id },
        data: { status: 'reviewing', reviewedByAdminId: input.adminUserId, reviewedAt: new Date() },
      });
    }

    return ok({
      reportId: report.id,
      memoId: memo.id,
      audioPath: memo.audioPath,
      audioDurationMs: memo.audioDurationMs,
      senderDisplayName: memo.senderDisplayName,
      reasonCategory: report.reasonCategory,
      reasonDetails: report.reasonDetails,
    });
  } catch (e) {
    console.error('[praise] review access failed:', e);
    return err('db_error', 'Could not open this report.');
  }
}

// ─── Resolution ───────────────────────────────────────────────────────────────

export type ResolveReportInput = {
  reportId: string;
  adminUserId: string;
  resolution: 'resolved_no_action' | 'resolved_action_taken';
  reviewNotes: string;
  /** Required when resolution is action_taken, e.g. 'memo_removed'. */
  actionTaken?: string;
};

export type ResolveReportError = 'report_not_reviewable' | 'action_required' | 'db_error';

export type ResolveReportResult = {
  /** Set when the memo was removed — caller deletes the R2 object. */
  removedAudioPath: string | null;
};

export async function resolveReport(
  db: PrismaClient,
  input: ResolveReportInput,
): Promise<Result<ResolveReportResult, ResolveReportError>> {
  if (input.resolution === 'resolved_action_taken' && !input.actionTaken?.trim()) {
    return err('action_required', 'Name the action taken (e.g. memo_removed).');
  }

  try {
    const report = await db.contentReport.findUnique({
      where: { id: input.reportId },
      select: { id: true, status: true, contentType: true, contentId: true },
    });
    if (
      !report ||
      report.contentType !== 'praise_memo' ||
      !['pending_review', 'reviewing'].includes(report.status)
    ) {
      return err('report_not_reviewable', 'This report is not open for review.');
    }

    let removedAudioPath: string | null = null;

    await db.$transaction(async (tx) => {
      if (input.resolution === 'resolved_action_taken' && report.contentId) {
        const memo = await tx.praiseMemo.findUnique({
          where: { id: report.contentId },
          select: { audioPath: true },
        });
        if (memo) {
          removedAudioPath = memo.audioPath;
          await tx.praiseMemo.delete({ where: { id: report.contentId } });
        }
      }

      await tx.contentReport.update({
        where: { id: report.id },
        data: {
          status: input.resolution,
          reviewedByAdminId: input.adminUserId,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes.trim() || null,
          actionTaken: input.resolution === 'resolved_action_taken' ? input.actionTaken!.trim() : null,
        },
      });
    });

    return ok({ removedAudioPath });
  } catch (e) {
    console.error('[praise] resolve failed:', e);
    return err('db_error', 'Could not resolve this report.');
  }
}
