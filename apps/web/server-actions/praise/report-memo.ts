'use server';

/**
 * Server Action: Report Praise Memo (M10, reactive moderation)
 * The memo disappears from the inbox immediately (derived hiding); it is
 * never deleted here — the review team needs the content.
 */

import { revalidatePath } from 'next/cache';
import type { ContentReportReason } from '@prisma/client';

import { db } from '@focus-forge/database/client';
import { reportPraiseMemo } from '@focus-forge/domain/praise/report-memo';

import { requireUser } from '@/lib/require-user';

export type ReportMemoResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function reportPraiseMemoAction(
  memoId: string,
  reasonCategory: ContentReportReason,
  reasonDetails?: string,
): Promise<ReportMemoResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await reportPraiseMemo(db, {
    userId: auth.userId,
    memoId,
    reasonCategory,
    reasonDetails,
  });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/praise');
  return { ok: true };
}
