'use client';

/**
 * AnalogTimer — diminishing SVG wedge (M6).
 * ──────────────────────────────────────────────────────────────────────────────
 * Shows time REMAINING spatially: a pie wedge that shrinks as the session runs.
 * No digital countdown numerals — analog spatializes time (working-memory-free).
 *
 * Colour zones shift with progress: yellow (fresh) → green (mid) → mauve (soon).
 * Never red (Rule 1) — "mauve" is the purple/fuchsia family.
 *
 * Presentational + pure: the parent computes `fractionRemaining` + `zone`
 * (via @focus-forge/domain/timer/wedge) so this package keeps zero cross-package
 * deps. Honours prefers-reduced-motion (no smooth tween; just renders the frame).
 *
 * See 06-build-roadmap.md §6.3
 */

import React, { useEffect, useState } from 'react';

export type AnalogTimerZone = 'fresh' | 'mid' | 'soon';

export interface AnalogTimerProps {
  /** 0..1 — fraction of planned time still remaining. */
  fractionRemaining: number;
  /** Colour zone. */
  zone: AnalogTimerZone;
  /** Diameter in px. */
  size?: number;
  /** Dim the wedge to signal a paused timer. */
  paused?: boolean;
  /** Accessible description, e.g. "About 12 minutes remaining". */
  ariaLabel?: string;
}

const ZONE_COLOR: Record<AnalogTimerZone, string> = {
  fresh: '#facc15', // yellow
  mid: '#34d399',   // green
  soon: '#c084fc',  // mauve (purple — never red)
};

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** SVG path for a pie wedge starting at 12 o'clock, sweeping clockwise. */
function wedgePath(cx: number, cy: number, r: number, sweepDeg: number): string {
  const start = -90;
  const end = start + sweepDeg;
  const [sx, sy] = polar(cx, cy, r, start);
  const [ex, ey] = polar(cx, cy, r, end);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey} Z`;
}

/** Detect the OS reduced-motion preference (client-side). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export function AnalogTimer({
  fractionRemaining,
  zone,
  size = 280,
  paused = false,
  ariaLabel,
}: AnalogTimerProps) {
  const reducedMotion = usePrefersReducedMotion();

  const frac = Math.max(0, Math.min(1, fractionRemaining));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8; // padding for the stroke
  const sweep = frac * 360;
  const color = ZONE_COLOR[zone];

  const isFull = frac >= 0.999;
  const isEmpty = frac <= 0.001;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel ?? `Timer, ${Math.round(frac * 100)} percent remaining`}
      style={{ opacity: paused ? 0.55 : 1, transition: reducedMotion ? 'none' : 'opacity 200ms ease' }}
    >
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border, #334155)" strokeWidth={2} />

      {/* Remaining wedge */}
      {isFull ? (
        <circle cx={cx} cy={cy} r={r} fill={color} />
      ) : isEmpty ? null : (
        <path
          d={wedgePath(cx, cy, r, sweep)}
          fill={color}
          style={{ transition: reducedMotion ? 'none' : 'd 950ms linear, fill 600ms ease' }}
        />
      )}

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={4} fill="var(--bg-page, #0f172a)" />
    </svg>
  );
}

AnalogTimer.displayName = 'AnalogTimer';
