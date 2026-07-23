/**
 * list-contacts.ts — The recipient's praise senders (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * For /account/praise-senders: every non-revoked contact with its memo count,
 * remaining recordings, and whether the invite link is still live. The raw
 * token is NOT recoverable here — it was shown once at creation.
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type TrustedContactView = {
  id: string;
  displayName: string;
  memosRemaining: number;
  inviteExpiresAt: Date;
  /** Live = not revoked, not expired, recordings remaining. */
  inviteActive: boolean;
  memoCount: number;
  createdAt: Date;
};

export async function listTrustedContacts(
  db: PrismaClient,
  userId: string,
  now: Date = new Date(),
): Promise<Result<TrustedContactView[], 'db_error'>> {
  try {
    const contacts = await db.trustedContact.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayName: true,
        memosRemaining: true,
        inviteExpiresAt: true,
        createdAt: true,
        _count: { select: { memos: true } },
      },
    });

    return ok(
      contacts.map((c) => ({
        id: c.id,
        displayName: c.displayName,
        memosRemaining: c.memosRemaining,
        inviteExpiresAt: c.inviteExpiresAt,
        inviteActive: c.memosRemaining > 0 && c.inviteExpiresAt.getTime() > now.getTime(),
        memoCount: c._count.memos,
        createdAt: c.createdAt,
      })),
    );
  } catch (e) {
    console.error('[praise] list-contacts failed:', e);
    return err('db_error', 'Could not load your senders. Please try again.');
  }
}
