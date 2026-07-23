/**
 * list-inbox.ts — The recipient's praise inbox (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Hidden-on-report is DERIVED, not stored: a memo with an open report
 * (pending_review / reviewing / resolved_action_taken) is excluded by query,
 * so a report resolved as 'no action' restores visibility automatically —
 * one source of truth, nothing to un-flag.
 */

import type { PraiseTranscriptStatus, PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type PraiseMemoView = {
  id: string;
  senderDisplayName: string;
  audioDurationMs: number;
  transcript: string | null;
  transcriptStatus: PraiseTranscriptStatus;
  category: string | null;
  isArchived: boolean;
  playCount: number;
  lastPlayedAt: Date | null;
  createdAt: Date;
};

export type PraiseInbox = {
  /** Active (non-archived, non-hidden), newest first. */
  memos: PraiseMemoView[];
  /** Archived but still playable, newest first. */
  archived: PraiseMemoView[];
  hiddenByReportCount: number;
};

export type ListInboxError = 'db_error';

const OPEN_REPORT_STATUSES = ['pending_review', 'reviewing', 'resolved_action_taken'] as const;

const MEMO_SELECT = {
  id: true,
  senderDisplayName: true,
  audioDurationMs: true,
  transcript: true,
  transcriptStatus: true,
  category: true,
  isArchived: true,
  playCount: true,
  lastPlayedAt: true,
  createdAt: true,
} as const;

export async function getPraiseInbox(
  db: PrismaClient,
  userId: string,
): Promise<Result<PraiseInbox, ListInboxError>> {
  try {
    const openReports = await db.contentReport.findMany({
      where: {
        reporterUserId: userId,
        contentType: 'praise_memo',
        status: { in: [...OPEN_REPORT_STATUSES] },
        contentId: { not: null },
      },
      select: { contentId: true },
    });
    const hiddenIds = openReports
      .map((r) => r.contentId)
      .filter((id): id is string => id !== null);

    const all = await db.praiseMemo.findMany({
      where: {
        userId,
        ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: MEMO_SELECT,
    });

    return ok({
      memos: all.filter((m) => !m.isArchived),
      archived: all.filter((m) => m.isArchived),
      hiddenByReportCount: hiddenIds.length,
    });
  } catch (e) {
    console.error('[praise] inbox failed:', e);
    return err('db_error', 'Could not load your memos. Please try again.');
  }
}
