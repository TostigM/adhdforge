/**
 * wedge.ts — Pure geometry/colour math for the analog timer wedge.
 * ──────────────────────────────────────────────────────────────────────────────
 * The wedge DIMINISHES as time elapses (it shows time *remaining*, spatially).
 * No digital countdown — analog spatializes time (per design rationale).
 *
 * Colour zones shift as the session progresses: yellow (fresh) → green (mid)
 * → mauve (soon). Never red (Rule 1) — "mauve" is the fuchsia family.
 *
 * The component maps `zone` to actual colours; the domain stays CSS-free.
 *
 * See 06-build-roadmap.md §6.3
 */

export type WedgeZone = 'fresh' | 'mid' | 'soon';

export type Wedge = {
  /** 0..1 — fraction of the planned time still remaining (drives the wedge size). */
  fractionRemaining: number;
  /** 0..1 — fraction elapsed. */
  fractionElapsed: number;
  /** Colour zone for the current progress. */
  zone: WedgeZone;
  /** SVG arc sweep angle in degrees for the remaining wedge (0..360). */
  sweepDegrees: number;
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Compute the wedge state for a given elapsed/planned time.
 * `plannedSeconds <= 0` is treated as a fully-elapsed timer.
 */
export function computeWedge(elapsedSeconds: number, plannedSeconds: number): Wedge {
  if (plannedSeconds <= 0) {
    return { fractionRemaining: 0, fractionElapsed: 1, zone: 'soon', sweepDegrees: 0 };
  }

  const fractionElapsed = clamp01(elapsedSeconds / plannedSeconds);
  const fractionRemaining = clamp01(1 - fractionElapsed);

  // Zone thirds: first third yellow, middle green, final third mauve.
  let zone: WedgeZone;
  if (fractionElapsed < 1 / 3) zone = 'fresh';
  else if (fractionElapsed < 2 / 3) zone = 'mid';
  else zone = 'soon';

  return {
    fractionRemaining,
    fractionElapsed,
    zone,
    sweepDegrees: fractionRemaining * 360,
  };
}
