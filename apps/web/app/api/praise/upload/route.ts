/**
 * POST /api/praise/upload — a sender submits a memo (M10, PUBLIC).
 * ──────────────────────────────────────────────────────────────────────────────
 * No session: the invite token IS the credential (verified before anything
 * costs money or storage). Server-mediated upload (D3): audio lands here as
 * multipart form data and the server puts it in R2 — bucket credentials never
 * reach the browser.
 *
 * Order matters: verify token → size/duration caps → R2 put → (Pro recipient)
 * transcribe → DB submit. A failed submit deletes the just-uploaded object.
 *
 * Sender IP (D4): packed and stored with the memo for 7 days, then purged by
 * the daily cron. Stated honestly on the sender page.
 */

import { NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';

import { db } from '@focus-forge/database/client';
import { ipToBuffer } from '@focus-forge/domain/admin/audit';
import { verifyPraiseInvite } from '@focus-forge/domain/praise/verify-invite';
import { submitPraiseMemo, MAX_MEMO_DURATION_MS } from '@focus-forge/domain/praise/submit-memo';
import { transcribeAudio } from '@focus-forge/ai';
import { deletePraiseAudio, putPraiseAudio } from '@/lib/r2';

export const runtime = 'nodejs';

// A 60s Opus/WebM memo is well under 2 MB; the cap bounds hostile uploads
// (the client-reported duration can lie, the byte count cannot).
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

const PRO_TIERS = new Set(['comp', 'paid', 'paid_lifetime']);

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const token = form.get('token');
  const audio = form.get('audio');
  const durationRaw = Number(form.get('durationMs'));

  if (typeof token !== 'string' || !(audio instanceof File)) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  // Token first — nothing is stored for an inactive invite.
  const invite = await verifyPraiseInvite(db, token);
  if (!invite.ok) {
    return NextResponse.json(
      { ok: false, error: 'invite_not_active', message: invite.message },
      { status: 403 },
    );
  }

  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ ok: false, error: 'audio_too_large' }, { status: 413 });
  }
  if (!Number.isFinite(durationRaw) || durationRaw <= 0 || durationRaw > MAX_MEMO_DURATION_MS) {
    return NextResponse.json(
      { ok: false, error: 'audio_too_long', message: 'Memos can be up to 60 seconds.' },
      { status: 400 },
    );
  }

  // ── Store the audio ─────────────────────────────────────────────────────────
  const audioPath = `praise/${invite.value.recipientUserId}/${createId()}.webm`;
  const bytes = new Uint8Array(await audio.arrayBuffer());
  try {
    await putPraiseAudio(audioPath, bytes, audio.type || 'audio/webm');
  } catch (e) {
    console.error('[praise-upload] R2 put failed:', e);
    return NextResponse.json({ ok: false, error: 'storage_failed' }, { status: 502 });
  }

  // ── Pro recipients get a transcript at upload time (D5) ─────────────────────
  let transcript: string | undefined;
  let transcriptStatus: 'pending' | 'completed' | 'failed_skip' | undefined;
  try {
    const recipient = await db.user.findUnique({
      where: { id: invite.value.recipientUserId },
      select: { tier: true },
    });
    if (recipient && PRO_TIERS.has(recipient.tier)) {
      try {
        transcript = await transcribeAudio(
          new File([bytes], 'memo.webm', { type: audio.type || 'audio/webm' }),
        );
        transcriptStatus = 'completed';
      } catch (e) {
        console.error('[praise-upload] transcription failed (audio still saved):', e);
        transcriptStatus = 'failed_skip';
      }
    }
  } catch (e) {
    console.error('[praise-upload] tier lookup failed (skipping transcript):', e);
  }

  // ── Sender IP for the 7-day abuse window (D4) ───────────────────────────────
  const forwardedFor = request.headers.get('x-forwarded-for');
  const rawIp = forwardedFor?.split(',')[0]?.trim();
  const senderIp = rawIp ? (ipToBuffer(rawIp) ?? null) : null;

  const result = await submitPraiseMemo(db, {
    rawToken: token,
    audioPath,
    audioDurationMs: durationRaw,
    audioSizeBytes: audio.size,
    senderIp,
    transcript,
    transcriptStatus,
  });

  if (!result.ok) {
    await deletePraiseAudio([audioPath]); // don't strand the object
    const status = result.error === 'db_error' ? 500 : 400;
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    memosRemaining: result.value.memosRemaining,
  });
}
