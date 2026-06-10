/**
 * update-preferences.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Merges user preference overrides into the `preferences` JSON column.
 * Sparse — only keys present in the update are written; others are preserved.
 *
 * Current preference keys:
 *   visibleSlots          1–5  (default 3) — flex slot count for Today view
 *   gentleReframeEnabled  bool (default true)
 *   gentleReframeThreshold 3–7 (default 4) — swaps before reframe card shows
 *
 * See 02-design-system.md §13.5.2, §13.5.5
 */

import type { PrismaClient } from '@prisma/client';
import type { Result } from '../result';
import { err, ok } from '../result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserPreferences = {
  visibleSlots?: number;
  gentleReframeEnabled?: boolean;
  gentleReframeThreshold?: number;
  // Timer (M6)
  soundEnabled?: boolean;
  hapticsEnabled?: boolean;
  tenThreeRuleEnabled?: boolean;
  speedRunChallengesEnabled?: boolean;
};

export const PREFERENCE_DEFAULTS: Required<UserPreferences> = {
  visibleSlots: 3,
  gentleReframeEnabled: true,
  gentleReframeThreshold: 4,
  // Timer
  soundEnabled: true,
  hapticsEnabled: true,
  tenThreeRuleEnabled: false,
  speedRunChallengesEnabled: false,
};

export type UpdatePreferencesError = 'user_not_found' | 'invalid_value' | 'db_error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parsePreferences(raw: unknown): Required<UserPreferences> {
  const prefs = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    visibleSlots: clamp(Number(prefs.visibleSlots ?? PREFERENCE_DEFAULTS.visibleSlots), 1, 5),
    gentleReframeEnabled: prefs.gentleReframeEnabled !== false,
    gentleReframeThreshold: clamp(Number(prefs.gentleReframeThreshold ?? PREFERENCE_DEFAULTS.gentleReframeThreshold), 3, 7),
    // Timer — booleans default ON except the opt-in scaffolding flags
    soundEnabled: prefs.soundEnabled !== false,
    hapticsEnabled: prefs.hapticsEnabled !== false,
    tenThreeRuleEnabled: prefs.tenThreeRuleEnabled === true,
    speedRunChallengesEnabled: prefs.speedRunChallengesEnabled === true,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : min;
}

function validate(update: UserPreferences): string | null {
  if (update.visibleSlots !== undefined && (update.visibleSlots < 1 || update.visibleSlots > 5)) {
    return 'visibleSlots must be between 1 and 5.';
  }
  if (update.gentleReframeThreshold !== undefined && (update.gentleReframeThreshold < 3 || update.gentleReframeThreshold > 7)) {
    return 'gentleReframeThreshold must be between 3 and 7.';
  }
  return null;
}

// ─── Core function ────────────────────────────────────────────────────────────

export async function updateUserPreferences(
  db: PrismaClient,
  userId: string,
  update: UserPreferences,
): Promise<Result<Required<UserPreferences>, UpdatePreferencesError>> {
  const validationError = validate(update);
  if (validationError) return err('invalid_value', validationError);

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, preferences: true },
    });

    if (!user) return err('user_not_found', 'User not found.');

    // Merge: existing prefs + new values
    const current = parsePreferences(user.preferences);
    const merged: Required<UserPreferences> = { ...current, ...update };

    // Clamp values in case of any out-of-range
    merged.visibleSlots = clamp(merged.visibleSlots, 1, 5);
    merged.gentleReframeThreshold = clamp(merged.gentleReframeThreshold, 3, 7);

    await db.user.update({
      where: { id: userId },
      data: { preferences: merged },
    });

    return ok(merged);
  } catch (e) {
    console.error('[update-preferences] db error:', e);
    return err('db_error', 'Failed to update preferences.');
  }
}
