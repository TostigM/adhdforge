'use client';

/**
 * PraiseSenderClient — record a voice memo for someone you care about (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * MediaRecorder with a 60-second auto-stop, preview before sending, and up to
 * 3 memos per invite. Single column, no red, no pressure — the sender is a
 * guest doing something kind.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

const MAX_SECONDS = 60;

type Phase = 'idle' | 'recording' | 'preview' | 'sending' | 'sent' | 'done';

export function PraiseSenderClient({
  token,
  displayName,
  memosRemaining: initialRemaining,
}: {
  token: string;
  displayName: string;
  memosRemaining: number;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [remaining, setRemaining] = useState(initialRemaining);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const durationMsRef = useRef(0);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicDenied(true);
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      durationMsRef.current = Math.min(Date.now() - startedAtRef.current, MAX_SECONDS * 1000);
      blobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = URL.createObjectURL(blobRef.current);
      if (tickRef.current) window.clearInterval(tickRef.current);
      setPhase('preview');
    };

    startedAtRef.current = Date.now();
    setSeconds(0);
    recorder.start();
    setPhase('recording');

    tickRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stopRecording();
    }, 250);
  }, [stopRecording]);

  const discard = useCallback(() => {
    blobRef.current = null;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPhase('idle');
  }, []);

  const send = useCallback(async () => {
    if (!blobRef.current) return;
    setPhase('sending');
    setError(null);

    const form = new FormData();
    form.append('token', token);
    form.append('audio', new File([blobRef.current], 'memo.webm', { type: 'audio/webm' }));
    form.append('durationMs', String(durationMsRef.current));

    try {
      const res = await fetch('/api/praise/upload', { method: 'POST', body: form });
      const body = await res.json();
      if (!body.ok) {
        setError(body.message ?? 'That didn’t send. Please try again.');
        setPhase('preview');
        return;
      }
      discard();
      setRemaining(body.memosRemaining);
      setPhase(body.memosRemaining > 0 ? 'sent' : 'done');
    } catch {
      setError('That didn’t send. Check your connection and try again.');
      setPhase('preview');
    }
  }, [token, discard]);

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      <header className="text-center mb-8">
        <div className="text-4xl mb-3" aria-hidden="true">
          💌
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Leave a voice memo for someone who trusts you
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          They invited you as{' '}
          <span className="font-medium text-[var(--text-primary)]">“{displayName}”</span> — that’s
          the name they’ll see on your memo. Say something they can replay on a hard day.
        </p>
      </header>

      {micDenied && (
        <p className="text-center text-[var(--text-secondary)] mb-6" role="alert">
          The microphone is blocked in this browser. Allow mic access for this page, then try
          again.
        </p>
      )}

      {/* ── Idle / done states ── */}
      {phase === 'idle' && (
        <div className="text-center">
          <button
            type="button"
            onClick={startRecording}
            className="rounded-full bg-[var(--accent)] px-8 py-4 text-white font-medium"
          >
            🎙 Start recording
          </button>
          <p className="text-xs text-[var(--text-tertiary)] mt-3">
            Up to 60 seconds · {remaining} recording{remaining === 1 ? '' : 's'} left on this link
          </p>
        </div>
      )}

      {phase === 'recording' && (
        <div className="text-center" aria-live="polite">
          <p className="text-3xl font-semibold tabular-nums text-[var(--text-primary)] mb-4">
            {seconds}s
          </p>
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-full border border-[var(--accent)] px-8 py-4 text-[var(--text-primary)] font-medium"
          >
            ⏹ Stop
          </button>
          <p className="text-xs text-[var(--text-tertiary)] mt-3">Stops by itself at 60 seconds</p>
        </div>
      )}

      {(phase === 'preview' || phase === 'sending') && previewUrlRef.current && (
        <div className="text-center space-y-4">
          <audio controls src={previewUrlRef.current} className="w-full" />
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={discard}
              disabled={phase === 'sending'}
              className="rounded-xl border border-[var(--border)] px-5 py-3 text-[var(--text-secondary)]"
            >
              Re-record
            </button>
            <button
              type="button"
              onClick={send}
              disabled={phase === 'sending'}
              className="rounded-xl bg-[var(--accent)] px-6 py-3 text-white font-medium disabled:opacity-60"
            >
              {phase === 'sending' ? 'Sending…' : 'Send it 💜'}
            </button>
          </div>
        </div>
      )}

      {phase === 'sent' && (
        <div className="text-center space-y-4" role="status">
          <p className="text-lg text-[var(--text-primary)]">Sent. That will mean a lot. 💜</p>
          <p className="text-sm text-[var(--text-secondary)]">
            You can leave {remaining} more recording{remaining === 1 ? '' : 's'} on this link.
          </p>
          <button
            type="button"
            onClick={startRecording}
            className="rounded-full bg-[var(--accent)] px-6 py-3 text-white font-medium"
          >
            🎙 Record another
          </button>
        </div>
      )}

      {phase === 'done' && (
        <p className="text-center text-lg text-[var(--text-primary)]" role="status">
          Sent — and that was the last recording on this link. Thank you. 💜
        </p>
      )}

      {error && (
        <p role="alert" className="text-center text-sm text-[var(--soft-error,#c026d3)] mt-4">
          {error}
        </p>
      )}

      {/* ── Honest privacy fine print ── */}
      <footer className="mt-12 border-t border-[var(--border)] pt-4">
        <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
          No account needed and we don’t collect your email. Your recording is stored privately
          and only the person who invited you can play it. To protect them from abuse, your IP
          address is kept for 7 days and then deleted. They can remove your recordings at any
          time.
        </p>
      </footer>
    </div>
  );
}
