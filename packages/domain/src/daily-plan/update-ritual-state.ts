/**
 * update-ritual-state.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Marks the morning ritual as completed or skipped.
 * On skip: anchors for today are still guaranteed to surface (bubbleUp is
 * called by getOrCreateTodayPlan at plan creation, so anchors are already in).
 *
 * See 02-design-system.md §13.5.3 — ritual NEVER blocks app load.
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UpdateRitualStateInput = {
  planId: string;
  userId: string;
  action: 'complete' | 'skip';
};

export type UpdateRitualStateError = 'plan_not_found' | 'forbidden' | 'db_error';

// ─── Core function ────────────────────────────────────────────────────────────

export async function updateRitualState(
  db: PrismaClient,
  input: UpdateRitualStateInput,
): Promise<Result<void, UpdateRitualStateError>> {
  try {
    const plan = await db.dailyPlan.findUnique({
      where: { id: input.planId },
      select: { id: true, userId: true },
    });

    if (!plan) return err('plan_not_found', 'Daily plan not found.');
    if (plan.userId !== input.userId) return err('forbidden', 'Access denied.');

    await db.dailyPlan.update({
      where: { id: input.planId },
      data: {
        ritualState: input.action === 'complete' ? 'completed' : 'skipped',
        ...(input.action === 'complete' ? { ritualCompletedAt: new Date() } : {}),
      },
    });

    return ok(undefined);
  } catch (e) {
    console.error('[update-ritual-state] db error:', e);
    return err('db_error', 'Failed to update ritual state.');
  }
}
