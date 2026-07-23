/**
 * report-memo.ts — Report a praise memo (M10, reactive moderation).
 * ──────────────────────────────────────────────────────────────────────────────
 * Creates the content_reports row; the memo disappears from the inbox
 * immediately because the inbox query excludes memos with open reports.
 * The memo row and audio are NEVER deleted here — admins need the content
 * to review (doc 06 §10.6).
 */

import type { ContentReportReason, PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type ReportMemoInput = {
  userId: string;
  memoId: string;
  reasonCategory: ContentReportReason;
  reasonDetails?: string;
};

export type ReportMemoError = 'memo_not_found' | 'forbidden' | 'already_reported' | 'db_error';

export async function reportPraiseMemo(
  db: PrismaClient,
  input: ReportMemoInput,
): Promise<Result<{ reportId: string }, ReportMemoError>> {
  try {
    const memo = await db.praiseMemo.findUnique({
      where: { id: input.memoId },
      select: { id: true, userId: true },
    });
    if (!memo) return err('memo_not_found', 'This memo no longer exists.');
    if (memo.userId !== input.userId) return err('forbidden', 'Access denied.');

    const existing = await db.contentReport.findFirst({
      where: {
        contentType: 'praise_memo',
        contentId: memo.id,
        status: { in: ['pending_review', 'reviewing'] },
      },
      select: { id: true },
    });
    if (existing) {
      return err('already_reported', 'This memo is already with our review team.');
    }

    const report = await db.$transaction(async (tx) => {
      const created = await tx.contentReport.create({
        data: {
          reporterUserId: input.userId,
          // The sender has no account — nothing to point reportedUserId at.
          reportedUserId: null,
          contentType: 'praise_memo',
          contentId: memo.id,
          reasonCategory: input.reasonCategory,
          reasonDetails: input.reasonDetails?.trim() || null,
        },
      });
      await tx.event.create({
        data: {
          userId: input.userId,
          eventType: 'content_report.created',
          payload: { reportId: created.id, contentType: 'praise_memo' },
        },
      });
      return created;
    });

    return ok({ reportId: report.id });
  } catch (e) {
    console.error('[praise] report failed:', e);
    return err('db_error', 'Could not file the report. Please try again.');
  }
}
