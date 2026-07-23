/**
 * purge-sender-ips.ts — Null sender IPs older than 7 days (M10, D4).
 * ──────────────────────────────────────────────────────────────────────────────
 * The retention promise on the public sender page is "kept for 7 days for
 * abuse review, then deleted" — this cron handler is what makes that true.
 * Idempotent; runs daily.
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

export const SENDER_IP_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function purgeSenderIps(
  db: PrismaClient,
  now: Date = new Date(),
): Promise<Result<{ purged: number }, 'db_error'>> {
  try {
    const cutoff = new Date(now.getTime() - SENDER_IP_RETENTION_MS);
    const { count } = await db.praiseMemo.updateMany({
      where: { senderIp: { not: null }, createdAt: { lt: cutoff } },
      data: { senderIp: null },
    });
    return ok({ purged: count });
  } catch (e) {
    console.error('[praise] sender-ip purge failed:', e);
    return err('db_error', 'Failed to purge sender IPs.');
  }
}
