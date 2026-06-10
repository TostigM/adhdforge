/**
 * speed-run-hook.ts — Speed Run eligibility signal (M6, hooks-only).
 * ──────────────────────────────────────────────────────────────────────────────
 * Per design system §14.5, Speed Runs are an opt-in stimulation feature. M6 only
 * PRE-WIRES the data signal: when a user completes `threshold`+ tasks within
 * `windowMinutes`, we fire a `speed-run:eligible` event. The actual UI lands
 * later — firing the event now makes that purely additive.
 *
 * No-op unless the user has opted in (speedRunChallengesEnabled).
 *
 * See 06-build-roadmap.md §6.9
 */

import type { PrismaClient } from '@prisma/client';

export type SpeedRunOptions = {
  enabled: boolean;
  windowMinutes?: number;
  threshold?: number;
};

/**
 * Checks recent task completions and fires `speed-run:eligible` when the
 * threshold is met. Returns true if the event was fired. Never throws.
 */
export async function checkSpeedRunEligibility(
  db: PrismaClient,
  userId: string,
  opts: SpeedRunOptions,
): Promise<boolean> {
  if (!opts.enabled) return false;

  const windowMinutes = opts.windowMinutes ?? 15;
  const threshold = opts.threshold ?? 2;

  try {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    const count = await db.event.count({
      where: { userId, eventType: 'task.completed', occurredAt: { gte: since } },
    });

    if (count >= threshold) {
      await db.event.create({
        data: {
          userId,
          eventType: 'speed-run:eligible',
          payload: { completedInWindow: count, windowMinutes },
        },
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error('[speed-run-hook] error:', e);
    return false;
  }
}
