/**
 * increment-quota.ts — Atomically consume one unit of a quota.
 * ──────────────────────────────────────────────────────────────────────────────
 * Uses INSERT ... ON DUPLICATE KEY UPDATE so two simultaneous requests can't both
 * read "9 used, 1 left" and both proceed. The unique key is
 * (user_id, quota_key, usage_date_utc).
 *
 * Best-effort: a failure to record usage must NOT fail the user's action (they
 * already got the feature). Logs and returns.
 *
 * See 05-monetization-strategy.md §4.4
 */

import type { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';
import type { QuotaKey } from './limits';
import { getQuotaWindow } from './quota-window';

export async function incrementQuota(
  db: PrismaClient,
  userId: string,
  quotaKey: QuotaKey,
  now: Date = new Date(),
): Promise<void> {
  const { quotaDayStr } = getQuotaWindow(now);
  try {
    await db.$executeRaw`
      INSERT INTO quota_usage (id, user_id, quota_key, usage_date_utc, count, created_at, updated_at)
      VALUES (${createId()}, ${userId}, ${quotaKey}, ${quotaDayStr}, 1, NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE count = count + 1, updated_at = NOW(3)
    `;
  } catch (e) {
    console.error('[increment-quota] failed to record usage (non-fatal):', e);
  }
}
