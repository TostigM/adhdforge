'use client';

/**
 * VoiceDumpButton — hold-to-record voice capture (M7).
 * ──────────────────────────────────────────────────────────────────────────────
 * Press and hold to record via MediaRecorder; release to stop and hand the audio
 * blob to the parent. If the mic is denied/unavailable, it calls `onMicDenied`
 * and the parent silently falls back to the text field (Rule: no shame, no dead
 * ends). No red anywhere; recording state uses the accent colour.
 *
 * Hooks + browser APIs → must be a client component.
 */

import React, { useCallback, useRef, useState } from 'react';

export interface VoiceDumpButtonProps {
  /** Called with the recorded audio when the user releases. */
  onRecorded: (audio: Blob) => void;
  /** Called when the mic can't be used — parent should focus the text input. */
  onMicDenied?: () => void;
  /** Disable interaction (e.g. while a previous dump is processing). */
  disabled?: boolean;
  /** Show a processing state (upload/transcription in flight). */
  busy?: boolean;
}

type State = 'idle' | 'recording';

export function VoiceDumpButton({ onRecorded, onMicDenied, disabled, busy }: VoiceDumpButtonProps) {
  const [state, setState] = useState<State>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (disabled || busy || state === 'recording') return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onMicDenied?.();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        stopStream();
        if (blob.size > 0) onRecorded(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setState('recording');
    } catch {
      stopStream();
      onMicDenied?.();
    }
  }, [disabled, busy, state, onMicDenied, onRecorded, stopStream]);

  const stop = useCallback(() => {
    if (state !== 'recording') return;
    setState('idle');
    try {
      recorderRef.current?.stop();
    } catch {
      stopStream();
    }
    recorderRef.current = null;
  }, [state, stopStream]);

  const recording = state === 'recording';

  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-label={recording ? 'Recording — release to finish' : 'Hold to record a voice dump'}
      aria-pressed={recording}
      onPointerDown={(e) => { e.preventDefault(); void start(); }}
      onPointerUp={(e) => { e.preventDefault(); stop(); }}
      onPointerLeave={() => { if (recording) stop(); }}
      onPointerCancel={() => { if (recording) stop(); }}
      className={[
        'relative shrink-0 rounded-xl h-[46px] w-[46px] flex items-center justify-center',
        'transition-colors select-none touch-none',
        recording
          ? 'bg-[var(--accent)] text-slate-900'
          : 'bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        (disabled || busy) ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      {recording && (
        <span
          className="absolute inset-0 rounded-xl ring-2 ring-[var(--accent)] motion-safe:animate-ping"
          aria-hidden="true"
        />
      )}
      {busy ? <Spinner /> : recording ? <Waveform /> : <MicIcon />}
    </button>
  );
}

VoiceDumpButton.displayName = 'VoiceDumpButton';

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" strokeLinecap="round" />
    </svg>
  );
}

function Waveform() {
  return (
    <span className="flex items-end gap-[2px] h-4" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] bg-slate-900 rounded-full motion-safe:animate-pulse"
          style={{ height: `${[10, 16, 8, 14][i]}px`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="motion-safe:animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
