'use server';

/**
 * Server Action: Set Memo Category (M10)
 */

import { revalidatePath } from 'next/cache';

import { db } from '@focus-forge/database/client';
import { setMemoCategory, type MemoCategory } from '@focus-forge/domain/praise/set-memo-category';

import { requireUser } from '@/lib/require-user';

export type SetCategoryResult =
  | { ok: true }
  | { ok: false; error: string; message?: string };

export async function setMemoCategoryAction(
  memoId: string,
  category: MemoCategory | null,
): Promise<SetCategoryResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    return { ok: false, error: auth.error, message: auth.message };
  }

  const result = await setMemoCategory(db, { userId: auth.userId, memoId, category });
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }

  revalidatePath('/praise');
  return { ok: true };
}
