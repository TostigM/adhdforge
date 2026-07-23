/**
 * verify-invite.ts — Resolve a raw invite token to a usable contact (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Used by the PUBLIC sender page — no session, the token IS the credential.
 * Every failure mode returns the same calm shape so the page can show an
 * honest "this link isn't active" without leaking why.
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { hashInviteToken } from './invite-token';

export type VerifiedInvite = {
  contactId: string;
  recipientUserId: string;
  /** The recipient's framing ("Mom") — pre-filled for the sender. */
  displayName: string;
  memosRemaining: number;
  expiresAt: Date;
};

export type VerifyInviteError = 'invite_not_active' | 'db_error';

const NOT_ACTIVE_MESSAGE =
  'This invite link isn’t active any more. Ask the person who sent it for a fresh one.';

export async function verifyPraiseInvite(
  db: PrismaClient,
  rawToken: string,
  now: Date = new Date(),
): Promise<Result<VerifiedInvite, VerifyInviteError>> {
  const hash = hashInviteToken(rawToken);
  if (!hash) return err('invite_not_active', NOT_ACTIVE_MESSAGE);

  try {
    const contact = await db.trustedContact.findUnique({
      where: { inviteTokenHash: new Uint8Array(hash) },
      select: {
        id: true,
        userId: true,
        displayName: true,
        memosRemaining: true,
        inviteExpiresAt: true,
        isRevoked: true,
      },
    });

    if (
      !contact ||
      contact.isRevoked ||
      contact.memosRemaining <= 0 ||
      contact.inviteExpiresAt.getTime() <= now.getTime()
    ) {
      return err('invite_not_active', NOT_ACTIVE_MESSAGE);
    }

    return ok({
      contactId: contact.id,
      recipientUserId: contact.userId,
      displayName: contact.displayName,
      memosRemaining: contact.memosRemaining,
      expiresAt: contact.inviteExpiresAt,
    });
  } catch (e) {
    console.error('[praise] verify-invite failed:', e);
    return err('db_error', 'Something went wrong. Please try again.');
  }
}
