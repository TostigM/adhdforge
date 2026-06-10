'use client';

/**
 * TodaySettingsClient — interactive settings for the Today core loop.
 *
 * Controls:
 *   - Visible slots (1–5 stepper): how many task cards show at once
 *   - Gentle Reframe toggle: enable/disable the reframe card
 *   - Gentle Reframe threshold (3–7 slider): swaps before reframe fires
 *
 * Uses optimistic local state so the UI feels instant; calls server action
 * in the background and reverts on error.
 */

import { useState, useTransition } from 'react';
import type { UserPreferences } from '@focus-forge/domain/users/update-preferences';
import { updatePreferencesAction } from '@/server-actions/users/update-preferences';

// ─── Props ────────────────────────────────────────────────────────────────────

export type TodaySettingsClientProps = {
  initial: Required<UserPreferences>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TodaySettingsClient({ initial }: TodaySettingsClientProps) {
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function save(update: UserPreferences) {
    const optimistic = { ...prefs, ...update };
    setPrefs(optimistic);
    setError(null);

    startTransition(async () => {
      const result = await updatePreferencesAction(update);
      if (!result.ok) {
        setPrefs(prefs); // revert
        setError(result.message ?? 'Could not save settings.');
      }
    });
  }

  return (
    <section className="bg-slate-800 rounded-2xl p-6 space-y-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
        Today settings
      </h2>

      {/* ── Visible slots ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Visible task slots</p>
            <p className="text-xs text-slate-500 mt-0.5">
              How many tasks show at once on your Today screen (1–5).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => save({ visibleSlots: Math.max(1, prefs.visibleSlots - 1) })}
              disabled={isPending || prefs.visibleSlots <= 1}
              aria-label="Decrease visible slots"
              className="h-8 w-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                         flex items-center justify-center text-lg font-bold"
            >
              −
            </button>
            <span className="w-6 text-center text-slate-100 font-semibold tabular-nums">
              {prefs.visibleSlots}
            </span>
            <button
              type="button"
              onClick={() => save({ visibleSlots: Math.min(5, prefs.visibleSlots + 1) })}
              disabled={isPending || prefs.visibleSlots >= 5}
              aria-label="Increase visible slots"
              className="h-8 w-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                         flex items-center justify-center text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ── Gentle Reframe ── */}
      <div className="space-y-3 pt-2 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">Gentle Reframe</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Offers a blame-free options card when a task keeps getting pushed back.
            </p>
          </div>
          {/* Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={prefs.gentleReframeEnabled}
            onClick={() => save({ gentleReframeEnabled: !prefs.gentleReframeEnabled })}
            disabled={isPending}
            className={[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              prefs.gentleReframeEnabled ? 'bg-indigo-600' : 'bg-slate-600',
            ].join(' ')}
          >
            <span
              className={[
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                prefs.gentleReframeEnabled ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>

        {/* Threshold slider — only visible when reframe is enabled */}
        {prefs.gentleReframeEnabled && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Show after</span>
              <span className="text-slate-300 font-medium">
                {prefs.gentleReframeThreshold} push-backs
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={7}
              step={1}
              value={prefs.gentleReframeThreshold}
              onChange={(e) => save({ gentleReframeThreshold: Number(e.target.value) })}
              disabled={isPending}
              aria-label="Gentle reframe threshold"
              className="w-full accent-indigo-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>3 (sooner)</span>
              <span>7 (later)</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-amber-400">{error}</p>
      )}

      {isPending && (
        <p className="text-xs text-slate-500">Saving…</p>
      )}
    </section>
  );
}
