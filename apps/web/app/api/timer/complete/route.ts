/**
 * POST /api/timer/complete — end a focus session as completed.
 * ──────────────────────────────────────────────────────────────────────────────
 * Called by the popped-out (Picture-in-Picture) timer when it reaches zero while
 * the user has navigated away from /timer. Same-origin, so the session cookie is
 * sent automatically. Idempotent (endFocusSession is a no-op on an ended session).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@focus-forge/database/client';
import { endFocusSession } from '@focus-forge/domain/timer/focus-session';
import { requireUser } from '@/lib/require-user';

const bodySchema = z.object({
  sessionId: z.string().min(1),
  actualDurationSeconds: z.number().finite().nonnegative().optional(),
});

export async function POST(request: Request) {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) {
    const status = auth.error === 'unauthenticated' ? 401 : 403;
    return NextResponse.json({ ok: false, error: auth.error, message: auth.message }, { status });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const result = await endFocusSession(db, {
    sessionId: parsed.data.sessionId,
    userId: auth.userId,
    actualDurationSeconds: Math.round(parsed.data.actualDurationSeconds ?? 0),
    status: 'completed',
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, newBadges: result.value.newBadges });
}
