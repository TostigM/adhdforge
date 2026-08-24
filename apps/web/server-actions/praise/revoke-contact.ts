'use server';

/**
 * Server Action: Revoke Praise Sender (M10)
 * Deletes the contact's memos (DB in one transaction) and their R2 objects
 * (best-effort — a stray object is a cost concern, not a privacy leak, since
 * the bucket is private and nothing links to it).
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { revokePraiseContact } from '@focus-forge/domain/praise/revoke-invite';

import { deletePraiseAudio } from '@/lib/r2';
import { requireUser } from '@/lib/require-user';

export type RevokeContactResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function revokePraiseContactAction(contactId: string): Promise<RevokeContactResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await revokePraiseContact(db, { userId: auth.userId, contactId });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  await deletePraiseAudio(result.value.audioPaths);

  revalidatePath('/account/praise-senders');
  revalidatePath('/praise');
  return { ok: true };
}
