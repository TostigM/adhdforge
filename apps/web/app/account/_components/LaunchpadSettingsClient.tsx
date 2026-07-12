'use client';

/**
 * LaunchpadSettingsClient — the nightly "set up tomorrow's launchpad" reminder
 * (M9.3). Opt-in only, never auto-enabled. Enabling asks for browser
 * notification permission (that click is the required user gesture); the
 * reminder fires while the app is open, matching the Doorknob delivery model.
 */

import { useState, useTransition } from 'react';

import { setNightlyReminderAction } from '@/server-actions/launchpad/set-nightly-reminder';

export type LaunchpadSettingsClientProps = {
  initialEnabled: boolean;
  initialTime: string; // 'HH:MM'
};

export function LaunchpadSettingsClient({
  initialEnabled,
  initialTime,
}: LaunchpadSettingsClientProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime);
  const [error, setError] = useState<string | null>(null);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(nextEnabled: boolean, nextTime: string, revert: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await setNightlyReminderAction({ enabled: nextEnabled, timeLocal: nextTime });
      if (!result.ok) {
        revert();
        setError(result.message ?? 'Could not save settings.');
      }
    });
  }

  async function handleToggle(next: boolean) {
    setPermissionNote(null);
    if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // The toggle click is the user gesture the browser requires.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPermissionNote(
          'Notifications are blocked in the browser, so the reminder will only show while the launchpad page is open.',
        );
      }
    }
    setEnabled(next);
    save(next, time, () => setEnabled(!next));
  }

  return (
    <section className="bg-slate-800 rounded-2xl p-6 space-y-5">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Launchpad</h2>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-200">Nightly reminder</p>
          <p className="text-xs text-slate-500 mt-0.5">
            A gentle evening nudge to set up tomorrow&rsquo;s launchpad. Shows while the app is
            open.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Nightly launchpad reminder"
          disabled={isPending}
          onClick={() => handleToggle(!enabled)}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            enabled ? 'bg-indigo-600' : 'bg-slate-600',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-700">
          <label htmlFor="launchpad-reminder-time" className="text-sm text-slate-300">
            Remind me at
          </label>
          <input
            id="launchpad-reminder-time"
            type="time"
            value={time}
            disabled={isPending}
            onChange={(e) => {
              const previous = time;
              const next = e.target.value;
              if (!next) return;
              setTime(next);
              save(enabled, next, () => setTime(previous));
            }}
            className="rounded-lg bg-slate-700 border border-slate-600 px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {permissionNote && <p className="text-xs text-slate-400">{permissionNote}</p>}
      {error && (
        <p role="alert" className="text-sm text-amber-400">
          {error}
        </p>
      )}
      {isPending && <p className="text-xs text-slate-500">Saving…</p>}
    </section>
  );
}
