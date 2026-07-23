/**
 * submit-memo.ts — A sender submits a recorded memo (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Re-verifies the token, enforces the 60-second cap, decrements the invite's
 * memosRemaining atomically (two tabs can't spend the same slot), snapshots
 * the RECIPIENT's display name (doc 01 §10.2 — their framing wins), and
 * auto-archives the oldest active memo when a free-tier recipient already has
 * three (doc 06 §10.3). All rows commit in one transaction.
 *
 * senderIp (D4, AGENTS.md §5.20): stored for 7 days for abuse investigation,
 * then nulled by the daily cron. Caller passes the already-packed bytes.
 */

import type { PraiseTranscriptStatus, PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { verifyPraiseInvite } from './verify-invite';

export const MAX_MEMO_DURATION_MS = 60_000;
export const FREE_ACTIVE_MEMO_LIMIT = 3;

const UNLIMITED_TIERS = new Set(['comp', 'paid', 'paid_lifetime', 'pro_plus']);

export type SubmitMemoInput = {
  rawToken: string;
  audioPath: string;
  audioDurationMs: number;
  audioSizeBytes: number;
  /** 4- or 16-byte packed IP, or null when unavailable. */
  senderIp: Buffer | null;
  /** Set by the caller when it transcribed (Pro recipients). */
  transcript?: string;
  transcriptStatus?: PraiseTranscriptStatus;
};

export type SubmitMemoError =
  | 'invite_not_active'
  | 'audio_too_long'
  | 'audio_invalid'
  | 'db_error';

export type SubmitMemoResult = {
  memoId: string;
  recipientUserId: string;
  memosRemaining: number;
  /** Path of a memo auto-archived to make room, if any (informational). */
  archivedMemoId: string | null;
};

export async function submitPraiseMemo(
  db: PrismaClient,
  input: SubmitMemoInput,
  now: Date = new Date(),
): Promise<Result<SubmitMemoResult, SubmitMemoError>> {
  if (
    !Number.isFinite(input.audioDurationMs) ||
    input.audioDurationMs <= 0 ||
    !Number.isInteger(input.audioSizeBytes) ||
    input.audioSizeBytes <= 0
  ) {
    return err('audio_invalid', 'That recording didn’t come through. Please try again.');
  }
  if (input.audioDurationMs > MAX_MEMO_DURATION_MS) {
    return err('audio_too_long', 'Memos can be up to 60 seconds. A short one lands just as well.');
  }

  const invite = await verifyPraiseInvite(db, input.rawToken, now);
  if (!invite.ok) {
    return invite.error === 'db_error'
      ? err('db_error', invite.message)
      : err('invite_not_active', invite.message);
  }
  const { contactId, recipientUserId, displayName } = invite.value;

  try {
    const recipient = await db.user.findUnique({
      where: { id: recipientUserId },
      select: { tier: true },
    });
    const limited = !recipient || !UNLIMITED_TIERS.has(recipient.tier);

    const outcome = await db.$transaction(async (tx) => {
      // Atomic slot spend — count 0 means a concurrent submit won the race.
      const spent = await tx.trustedContact.updateMany({
        where: { id: contactId, isRevoked: false, memosRemaining: { gt: 0 } },
        data: { memosRemaining: { decrement: 1 } },
      });
      if (spent.count === 0) return { raced: true as const };

      // Free tier: keep at most 3 active — archive the oldest to make room.
      let archivedMemoId: string | null = null;
      if (limited) {
        const active = await tx.praiseMemo.findMany({
          where: { userId: recipientUserId, isArchived: false },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (active.length >= FREE_ACTIVE_MEMO_LIMIT) {
          const oldest = active[0];
          if (oldest) {
            await tx.praiseMemo.update({
              where: { id: oldest.id },
              data: { isArchived: true },
            });
            archivedMemoId = oldest.id;
          }
        }
      }

      const memo = await tx.praiseMemo.create({
        data: {
          userId: recipientUserId,
          trustedContactId: contactId,
          // Recipient's framing wins (doc 01 §10.2); snapshot it now.
          senderDisplayName: displayName,
          audioPath: input.audioPath,
          audioDurationMs: Math.round(input.audioDurationMs),
          audioSizeBytes: input.audioSizeBytes,
          transcript: input.transcript ?? null,
          transcriptStatus: input.transcriptStatus ?? 'pending',
          senderIp: input.senderIp ? new Uint8Array(input.senderIp) : null,
        },
      });

      await tx.event.create({
        data: {
          userId: recipientUserId,
          eventType: 'praise_memo.received',
          payload: { memoId: memo.id },
        },
      });

      const contact = await tx.trustedContact.findUnique({
        where: { id: contactId },
        select: { memosRemaining: true },
      });

      return {
        raced: false as const,
        memoId: memo.id,
        memosRemaining: contact?.memosRemaining ?? 0,
        archivedMemoId,
      };
    });

    if (outcome.raced) {
      return err('invite_not_active', 'This invite has no recordings left.');
    }

    return ok({
      memoId: outcome.memoId,
      recipientUserId,
      memosRemaining: outcome.memosRemaining,
      archivedMemoId: outcome.archivedMemoId,
    });
  } catch (e) {
    console.error('[praise] submit-memo failed:', e);
    return err('db_error', 'Could not save the memo. Please try again.');
  }
}
