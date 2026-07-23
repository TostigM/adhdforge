/**
 * revoke-invite.ts — Revoke a trusted contact and delete their memos (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Doc 01 §10.1: "User can revoke a sender at any time, deleting their memos."
 * DB rows go in one transaction; the memos' R2 objects are returned so the
 * CALLER deletes them best-effort (object storage can't join the transaction).
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export type RevokeInviteInput = {
  userId: string;
  contactId: string;
};

export type RevokeInviteError = 'contact_not_found' | 'forbidden' | 'db_error';

export type RevokeInviteResult = {
  /** R2 object keys of the deleted memos — caller removes them from storage. */
  audioPaths: string[];
};

export async function revokePraiseContact(
  db: PrismaClient,
  input: RevokeInviteInput,
): Promise<Result<RevokeInviteResult, RevokeInviteError>> {
  try {
    const contact = await db.trustedContact.findUnique({
      where: { id: input.contactId },
      select: { id: true, userId: true, isRevoked: true },
    });
    if (!contact) return err('contact_not_found', 'This sender no longer exists.');
    if (contact.userId !== input.userId) return err('forbidden', 'Access denied.');

    const memos = await db.praiseMemo.findMany({
      where: { trustedContactId: input.contactId },
      select: { audioPath: true },
    });

    await db.$transaction(async (tx) => {
      await tx.praiseMemo.deleteMany({ where: { trustedContactId: input.contactId } });
      await tx.trustedContact.update({
        where: { id: input.contactId },
        data: { isRevoked: true, revokedAt: new Date() },
      });
      await tx.event.create({
        data: {
          userId: input.userId,
          eventType: 'trusted_contact.revoked',
          payload: { contactId: input.contactId, memosDeleted: memos.length },
        },
      });
    });

    return ok({ audioPaths: memos.map((m) => m.audioPath) });
  } catch (e) {
    console.error('[praise] revoke failed:', e);
    return err('db_error', 'Could not remove this sender. Please try again.');
  }
}
