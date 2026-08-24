/**
 * Cron Dispatcher — doc 04 §9
 * ──────────────────────────────────────────────────────────────────────────────
 * All scheduled work funnels through this one dispatcher. Each handler is
 * independent and idempotent — a delayed or doubled run does the right thing.
 *
 * SCHEDULE: the Vercel Hobby plan only allows DAILY crons, so vercel.json runs
 * this once a day (the route path keeps the legacy "hourly" name). That's fine:
 * this is purely a bookkeeping backstop. It cannot — and is not meant to —
 * deliver minute-precise zone notifications; those are client-side
 * (DoorknobClient schedules browser Notifications while the page is open). On a
 * Pro plan the schedule can be tightened in vercel.json without code changes.
 *
 * M8 ships the first handler: runScheduledAlertsDue — retires due alerts so
 * stale sessions resolve, and logs an event per sweep for observability.
 */

import { NextResponse } from 'next/server';

import { db } from '@focus-forge/database/client';
import { resetDailyItems } from '@focus-forge/domain/launchpad/reset-launchpad';
import { purgeSenderIps } from '@focus-forge/domain/praise/purge-sender-ips';

export const runtime = 'nodejs';

/**
 * Launchpad daily reset — the ALL-USERS backstop (M9, doc 04 §9).
 * The launchpad read path already resets lazily for the viewing user; this
 * sweep keeps the DB truthful for users who don't open the app. Idempotent:
 * only items checked before the current 04:00 workday-time boundary flip.
 */
async function runLaunchpadResets(): Promise<{ reset: number }> {
  const result = await resetDailyItems(db);
  if (!result.ok) throw new Error(result.message ?? result.error);

  if (result.value.reset > 0) {
    await db.event.create({
      data: {
        userId: null, // system event
        eventType: 'cron.launchpad_reset',
        payload: { reset: result.value.reset },
      },
    });
  }
  return result.value;
}

/**
 * Praise sender-IP purge (M10, AGENTS.md §5.20 D4). The public sender page
 * promises "kept 7 days for abuse review, then deleted" — this makes it true.
 */
async function runSenderIpPurge(): Promise<{ purged: number }> {
  const result = await purgeSenderIps(db);
  if (!result.ok) throw new Error(result.message ?? result.error);
  return result.value;
}

/**
 * Restores accounts whose moderation pause has expired (doc 01 §4).
 * The account-state guard already treats an expired pause as active on read,
 * so this sweep is bookkeeping — it heals the stored state.
 */
async function restoreExpiredPauses(): Promise<{ restored: number }> {
  const now = new Date();
  const { count } = await db.user.updateMany({
    where: { accountState: 'paused', pausedUntil: { lt: now } },
    data: { accountState: 'active', pausedReason: null, pausedUntil: null },
  });

  if (count > 0) {
    await db.event.create({
      data: {
        userId: null, // system event
        eventType: 'cron.pauses_restored',
        payload: { restored: count },
      },
    });
  }

  return { restored: count };
}

async function runScheduledAlertsDue(): Promise<{ fired: number }> {
  const now = new Date();
  const { count } = await db.scheduledAlert.updateMany({
    where: { status: 'pending', scheduledFor: { lte: now } },
    data: { status: 'fired', firedAt: now },
  });

  if (count > 0) {
    await db.event.create({
      data: {
        userId: null, // system event
        eventType: 'cron.alerts_swept',
        payload: { fired: count },
      },
    });
  }

  return { fired: count };
}

export async function GET(req: Request) {
  // Verify the caller is Vercel Cron (or a trusted manual invocation)
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const results = await Promise.allSettled([
    runScheduledAlertsDue(),
    restoreExpiredPauses(),
    runLaunchpadResets(),
    runSenderIpPurge(),
    // Future handlers per doc 04 §9: routine instances (M17),
    // account deletion purge (M15), comp tier expiration, token cleanup…
  ]);

  return NextResponse.json({
    ran: results.length,
    results: results.map((r) =>
      r.status === 'fulfilled' ? { ok: true, ...r.value } : { ok: false, reason: String(r.reason) },
    ),
  });
}
