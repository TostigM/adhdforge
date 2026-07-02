'use server';

/**
 * Server Actions: Focus Session (M6 timer lifecycle)
 * ──────────────────────────────────────────────────────────────────────────────
 * start / pause / resume / end. Elapsed time is tracked client-side; the client
 * sends actualDurationSeconds on end.
 */

import { db } from '@focus-forge/database/client';
import {
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  endFocusSession,
} from '@focus-forge/domain/timer/focus-session';

import { requireUser } from '@/lib/require-user';

type Fail = { ok: false; error: string; message?: string };

export type StartTimerResult =
  | { ok: true; sessionId: string; newBadges: string[] }
  | Fail;

export async function startTimerAction(input: {
  plannedDurationSeconds: number;
  taskId?: string | null;
  soundFamily?: string | null;
  alertIntervalSeconds?: number | null;
}): Promise<StartTimerResult> {
  const auth = await requireUser('create_data');
  if (!auth.ok) return { ok: false, error: auth.error, message: auth.message };

  const result = await startFocusSession(db, { userId: auth.userId, ...input });
  if (!result.ok) return { ok: false, error: result.error, message: result.message };

  return { ok: true, sessionId: result.value.session.id, newBadges: result.value.newBadges };
}

export type SimpleResult = { ok: true } | Fail;

export async function pauseTimerAction(sessionId: string): Promise<SimpleResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) return { ok: false, error: auth.error, message: auth.message };
  const r = await pauseFocusSession(db, { sessionId, userId: auth.userId });
  return r.ok ? { ok: true } : { ok: false, error: r.error, message: r.message };
}

export async function resumeTimerAction(sessionId: string): Promise<SimpleResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) return { ok: false, error: auth.error, message: auth.message };
  const r = await resumeFocusSession(db, { sessionId, userId: auth.userId });
  return r.ok ? { ok: true } : { ok: false, error: r.error, message: r.message };
}

export type EndTimerResult = { ok: true; newBadges: string[] } | Fail;

export async function endTimerAction(input: {
  sessionId: string;
  actualDurationSeconds: number;
  status: 'completed' | 'incomplete';
}): Promise<EndTimerResult> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) return { ok: false, error: auth.error, message: auth.message };
  const r = await endFocusSession(db, { userId: auth.userId, ...input });
  return r.ok ? { ok: true, newBadges: r.value.newBadges } : { ok: false, error: r.error, message: r.message };
}
