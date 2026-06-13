'use client';

/**
 * DoorknobClient — the live Reverse Scheduler view
 * ──────────────────────────────────────────────────────────────────────────────
 * Timeline + pre-departure checklist + the two big actions:
 *   • "Running late (+15 min)" — one-click replan, no judgment (Rule 5)
 *   • "I'm out the door" — completes the session (doorknob_made badge)
 *
 * Zone notifications are client-side: while this page is open, a timer fires a
 * browser Notification at each pending zone start (permission asked once, via
 * an explicit button — never auto-prompted). The hourly cron is only the
 * server-side bookkeeping backstop; it cannot reach the browser.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button, DoorknobTimeline, useToast } from '@focus-forge/ui';

import { cancelDoorknobAction } from '@/server-actions/doorknob/cancel-session';
import { completeDoorknobAction } from '@/server-actions/doorknob/complete-session';
import { recalculateLateAction } from '@/server-actions/doorknob/recalculate-late';

export type SerializedDoorknobSession = {
  sessionId: string;
  arrivalAtIso: string;
  departAtIso: string;
  startAtIso: string;
  zones: Array<{
    key: string;
    label: string;
    color: 'yellow' | 'green' | 'mauve' | 'neutral';
    startsAtIso: string;
    endsAtIso: string;
  }>;
  preDepartureTasks: string[];
  pendingAlerts: Array<{ zoneKey: string; scheduledForIso: string }>;
};

const ZONE_NOTIFICATION_COPY: Record<string, string> = {
  wrap_up: 'Time to wrap up — find a stopping point.',
  gather: 'Gather time — collect what you need.',
  door: 'Door zone — shoes, keys, out.',
  transit: 'Time to leave. You have what you need.',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function DoorknobClient({ session }: { session: SerializedDoorknobSession }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [notifyEnabled, setNotifyEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted',
  );
  const timersRef = useRef<number[]>([]);

  // Schedule a browser notification at each pending zone start while the page is open.
  useEffect(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
    if (!notifyEnabled || typeof Notification === 'undefined') return;

    for (const alert of session.pendingAlerts) {
      const delay = new Date(alert.scheduledForIso).getTime() - Date.now();
      if (delay <= 0) continue;
      const id = window.setTimeout(() => {
        new Notification('Focus Forge — Doorknob', {
          body: ZONE_NOTIFICATION_COPY[alert.zoneKey] ?? 'Next zone.',
          tag: `doorknob-${session.sessionId}-${alert.zoneKey}`,
        });
      }, delay);
      timersRef.current.push(id);
    }
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, [notifyEnabled, session.pendingAlerts, session.sessionId]);

  // Refresh the server view shortly after arrival so the page resolves itself.
  useEffect(() => {
    const untilArrival = new Date(session.arrivalAtIso).getTime() - Date.now();
    if (untilArrival <= 0) return;
    const id = window.setTimeout(() => router.refresh(), untilArrival + 1_000);
    return () => clearTimeout(id);
  }, [session.arrivalAtIso, router]);

  async function handleEnableNotifications() {
    if (typeof Notification === 'undefined') {
      addToast({ type: 'info', message: 'This browser does not support notifications.' });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotifyEnabled(true);
      addToast({ type: 'success', message: 'You will get a nudge at each zone.' });
    }
  }

  async function handleLate() {
    setBusy(true);
    const result = await recalculateLateAction(session.sessionId, 15);
    setBusy(false);
    if (!result.ok) {
      addToast({ type: 'info', message: result.message ?? 'Could not adjust the schedule.' });
      return;
    }
    addToast({ type: 'success', message: 'Everything shifted 15 minutes. New plan, same calm.' });
    router.refresh();
  }

  async function handleOutTheDoor() {
    setBusy(true);
    const result = await completeDoorknobAction(session.sessionId);
    setBusy(false);
    if (!result.ok) {
      addToast({ type: 'info', message: result.message ?? 'Could not complete the session.' });
      return;
    }
    addToast({
      type: 'success',
      message: result.newBadges.includes('doorknob_made')
        ? '🚪 Out the door — "On Time" earned!'
        : '🚪 Out the door. Safe travels!',
    });
    router.push('/dashboard');
  }

  async function handleCancel() {
    setBusy(true);
    const result = await cancelDoorknobAction(session.sessionId);
    setBusy(false);
    if (!result.ok) {
      addToast({ type: 'info', message: result.message ?? 'Could not cancel.' });
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Leave by {fmtTime(session.departAtIso)}
          </h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            Arrive {fmtTime(session.arrivalAtIso)} · start wrapping up at {fmtTime(session.startAtIso)}
          </p>
        </div>
        {!notifyEnabled && (
          <Button variant="ghost" size="sm" onClick={handleEnableNotifications}>
            🔔 Nudge me at each zone
          </Button>
        )}
      </header>

      <DoorknobTimeline zones={session.zones} />

      {session.preDepartureTasks.length > 0 && (
        <section aria-label="Before you leave">
          <h2 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
            Grab on the way out
          </h2>
          <ul className="space-y-1">
            {session.preDepartureTasks.map((task, i) => (
              <li key={i}>
                <label className="flex items-center gap-2 text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    checked={checked[i] ?? false}
                    onChange={(e) => setChecked((c) => ({ ...c, [i]: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className={checked[i] ? 'line-through opacity-60' : undefined}>{task}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-wrap gap-3" aria-label="Session actions">
        <Button onClick={handleLate} disabled={busy} variant="secondary">
          Running late (+15 min)
        </Button>
        <Button onClick={handleOutTheDoor} disabled={busy}>
          I&apos;m out the door
        </Button>
        <Button onClick={handleCancel} disabled={busy} variant="ghost">
          Plans changed — cancel
        </Button>
      </section>
    </div>
  );
}
