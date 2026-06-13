'use client';

/**
 * DoorknobTimeline — the Reverse Scheduler's horizontal timeline
 * ──────────────────────────────────────────────────────────────────────────────
 * Documented exception to the single-column rule (02-design-system.md §9):
 * time reads left→right. Zones are proportional colored segments:
 *
 *   NOW ●━━ Wrap up ━━┿━━ Gather ━━┿━━ Door ━━┿━━ Transit ━━● ARRIVE
 *       yellow         green        mauve      neutral
 *
 * Never red (Rule 1). The position marker moves with time; movement is a
 * discrete re-render (no continuous animation), so prefers-reduced-motion
 * users only lose the marker's pulse, which is opacity-only and disabled
 * via the motion-reduce variant.
 */

import { useEffect, useState } from 'react';
import { cn } from '../lib/cn';

export type DoorknobTimelineZone = {
  key: string;
  label: string;
  color: 'yellow' | 'green' | 'mauve' | 'neutral';
  /** ISO timestamps — serializable across the RSC boundary. */
  startsAtIso: string;
  endsAtIso: string;
};

export interface DoorknobTimelineProps {
  zones: DoorknobTimelineZone[];
  /** Override "now" (tests). Defaults to live time, refreshed every 30s. */
  now?: Date;
  className?: string;
}

// Same palette as AnalogTimer — yellow → green → mauve, never red.
const ZONE_COLORS: Record<DoorknobTimelineZone['color'], string> = {
  yellow: '#facc15',
  green: '#34d399',
  mauve: '#c084fc',
  neutral: '#94a3b8', // slate-400 — transit is travel, not a pressure zone
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function DoorknobTimeline({ zones, now, className }: DoorknobTimelineProps) {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (now) return; // controlled (tests) — no timer
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [now]);

  if (zones.length === 0) return null;

  const current = now ? now.getTime() : tick;
  const start = new Date(zones[0]!.startsAtIso).getTime();
  const end = new Date(zones[zones.length - 1]!.endsAtIso).getTime();
  const total = Math.max(1, end - start);

  // Marker position clamped to the bar
  const markerPct = Math.min(100, Math.max(0, ((current - start) / total) * 100));
  const started = current >= start;

  return (
    <div
      className={cn('w-full', className)}
      role="img"
      aria-label={`Timeline from ${fmtTime(zones[0]!.startsAtIso)} to arrival at ${fmtTime(
        zones[zones.length - 1]!.endsAtIso,
      )}: ${zones.map((z) => `${z.label} at ${fmtTime(z.startsAtIso)}`).join(', ')}.`}
    >
      {/* End labels */}
      <div className="flex justify-between text-xs font-medium text-[var(--text-tertiary)] mb-1">
        <span>{started ? 'NOW' : fmtTime(zones[0]!.startsAtIso)}</span>
        <span>ARRIVE {fmtTime(zones[zones.length - 1]!.endsAtIso)}</span>
      </div>

      {/* The bar */}
      <div className="relative">
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          {zones.map((zone) => {
            const w =
              ((new Date(zone.endsAtIso).getTime() - new Date(zone.startsAtIso).getTime()) /
                total) *
              100;
            const isPast = current >= new Date(zone.endsAtIso).getTime();
            return (
              <div
                key={zone.key}
                className="h-full transition-opacity"
                style={{
                  width: `${w}%`,
                  backgroundColor: ZONE_COLORS[zone.color],
                  opacity: isPast ? 0.35 : 1,
                }}
              />
            );
          })}
        </div>

        {/* Position marker */}
        {started && (
          <div
            aria-hidden="true"
            className="absolute -top-1 h-6 w-1.5 rounded-full bg-[var(--text-primary)] motion-safe:animate-pulse"
            style={{ left: `calc(${markerPct}% - 3px)` }}
          />
        )}
      </div>

      {/* Zone labels + start times */}
      <div className="flex w-full mt-2">
        {zones.map((zone) => {
          const w =
            ((new Date(zone.endsAtIso).getTime() - new Date(zone.startsAtIso).getTime()) / total) *
            100;
          const isActive =
            current >= new Date(zone.startsAtIso).getTime() &&
            current < new Date(zone.endsAtIso).getTime();
          return (
            <div key={zone.key} style={{ width: `${w}%` }} className="min-w-0 pr-1">
              <p
                className={cn(
                  'text-xs truncate',
                  isActive
                    ? 'font-semibold text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]',
                )}
              >
                {zone.label}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                {fmtTime(zone.startsAtIso)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
