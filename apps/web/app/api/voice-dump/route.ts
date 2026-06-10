/**
 * POST /api/voice-dump — Voice Dump (M7).
 * ──────────────────────────────────────────────────────────────────────────────
 * multipart/form-data with an `audio` file →
 *   auth → quota check (voice_dump) → Whisper transcribe → GPT parse →
 *   create tasks (+ steps) → increment quota → return tasks + transcript.
 *
 * Privacy (Rule 9): the audio lives only in memory for the duration of this
 * handler. It is never written to disk or object storage. Sending it to Whisper
 * and then letting it go out of scope satisfies "deleted within 60s".
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { db } from '@focus-forge/database/client';
import { authOptions } from '@/lib/auth';
import { checkQuota } from '@focus-forge/domain/quota/check-quota';
import { incrementQuota } from '@focus-forge/domain/quota/increment-quota';
import { createTask } from '@focus-forge/domain/tasks/create-task';
import { addStep } from '@focus-forge/domain/tasks/add-step';
import { transcribeAudio } from '@focus-forge/ai';
import { parseTasks } from '@focus-forge/ai';

export const runtime = 'nodejs'; // OpenAI SDK + Whisper need Node, not Edge

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  // ── Quota gate (before any paid OpenAI call) ────────────────────────────────
  const quota = await checkQuota(db, userId, 'voice_dump');
  if (!quota.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: 'quota_exceeded',
        used: quota.used,
        limit: quota.limit,
        resetsAtUtc: quota.resetsAtUtc.toISOString(),
      },
      { status: 429 },
    );
  }

  // ── Read the audio (kept only in memory) ────────────────────────────────────
  let file: File | null = null;
  try {
    const form = await request.formData();
    const audio = form.get('audio');
    if (audio instanceof File) file = audio;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ ok: false, error: 'no_audio' }, { status: 400 });
  }

  // ── Transcribe ──────────────────────────────────────────────────────────────
  let transcript: string;
  try {
    transcript = await transcribeAudio(file);
  } catch (e) {
    console.error('[voice-dump] transcription failed:', e);
    return NextResponse.json({ ok: false, error: 'transcription_failed' }, { status: 502 });
  }
  // audio is no longer referenced past this point.

  if (!transcript) {
    return NextResponse.json({ ok: true, transcript: '', tasks: [] });
  }

  // ── Parse into structured tasks ─────────────────────────────────────────────
  let parsed;
  try {
    parsed = await parseTasks(transcript);
  } catch (e) {
    console.error('[voice-dump] parsing failed:', e);
    return NextResponse.json({ ok: false, error: 'parsing_failed', transcript }, { status: 502 });
  }

  // ── Create tasks (+ steps) ──────────────────────────────────────────────────
  const created: Array<{ id: string; rawText: string; title: string | null; priorityKind: string; priorityLevel: string; stepCount: number }> = [];
  for (const t of parsed) {
    const scheduledFor = t.scheduledFor ? new Date(t.scheduledFor) : undefined;
    const result = await createTask(db, {
      userId,
      rawText: t.rawText,
      title: t.title ?? undefined,
      priorityKind: t.priorityKind,
      priorityLevel: t.priorityLevel,
      scheduledFor: scheduledFor && !Number.isNaN(scheduledFor.getTime()) ? scheduledFor : undefined,
      estimatedMinutes: t.estimatedMinutes ?? undefined,
      captureMethod: 'voice',
    });
    if (!result.ok) continue;

    for (const stepText of t.steps) {
      await addStep(db, { taskId: result.value.id, userId, text: stepText });
    }

    created.push({
      id: result.value.id,
      rawText: result.value.rawText,
      title: result.value.title,
      priorityKind: result.value.priorityKind,
      priorityLevel: result.value.priorityLevel,
      stepCount: t.steps.length,
    });
  }

  // ── Record usage (best-effort; never fails the request) ─────────────────────
  await incrementQuota(db, userId, 'voice_dump');

  return NextResponse.json({ ok: true, transcript, tasks: created });
}
