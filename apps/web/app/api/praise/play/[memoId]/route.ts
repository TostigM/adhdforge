/**
 * POST /api/praise/play/[memoId] — grant a play (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Quota-gated (15/day free, 30/day Pro) with the approved soft message on the
 * cap. Success returns a 1-hour signed R2 URL. Capability is read_data on
 * purpose: a paused (read-only) account can still listen to their memos —
 * that's the humane reading of "read".
 */

import { NextResponse } from 'next/server';

import { db } from '@focus-forge/database/client';
import { playPraiseMemo } from '@focus-forge/domain/praise/play-memo';
import { getPlaybackUrl } from '@/lib/r2';
import { requireUser } from '@/lib/require-user';

export const runtime = 'nodejs';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ memoId: string }> },
) {
  const auth = await requireUser('read_data');
  if (!auth.ok) {
    const status = auth.error === 'unauthenticated' ? 401 : 403;
    return NextResponse.json({ ok: false, error: auth.error, message: auth.message }, { status });
  }

  const { memoId } = await params;
  const result = await playPraiseMemo(db, { userId: auth.userId, memoId });

  if (!result.ok) {
    const status =
      result.error === 'quota_reached' ? 429 : result.error === 'db_error' ? 500 : 404;
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status },
    );
  }

  try {
    const url = await getPlaybackUrl(result.value.audioPath);
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error('[praise-play] signing failed:', e);
    return NextResponse.json({ ok: false, error: 'storage_failed' }, { status: 502 });
  }
}
