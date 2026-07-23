/**
 * play-memo.ts — Record a play and clear the quota gate (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Quota (doc 05 §2.1–2.2): praise_play — 15/day free, 30/day Pro. The check
 * runs BEFORE the play is granted; the increment lands on play_started, per
 * doc 06 §10.5. The over-quota message is the approved soft copy, verbatim —
 * a usage safeguard, never "you're using this too much" (Rule 5).
 *
 * Returns the memo's audioPath; the CALLER exchanges it for a 1-hour signed
 * URL (domain stays storage-agnostic).
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { checkQuota } from '../quota/check-quota';
import { incrementQuota } from '../quota/increment-quota';

export type PlayMemoInput = {
  userId: string;
  memoId: string;
};

export type PlayMemoError = 'memo_not_found' | 'forbidden' | 'quota_reached' | 'db_error';

export type PlayMemoResult = {
  audioPath: string;
  quotaUsed: number;
  quotaLimit: number | 'unlimited';
};

export const PLAY_QUOTA_SOFT_MESSAGE =
  'Take a breath. Come back tomorrow if you still need to listen. Your memos will be here.';

export async function playPraiseMemo(
  db: PrismaClient,
  input: PlayMemoInput,
): Promise<Result<PlayMemoResult, PlayMemoError>> {
  try {
    const memo = await db.praiseMemo.findUnique({
      where: { id: input.memoId },
      select: { id: true, userId: true, audioPath: true },
    });
    if (!memo) return err('memo_not_found', 'This memo no longer exists.');
    if (memo.userId !== input.userId) return err('forbidden', 'Access denied.');

    const quota = await checkQuota(db, input.userId, 'praise_play');
    if (!quota.allowed) {
      return err('quota_reached', PLAY_QUOTA_SOFT_MESSAGE);
    }

    await db.$transaction([
      db.praiseMemo.update({
        where: { id: memo.id },
        data: { playCount: { increment: 1 }, lastPlayedAt: new Date() },
      }),
      db.event.create({
        data: {
          userId: input.userId,
          eventType: 'praise_memo.play_started',
          payload: { memoId: memo.id },
        },
      }),
    ]);

    // Best-effort by design (own try/catch inside) — a metering hiccup never
    // blocks a play the check already allowed.
    await incrementQuota(db, input.userId, 'praise_play');

    return ok({ audioPath: memo.audioPath, quotaUsed: quota.used + 1, quotaLimit: quota.limit });
  } catch (e) {
    console.error('[praise] play failed:', e);
    return err('db_error', 'Could not start playback. Please try again.');
  }
}
