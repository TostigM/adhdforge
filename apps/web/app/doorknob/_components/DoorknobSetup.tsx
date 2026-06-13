'use client';

/**
 * DoorknobSetup — the three questions
 * ──────────────────────────────────────────────────────────────────────────────
 * 1. When do you need to be there?
 * 2. How long is the trip?
 * 3. What do you need to grab on the way out? (freeform; Launchpad lands in M9)
 *
 * Calm copy, no urgency framing. The result is options, not orders.
 */

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button, Input, Label, useToast } from '@focus-forge/ui';

import { createDoorknobSessionAction } from '@/server-actions/doorknob/create-session';

const TRANSIT_PRESETS = [10, 20, 30, 45, 60];

/** datetime-local value for a Date in the browser's local timezone. */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DoorknobSetup() {
  const router = useRouter();
  const { addToast } = useToast();

  // Default: two hours from now, rounded up to the next quarter hour
  const defaultArrival = useMemo(() => {
    const d = new Date(Date.now() + 2 * 3_600_000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return toLocalInputValue(d);
  }, []);

  const [arrival, setArrival] = useState(defaultArrival);
  const [transit, setTransit] = useState(20);
  const [tasksText, setTasksText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleStart() {
    const arrivalDate = new Date(arrival);
    if (Number.isNaN(arrivalDate.getTime())) {
      addToast({ type: 'info', message: 'Pick an arrival time first.' });
      return;
    }

    const preDepartureTasks = tasksText
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

    // Getting-ready time scales gently with the checklist: 5 min per item, 15 min floor.
    const gatherMinutes = Math.max(15, preDepartureTasks.length * 5);

    setSubmitting(true);
    const result = await createDoorknobSessionAction({
      arrivalAtIso: arrivalDate.toISOString(),
      transitMinutes: transit,
      gatherMinutes,
      preDepartureTasks,
    });
    setSubmitting(false);

    if (!result.ok) {
      addToast({
        type: 'info',
        message: result.message ?? 'Could not start the schedule. Try a later time.',
      });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Doorknob mode</h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Tell it where you need to be. It works backward and shows you when to start.
        </p>
      </header>

      <section className="space-y-2">
        <Label htmlFor="doorknob-arrival">When do you need to be there?</Label>
        <Input
          id="doorknob-arrival"
          type="datetime-local"
          value={arrival}
          onChange={(e) => setArrival(e.target.value)}
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="doorknob-transit">How long is the trip?</Label>
        <div className="flex flex-wrap items-center gap-2">
          {TRANSIT_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTransit(m)}
              aria-pressed={transit === m}
              className={
                transit === m
                  ? 'rounded-full border border-[var(--accent)] bg-[var(--bg-elevated)] px-3 py-1 text-sm font-medium text-[var(--text-primary)]'
                  : 'rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'
              }
            >
              {m} min
            </button>
          ))}
          <Input
            id="doorknob-transit"
            type="number"
            min={0}
            max={1440}
            value={transit}
            onChange={(e) => setTransit(Math.max(0, Number(e.target.value) || 0))}
            className="w-24"
            aria-label="Trip length in minutes"
          />
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="doorknob-tasks">Anything to grab before you leave?</Label>
        <p className="text-sm text-[var(--text-tertiary)]">
          One per line — keys, water bottle, charger… (optional)
        </p>
        <textarea
          id="doorknob-tasks"
          value={tasksText}
          onChange={(e) => setTasksText(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          placeholder={'keys\nwater bottle'}
        />
      </section>

      <Button onClick={handleStart} disabled={submitting}>
        {submitting ? 'Calculating…' : 'Show me the timeline'}
      </Button>
    </div>
  );
}
