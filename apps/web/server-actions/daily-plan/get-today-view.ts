'use server';

/**
 * Server Action: Get Today View
 * ──────────────────────────────────────────────────────────────────────────────
 * Gets or creates today's daily plan and returns the full Today screen state.
 * Called on every dashboard load.
 *
 * planDateUtc: optional explicit plan-day label. When omitted, the server
 * derives it from the workday timezone (see domain/daily-plan/plan-day).
 */

import { getServerSession } from 'next-auth';

import { db } from '@focus-forge/database/client';
import { getOrCreateTodayPlan } from '@focus-forge/domain/daily-plan/get-or-create-today-plan';
import { getPlanDate } from '@focus-forge/domain/daily-plan/plan-day';
import { getTodayView } from '@focus-forge/domain/daily-plan/get-today-view';
import type { TodayViewResult } from '@focus-forge/domain/daily-plan/get-today-view';

import { authOptions } from '@/lib/auth';

export type GetTodayViewResult =
  | { ok: true; view: TodayViewResult }
  | { ok: false; error: string; message?: string };

export async function getTodayViewAction(
  planDateUtc?: string, // ISO date string, e.g. "2026-05-31T00:00:00.000Z"
): Promise<GetTodayViewResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  // Derive today's plan-day label if not supplied
  const planDate = planDateUtc ? new Date(planDateUtc) : getPlanDate();

  try {
    const plan = await getOrCreateTodayPlan(db, session.user.id, planDate);
    const view = await getTodayView(db, plan.id, session.user.id);

    return { ok: true, view };
  } catch (e) {
    console.error('[get-today-view] error:', e);
    return { ok: false, error: 'db_error', message: 'Failed to load today\'s plan.' };
  }
}
