/**
 * vibration-patterns.ts — Haptic feedback patterns for the timer (M6).
 * ──────────────────────────────────────────────────────────────────────────────
 * Patterns are `navigator.vibrate()` argument arrays (ms on/off/on…).
 * Resolution is pure here; the client calls navigator.vibrate with the result.
 *
 * Vibration is treated as MOTION: it is suppressed when the user prefers reduced
 * motion (Rule 9) or has haptics disabled. Independently toggleable from sound.
 *
 * See 06-build-roadmap.md §6.5
 */

export const VIBRATION_PATTERNS = {
  /** Single short pulse at an interval alert. */
  interval_chime: [200],
  /** Celebration pattern on timer completion. */
  timer_complete: [200, 100, 200, 100, 400],
  /** Gentle nudge for a body check-in prompt. */
  body_check_in_prompt: [100],
} as const;

export type VibrationPatternKey = keyof typeof VIBRATION_PATTERNS;

export type HapticContext = {
  hapticsEnabled: boolean;
  prefersReducedMotion: boolean;
};

/**
 * Resolve the vibration pattern for a key, or `null` when haptics should not
 * fire (disabled by the user, or reduced-motion preference).
 */
export function resolveVibration(
  key: VibrationPatternKey,
  ctx: HapticContext,
): number[] | null {
  if (!ctx.hapticsEnabled) return null;
  if (ctx.prefersReducedMotion) return null;
  return [...VIBRATION_PATTERNS[key]];
}
