/**
 * check-quota.ts — Is the user allowed one more use of a quota'd feature?
 * ──────────────────────────────────────────────────────────────────────────────
 * FAIL-OPEN: if the check itself errors (DB down, etc.), ALLOW the request. We
 * never block a user from a feature because of our own bug. (05 §4.5)
 *
 * Returns the reset instant (UTC) so the UI can format it in the user's local
 * timezone — the user never sees UTC.
 *
 * See 05-monetization-strategy.md §4.3
 */

import type { PrismaClient } from '@prisma/client';
import { getQuotaLimit, type QuotaKey, type QuotaLimit } from './limits';
import { getQuotaWindow } from './quota-window';

export type QuotaCheck = {
  allowed: boolean;
  used: number;
  limit: QuotaLimit;
  resetsAtUtc: Date;
};

export async function checkQuota(
  db: PrismaClient,
  userId: string,
  quotaKey: QuotaKey,
  now: Date = new Date(),
): Promise<QuotaCheck> {
  const { quotaDayStr, resetsAtUtc } = getQuotaWindow(now);

  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { tier: true } });
    // Unknown user → fail open (don't block).
    const tier = user?.tier ?? 'free';
    const limit = getQuotaLimit(tier, quotaKey);

    if (limit === 'unlimited') {
      return { allowed: true, used: 0, limit, resetsAtUtc };
    }

    const rows = await db.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT count FROM quota_usage
      WHERE user_id = ${userId} AND quota_key = ${quotaKey} AND usage_date_utc = ${quotaDayStr}
      LIMIT 1
    `;
    const used = rows.length > 0 ? Number(rows[0]!.count) : 0;

    return { allowed: used < limit, used, limit, resetsAtUtc };
  } catch (e) {
    console.error('[check-quota] failing OPEN due to error:', e);
    // Fail open — allow the request, report a permissive state.
    return { allowed: true, used: 0, limit: 'unlimited', resetsAtUtc };
  }
}
