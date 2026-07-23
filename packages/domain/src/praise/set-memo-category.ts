/**
 * set-memo-category.ts — Recipient files a memo under a listening moment (M10).
 * Categories are free-form-ish but the UI offers the doc 06 §10.3 trio:
 * 'overwhelmed' | 'before_big_task' | 'after_failure'. Null clears.
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export const MEMO_CATEGORIES = ['overwhelmed', 'before_big_task', 'after_failure'] as const;
export type MemoCategory = (typeof MEMO_CATEGORIES)[number];

export type SetMemoCategoryError = 'memo_not_found' | 'forbidden' | 'invalid_category' | 'db_error';

export async function setMemoCategory(
  db: PrismaClient,
  input: { userId: string; memoId: string; category: MemoCategory | null },
): Promise<Result<void, SetMemoCategoryError>> {
  if (input.category !== null && !MEMO_CATEGORIES.includes(input.category)) {
    return err('invalid_category', 'Pick one of the listening moments.');
  }
  try {
    const memo = await db.praiseMemo.findUnique({
      where: { id: input.memoId },
      select: { id: true, userId: true },
    });
    if (!memo) return err('memo_not_found', 'This memo no longer exists.');
    if (memo.userId !== input.userId) return err('forbidden', 'Access denied.');

    await db.praiseMemo.update({
      where: { id: memo.id },
      data: { category: input.category },
    });
    return ok(undefined);
  } catch (e) {
    console.error('[praise] set-category failed:', e);
    return err('db_error', 'Could not save the category.');
  }
}
