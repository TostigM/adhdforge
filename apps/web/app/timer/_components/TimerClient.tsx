'use client';

/**
 * TimerClient — the analog focus timer (M6).
 * ──────────────────────────────────────────────────────────────────────────────
 * Setup → running ↔ paused → done. Diminishing wedge (no digital countdown),
 * synthesized Sound Family alerts that cycle to avoid habituation, vibration
 * cues (honouring haptics + reduced-motion), and a Picture-in-Picture pop-out.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnalogTimer, useToast } from '@focus-forge/ui';
import { computeWedge } from '@focus-forge/domain/timer/wedge';
import {
  SOUND_FAMILIES,
  SOUND_FAMILY_KEYS,
  selectNextVariation,
  type SoundFamilyKey,
} from '@focus-forge/domain/timer/sound-families';
import { resolveVibration } from '@focus-forge/domain/timer/vibration-patterns';

import { playVariation, unlockAudio } from '@/lib/audio/sound-engine';
import { openTimerPiP, type TimerPiP } from '@/lib/pip/timer-pip';
import {
  startTimerAction,
  pauseTimerAction,
  resumeTimerAction,
  endTimerAction,
} from '@/server-actions/timer/focus-session';
import { recordTenThreeMarkAction } from '@/server-actions/timer/hooks';

const PRESETS = [15, 25, 45] as const;
const ALERT_OPTIONS = [
  { label: 'No interval chimes', seconds: 0 },
  { label: 'Every 5 min', seconds: 300 },
  { label: 'Every 10 min', seconds: 600 },
] as const;

type Phase = 'setup' | 'running' | 'paused' | 'done';

export type TimerClientProps = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  tenThreeRuleEnabled: boolean;
};

export function TimerClient({ soundEnabled, hapticsEnabled, tenThreeRuleEnabled }: TimerClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [phase, setPhase] = useState<Phase>('setup');
  const [plannedSeconds, setPlannedSeconds] = useState(25 * 60);
  const [customMin, setCustomMin] = useState('');
  const [soundFamily, setSoundFamily] = useState<SoundFamilyKey>('soft_chimes');
  const [alertSeconds, setAlertSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [doneBadges, setDoneBadges] = useState<string[]>([]);

  // Timing refs (not state — avoid re-render churn)
  const sessionIdRef = useRef<string | null>(null);
  const elapsedBeforePauseRef = useRef(0);
  const runStartRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertMarkRef = useRef(0);
  const lastTenThreeMarkRef = useRef(0);
  const lastVariationRef = useRef<number | null>(null);
  const pipRef = useRef<TimerPiP | null>(null);
  const reducedMotionRef = useRef(false);
  const elapsedRef = useRef(0);
  const phaseRef = useRef<Phase>('setup');

  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  const wedge = computeWedge(elapsed, plannedSeconds);

  // ── Sound + haptics ──────────────────────────────────────────────────────────
  const playAlert = useCallback(() => {
    if (!soundEnabled) return;
    const idx = selectNextVariation(soundFamily, lastVariationRef.current);
    lastVariationRef.current = idx;
    const spec = SOUND_FAMILIES[soundFamily].variations[idx];
    if (spec) playVariation(spec);
  }, [soundEnabled, soundFamily]);

  const vibrate = useCallback(
    (key: 'interval_chime' | 'timer_complete') => {
      const pattern = resolveVibration(key, { hapticsEnabled, prefersReducedMotion: reducedMotionRef.current });
      if (pattern && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    },
    [hapticsEnabled],
  );

  // ── Tick loop ────────────────────────────────────────────────────────────────
  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const finish = useCallback(
    async (status: 'completed' | 'incomplete', actualSeconds: number) => {
      stopTick();
      const id = sessionIdRef.current;
      if (status === 'completed') {
        playAlert();
        vibrate('timer_complete');
      }
      if (id) {
        const result = await endTimerAction({ sessionId: id, actualDurationSeconds: Math.round(actualSeconds), status });
        if (result.ok && status === 'completed') setDoneBadges(result.newBadges);
      }
      pipRef.current?.close();
      pipRef.current = null;
      sessionIdRef.current = null; // ended — don't let unmount cleanup re-end it
      if (status === 'completed') {
        setPhase('done');
      } else {
        addToast({ message: 'Session ended. No pressure — come back any time.', type: 'info' });
        setPhase('setup');
        setElapsed(0);
      }
    },
    [stopTick, playAlert, vibrate, addToast],
  );

  const tick = useCallback(() => {
    const now = Date.now();
    const current = elapsedBeforePauseRef.current + (now - runStartRef.current) / 1000;

    // Interval chimes (cycled variation)
    if (alertSeconds > 0) {
      const mark = Math.floor(current / alertSeconds);
      if (mark > lastAlertMarkRef.current && current < plannedSeconds) {
        lastAlertMarkRef.current = mark;
        playAlert();
        vibrate('interval_chime');
      }
    }

    // 10-3 rule scaffolding: fire the movement-due signal every 10 min
    if (tenThreeRuleEnabled) {
      const mark = Math.floor(current / 600);
      if (mark > lastTenThreeMarkRef.current) {
        lastTenThreeMarkRef.current = mark;
        if (sessionIdRef.current) void recordTenThreeMarkAction(sessionIdRef.current);
      }
    }

    // The pop-out is self-driving (own interval + absolute end-time) — no need
    // to push frames to it here; it keeps counting even after navigation.

    if (current >= plannedSeconds) {
      setElapsed(plannedSeconds);
      void finish('completed', plannedSeconds);
      return;
    }
    setElapsed(current);
  }, [alertSeconds, plannedSeconds, playAlert, vibrate, tenThreeRuleEnabled, finish]);

  const startTick = useCallback(() => {
    stopTick();
    runStartRef.current = Date.now();
    tickRef.current = setInterval(tick, 250);
  }, [stopTick, tick]);

  // On unmount (e.g. navigating away mid-session): if a pop-out is keeping the
  // timer alive, leave the session running — the PiP drives it to completion.
  // Otherwise end it neutrally so we don't orphan a "running" row.
  useEffect(
    () => () => {
      stopTick();
      const live = phaseRef.current === 'running' || phaseRef.current === 'paused';
      if (live && sessionIdRef.current && !pipRef.current) {
        void endTimerAction({
          sessionId: sessionIdRef.current,
          actualDurationSeconds: Math.round(elapsedRef.current),
          status: 'incomplete',
        });
      }
    },
    [stopTick],
  );

  // ── Controls ─────────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    unlockAudio(); // must happen in the click handler
    const result = await startTimerAction({
      plannedDurationSeconds: plannedSeconds,
      soundFamily: soundEnabled ? soundFamily : null,
      alertIntervalSeconds: alertSeconds || null,
    });
    if (!result.ok) {
      addToast({ message: result.message ?? 'Could not start the timer.', type: 'warning' });
      return;
    }
    sessionIdRef.current = result.sessionId;
    elapsedBeforePauseRef.current = 0;
    lastAlertMarkRef.current = 0;
    lastTenThreeMarkRef.current = 0;
    lastVariationRef.current = null;
    setElapsed(0);
    setPhase('running');
    startTick();
    for (const b of result.newBadges) addToast({ message: `Badge earned: ${b.replace(/_/g, ' ')} 🎉`, type: 'success' });
  }, [plannedSeconds, soundEnabled, soundFamily, alertSeconds, startTick, addToast]);

  const handlePause = useCallback(async () => {
    stopTick();
    elapsedBeforePauseRef.current = elapsed;
    setPhase('paused');
    pipRef.current?.pause(Math.max(0, plannedSeconds - elapsed)); // freeze the pop-out too
    if (sessionIdRef.current) await pauseTimerAction(sessionIdRef.current);
  }, [elapsed, plannedSeconds, stopTick]);

  const handleResume = useCallback(async () => {
    setPhase('running');
    startTick();
    pipRef.current?.resume(Date.now() + Math.max(0, plannedSeconds - elapsed) * 1000);
    if (sessionIdRef.current) await resumeTimerAction(sessionIdRef.current);
  }, [startTick, plannedSeconds, elapsed]);

  const handleStop = useCallback(() => {
    void finish('incomplete', elapsed);
  }, [finish, elapsed]);

  const handlePopOut = useCallback(async () => {
    if (pipRef.current) { pipRef.current.close(); pipRef.current = null; return; }
    const remaining = Math.max(0, plannedSeconds - elapsed);
    const pip = await openTimerPiP({
      endsAtMs: Date.now() + remaining * 1000,
      plannedSeconds,
      sessionId: sessionIdRef.current,
      paused: phase === 'paused',
    });
    if (!pip) {
      addToast({ message: 'Pop-out isn’t available in this browser.', type: 'info' });
      return;
    }
    pip.onClose(() => { pipRef.current = null; });
    pipRef.current = pip;
  }, [plannedSeconds, elapsed, phase, addToast]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const minutesLabel = Math.round(plannedSeconds / 60);

  return (
    <div className="max-w-md mx-auto px-4 py-10 flex flex-col items-center">
      {phase === 'setup' && (
        <SetupView
          plannedSeconds={plannedSeconds}
          setPlannedSeconds={setPlannedSeconds}
          customMin={customMin}
          setCustomMin={setCustomMin}
          soundEnabled={soundEnabled}
          soundFamily={soundFamily}
          setSoundFamily={setSoundFamily}
          alertSeconds={alertSeconds}
          setAlertSeconds={setAlertSeconds}
          onStart={handleStart}
        />
      )}

      {(phase === 'running' || phase === 'paused') && (
        <div className="flex flex-col items-center gap-6 w-full">
          <p className="text-sm text-[var(--text-secondary)]">
            {minutesLabel}-minute focus{phase === 'paused' ? ' · paused' : ''}
          </p>

          <AnalogTimer
            fractionRemaining={wedge.fractionRemaining}
            zone={wedge.zone}
            size={300}
            paused={phase === 'paused'}
            ariaLabel={`Focus timer, about ${Math.round(wedge.fractionRemaining * minutesLabel)} minutes remaining`}
          />

          <div className="flex flex-wrap gap-2 justify-center">
            {phase === 'running' ? (
              <ControlButton onClick={handlePause} variant="ghost">Pause</ControlButton>
            ) : (
              <ControlButton onClick={handleResume} variant="primary">Resume</ControlButton>
            )}
            <ControlButton onClick={handleStop} variant="ghost">Stop</ControlButton>
            <ControlButton onClick={handlePopOut} variant="ghost">Pop out</ControlButton>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-5xl" aria-hidden="true">🎉</div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Focus complete</h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-xs">
            {minutesLabel} minutes of focus. That counts.
          </p>
          {doneBadges.length > 0 && (
            <p className="text-xs text-[var(--text-tertiary)]">
              Badge{doneBadges.length > 1 ? 's' : ''}: {doneBadges.map((b) => b.replace(/_/g, ' ')).join(', ')}
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <ControlButton onClick={() => { setPhase('setup'); setElapsed(0); setDoneBadges([]); }} variant="primary">
              Start another
            </ControlButton>
            <ControlButton onClick={() => router.push('/dashboard')} variant="ghost">Back to today</ControlButton>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Setup view ─────────────────────────────────────────────────────────────────

function SetupView(props: {
  plannedSeconds: number;
  setPlannedSeconds: (s: number) => void;
  customMin: string;
  setCustomMin: (s: string) => void;
  soundEnabled: boolean;
  soundFamily: SoundFamilyKey;
  setSoundFamily: (k: SoundFamilyKey) => void;
  alertSeconds: number;
  setAlertSeconds: (s: number) => void;
  onStart: () => void;
}) {
  const {
    plannedSeconds, setPlannedSeconds, customMin, setCustomMin,
    soundEnabled, soundFamily, setSoundFamily, alertSeconds, setAlertSeconds, onStart,
  } = props;

  const isPreset = PRESETS.some((p) => p * 60 === plannedSeconds);

  return (
    <div className="w-full space-y-7">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center">Focus timer</h1>

      {/* Duration */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Duration</p>
        <div className="flex gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setPlannedSeconds(m * 60); setCustomMin(''); }}
              aria-pressed={plannedSeconds === m * 60}
              className={[
                'flex-1 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
                plannedSeconds === m * 60
                  ? 'bg-[var(--accent)] text-slate-900'
                  : 'bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              ].join(' ')}
            >
              {m} min
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            min={1}
            max={360}
            value={customMin}
            onChange={(e) => {
              setCustomMin(e.target.value);
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 1 && n <= 360) setPlannedSeconds(Math.round(n) * 60);
            }}
            placeholder="Custom"
            aria-label="Custom minutes"
            className={[
              'w-28 rounded-xl px-3 py-2 text-sm bg-[var(--bg-surface)] border text-[var(--text-primary)]',
              !isPreset && customMin ? 'border-[var(--accent)]' : 'border-[var(--border)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            ].join(' ')}
          />
          <span className="text-sm text-[var(--text-tertiary)]">minutes (custom)</span>
        </div>
      </div>

      {/* Sound */}
      {soundEnabled && (
        <>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Sound family</p>
            <div className="flex flex-col gap-2">
              {SOUND_FAMILY_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSoundFamily(k)}
                  aria-pressed={soundFamily === k}
                  className={[
                    'rounded-xl px-4 py-2.5 text-sm text-left transition-colors border',
                    soundFamily === k
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--accent)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  {SOUND_FAMILIES[k].displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Interval chimes</p>
            <div className="flex flex-col gap-2">
              {ALERT_OPTIONS.map((opt) => (
                <button
                  key={opt.seconds}
                  type="button"
                  onClick={() => setAlertSeconds(opt.seconds)}
                  aria-pressed={alertSeconds === opt.seconds}
                  className={[
                    'rounded-xl px-4 py-2.5 text-sm text-left transition-colors border',
                    alertSeconds === opt.seconds
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--accent)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-2xl px-6 py-4 text-base font-semibold bg-[var(--accent)] text-slate-900 hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Start focus
      </button>
    </div>
  );
}

// ─── Small control button ────────────────────────────────────────────────────────

function ControlButton({
  onClick,
  variant,
  children,
}: {
  onClick: () => void;
  variant: 'primary' | 'ghost';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-xl px-5 py-2.5 text-sm font-semibold transition-all active:scale-95',
        variant === 'primary'
          ? 'bg-[var(--accent)] text-slate-900 hover:opacity-90'
          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
