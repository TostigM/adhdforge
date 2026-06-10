/**
 * GET /api/sync?since=<ISO timestamp>
 * ──────────────────────────────────────────────────────────────────────────────
 * Returns events newer than the `since` parameter for the current user.
 * Used by the 5-second polling hook for cross-device sync.
 *
 * Short-polling chosen over SSE for Vercel free-tier compatibility.
 * See 04-mysql-schema.md §5 and 06-build-roadmap.md §4.7
 */

import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@focus-forge/database/client';

import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const sinceParam = req.nextUrl.searchParams.get('since');
  const since = sinceParam ? new Date(sinceParam) : new Date(0);

  if (isNaN(since.getTime())) {
    return NextResponse.json({ error: 'invalid_since' }, { status: 400 });
  }

  const events = await db.event.findMany({
    where: {
      userId: session.user.id,
      occurredAt: { gt: since },
    },
    orderBy: { occurredAt: 'asc' },
    take: 200,
    select: {
      id: true,
      eventType: true,
      payload: true,
      occurredAt: true,
    },
  });

  return NextResponse.json({
    events,
    serverTime: new Date().toISOString(),
  });
}
