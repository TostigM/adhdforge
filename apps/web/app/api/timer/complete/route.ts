/**
 * POST /api/timer/complete — end a focus session as completed.
 * ──────────────────────────────────────────────────────────────────────────────
 * Called by the popped-out (Picture-in-Picture) timer when it reaches zero while
 * the user has navigated away from /timer. Same-origin, so the session cookie is
 * sent automatically. Idempotent (endFocusSession is a no-op on an ended session).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { db } from '@focus-forge/database/client';
import { endFocusSession } from '@focus-forge/domain/timer/focus-session';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  let body: { sessionId?: string; actualDurationSeconds?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  if (!body.sessionId) {
    return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 400 });
  }

  const result = await endFocusSession(db, {
    sessionId: body.sessionId,
    userId: session.user.id,
    actualDurationSeconds: Math.max(0, Math.round(body.actualDurationSeconds ?? 0)),
    status: 'completed',
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, newBadges: result.value.newBadges });
}
