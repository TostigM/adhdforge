/**
 * Hourly Cron Dispatcher — doc 04 §9
 * ──────────────────────────────────────────────────────────────────────────────
 * Vercel Hobby allows 2 cron jobs; all scheduled work funnels through this one
 * hourly dispatcher. Each handler is independent and idempotent — a delayed or
 * doubled run does the right thing.
 *
 * M8 ships the first handler: runScheduledAlertsDue. NOTE its limits — an
 * hourly server cron cannot deliver minute-precise zone notifications, and
 * there is no web-push infrastructure. Real-time nudges are client-side
 * (DoorknobClient schedules browser Notifications while open). This handler is
 * the bookkeeping backstop: it retires due alerts so stale sessions resolve,
 * and logs an event per sweep for observability.
 */

import { NextResponse } from 'next/server';

import { db } from '@focus-forge/database/client';

export const runtime = 'nodejs';

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
    // Future handlers per doc 04 §9: launchpad resets (M9), routine instances (M17),
    // account deletion purge (M15), comp tier expiration, token cleanup…
  ]);

  return NextResponse.json({
    ran: results.length,
    results: results.map((r) =>
      r.status === 'fulfilled' ? { ok: true, ...r.value } : { ok: false, reason: String(r.reason) },
    ),
  });
}
