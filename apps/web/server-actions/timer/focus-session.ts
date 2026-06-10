'use server';

/**
 * Server Actions: Focus Session (M6 timer lifecycle)
 * ──────────────────────────────────────────────────────────────────────────────
 * start / pause / resume / end. Elapsed time is tracked client-side; the client
 * sends actualDurationSeconds on end.
 */

import { getServerSession } from 'next-auth';

import { db } from '@focus-forge/database/client';
import {
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  endFocusSession,
} from '@focus-forge/domain/timer/focus-session';

import { authOptions } from '@/lib/auth';

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };

  const result = await startFocusSession(db, { userId: session.user.id, ...input });
  if (!result.ok) return { ok: false, error: result.error, message: result.message };

  return { ok: true, sessionId: result.value.session.id, newBadges: result.value.newBadges };
}

export type SimpleResult = { ok: true } | Fail;

export async function pauseTimerAction(sessionId: string): Promise<SimpleResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: 'unauthenticated' };
  const r = await pauseFocusSession(db, { sessionId, userId: session.user.id });
  return r.ok ? { ok: true } : { ok: false, error: r.error, message: r.message };
}

export async function resumeTimerAction(sessionId: string): Promise<SimpleResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: 'unauthenticated' };
  const r = await resumeFocusSession(db, { sessionId, userId: session.user.id });
  return r.ok ? { ok: true } : { ok: false, error: r.error, message: r.message };
}

export type EndTimerResult = { ok: true; newBadges: string[] } | Fail;

export async function endTimerAction(input: {
  sessionId: string;
  actualDurationSeconds: number;
  status: 'completed' | 'incomplete';
}): Promise<EndTimerResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: 'unauthenticated' };
  const r = await endFocusSession(db, { userId: session.user.id, ...input });
  return r.ok ? { ok: true, newBadges: r.value.newBadges } : { ok: false, error: r.error, message: r.message };
}
