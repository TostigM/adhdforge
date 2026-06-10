'use client';

/**
 * TimerSettingsClient — sound + haptics toggles for the focus timer (M6).
 *
 * Sound and vibration are INDEPENDENTLY toggleable. (The 10-3 rule + speed-run
 * preferences exist but are intentionally not surfaced until M20 / a later
 * milestone — they stay at their defaults.)
 */

import { useState, useTransition } from 'react';
import type { UserPreferences } from '@focus-forge/domain/users/update-preferences';
import { updatePreferencesAction } from '@/server-actions/users/update-preferences';

export type TimerSettingsClientProps = {
  initialSoundEnabled: boolean;
  initialHapticsEnabled: boolean;
};

export function TimerSettingsClient({ initialSoundEnabled, initialHapticsEnabled }: TimerSettingsClientProps) {
  const [soundEnabled, setSoundEnabled] = useState(initialSoundEnabled);
  const [hapticsEnabled, setHapticsEnabled] = useState(initialHapticsEnabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(update: UserPreferences, revert: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await updatePreferencesAction(update);
      if (!result.ok) {
        revert();
        setError(result.message ?? 'Could not save settings.');
      }
    });
  }

  return (
    <section className="bg-slate-800 rounded-2xl p-6 space-y-5">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Focus timer</h2>

      <SettingToggle
        label="Alert sounds"
        description="Synthesized chimes at interval marks and on completion."
        checked={soundEnabled}
        disabled={isPending}
        onChange={(next) => {
          setSoundEnabled(next);
          save({ soundEnabled: next }, () => setSoundEnabled(!next));
        }}
      />

      <div className="pt-1 border-t border-slate-700" />

      <SettingToggle
        label="Vibration (haptics)"
        description="Gentle haptic cues on supported mobile devices. Suppressed if you prefer reduced motion."
        checked={hapticsEnabled}
        disabled={isPending}
        onChange={(next) => {
          setHapticsEnabled(next);
          save({ hapticsEnabled: next }, () => setHapticsEnabled(!next));
        }}
      />

      {error && <p role="alert" className="text-sm text-amber-400">{error}</p>}
      {isPending && <p className="text-xs text-slate-500">Saving…</p>}
    </section>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-indigo-600' : 'bg-slate-600',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
