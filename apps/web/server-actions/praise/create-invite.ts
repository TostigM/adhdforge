'use server';

/**
 * Server Action: Create Praise Invite (M10)
 * Returns the one-time shareable link — the raw token is never recoverable
 * after this response.
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { createPraiseInvite } from '@focus-forge/domain/praise/create-invite';

import { requireUser } from '@/lib/require-user';

export type CreatePraiseInviteResult =
  | { ok: true; contactId: string; inviteUrl: string; expiresAtIso: string }
  | { ok: false; error: string; message?: string };

export async function createPraiseInviteAction(
  displayName: string,
): Promise<CreatePraiseInviteResult> {
  const auth = await requireUser('create_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await createPraiseInvite(db, { userId: auth.userId, displayName });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  const base = process.env.NEXTAUTH_URL ?? '';
  revalidatePath('/account/praise-senders');
  return {
    ok: true,
    contactId: result.value.contactId,
    inviteUrl: `${base}/praise/${result.value.rawToken}`,
    expiresAtIso: result.value.expiresAt.toISOString(),
  };
}
