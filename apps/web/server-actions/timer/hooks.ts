'use server';

/**
 * Server Actions: timer scaffolding hooks (M6, Phase-1 "hooks only").
 * ──────────────────────────────────────────────────────────────────────────────
 * These FIRE EVENTS that later milestones consume:
 *   - ten-three-rule:movement-due → movement prompts (M20)
 * The actual UX lands later; for now we just record the signal.
 */

import { db } from '@focus-forge/database/client';
import { parsePreferences } from '@focus-forge/domain/users/update-preferences';
import { requireUser } from '@/lib/require-user';

/**
 * Records a 10-minute movement-due signal during a focus session.
 * Honours the user's tenThreeRuleEnabled preference (server-side gate).
 * Logs the event and returns silently — no movement UI exists until M20.
 */
export async function recordTenThreeMarkAction(sessionId: string): Promise<void> {
  const auth = await requireUser('mutate_data');
  if (!auth.ok) return;

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { preferences: true },
  });
  const { tenThreeRuleEnabled } = parsePreferences(user?.preferences);
  if (!tenThreeRuleEnabled) return;

  await db.event.create({
    data: {
      userId: auth.userId,
      eventType: 'ten-three-rule:movement-due',
      payload: { focusSessionId: sessionId },
    },
  });
}
