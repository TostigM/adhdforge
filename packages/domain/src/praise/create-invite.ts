/**
 * create-invite.ts — Generate a praise invite for a trusted contact (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Free tier: 5 non-revoked contacts (doc 05 §2.1). Comp/paid: unlimited.
 * Expiry is a flat creation+7 days (AGENTS.md §5.20 D2). The raw token is
 * returned ONCE — only its hash is stored.
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';
import { generateInviteToken } from './invite-token';

export const FREE_TRUSTED_CONTACT_LIMIT = 5;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateInviteInput = {
  userId: string;
  /** The recipient's framing of who this is ("Mom", "Sarah from work"). */
  displayName: string;
};

export type CreateInviteError =
  | 'display_name_invalid'
  | 'contact_limit_reached'
  | 'user_not_found'
  | 'db_error';

export type CreateInviteResult = {
  contactId: string;
  /** Shown once; goes into the shareable /praise/<token> link. */
  rawToken: string;
  expiresAt: Date;
};

const UNLIMITED_TIERS = new Set(['comp', 'paid', 'paid_lifetime', 'pro_plus']);

export async function createPraiseInvite(
  db: PrismaClient,
  input: CreateInviteInput,
): Promise<Result<CreateInviteResult, CreateInviteError>> {
  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 80) {
    return err('display_name_invalid', 'Give this person a name between 1 and 80 characters.');
  }

  try {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: { tier: true },
    });
    if (!user) return err('user_not_found', 'Account not found.');

    if (!UNLIMITED_TIERS.has(user.tier)) {
      const activeContacts = await db.trustedContact.count({
        where: { userId: input.userId, isRevoked: false },
      });
      if (activeContacts >= FREE_TRUSTED_CONTACT_LIMIT) {
        return err(
          'contact_limit_reached',
          `The free plan includes ${FREE_TRUSTED_CONTACT_LIMIT} praise senders. Remove one you no longer need, or upgrade for unlimited.`,
        );
      }
    }

    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const contact = await db.$transaction(async (tx) => {
      const created = await tx.trustedContact.create({
        data: {
          userId: input.userId,
          displayName,
          // Fresh Uint8Array copy — Prisma 6's Bytes type wants a definite ArrayBuffer
          inviteTokenHash: new Uint8Array(token.hash),
          inviteExpiresAt: expiresAt,
        },
      });
      await tx.event.create({
        data: {
          userId: input.userId,
          eventType: 'trusted_contact.created',
          payload: { contactId: created.id },
        },
      });
      return created;
    });

    return ok({ contactId: contact.id, rawToken: token.raw, expiresAt });
  } catch (e) {
    console.error('[praise] create-invite failed:', e);
    return err('db_error', 'Could not create the invite. Please try again.');
  }
}
