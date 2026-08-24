'use client';

/**
 * PraiseInboxClient — memo cards with playback (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * Play goes through /api/praise/play/[id] (quota gate → 1-hour signed URL);
 * over-quota shows the approved soft message, calmly, in place. Speed controls
 * 1× / 1.25× / 1.5×. Transcripts render for Pro; free sees a soft note.
 * Report opens a small modal; the memo leaves the list immediately after.
 */

import React, { useCallback, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@focus-forge/ui';
import type { MemoCategory } from '@focus-forge/domain/praise/set-memo-category';

import { reportPraiseMemoAction } from '@/server-actions/praise/report-memo';
import { setMemoCategoryAction } from '@/server-actions/praise/set-category';
import { useSyncStream } from '@/lib/sync/use-sync-stream';

export type SerializedMemo = {
  id: string;
  senderDisplayName: string;
  audioDurationMs: number;
  transcript: string | null;
  transcriptStatus: string;
  category: string | null;
  playCount: number;
  createdAtIso: string;
};

const CATEGORY_LABELS: Record<MemoCategory, string> = {
  overwhelmed: 'Listen when overwhelmed',
  before_big_task: 'Before a big task',
  after_failure: 'After a hard day',
};

const SPEEDS = [1, 1.25, 1.5] as const;

const REPORT_REASONS = [
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Something else' },
] as const;

export function PraiseInboxClient({
  memos,
  archived,
  hiddenByReportCount,
  isPro,
}: {
  memos: SerializedMemo[];
  archived: SerializedMemo[];
  hiddenByReportCount: number;
  isPro: boolean;
}) {
  const router = useRouter();
  useSyncStream({ onEvents: () => router.refresh() });

  const [showArchived, setShowArchived] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState<string | null>(null);

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Praise</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Voices from people in your corner. Replay them whenever you need to.
        </p>
      </header>

      {quotaMessage && (
        <div
          className="mb-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] px-5 py-4 text-center text-[var(--text-primary)]"
          role="status"
        >
          {quotaMessage}
        </div>
      )}

      {hiddenByReportCount > 0 && (
        <p className="mb-4 text-xs text-[var(--text-tertiary)]">
          {hiddenByReportCount} memo{hiddenByReportCount === 1 ? ' is' : 's are'} with our review
          team and hidden for now.
        </p>
      )}

      {memos.length === 0 && archived.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--text-secondary)] mb-4">
            Nothing here yet — and that’s just a starting point.
          </p>
          <a href="/account/praise-senders" className="text-[var(--accent)] hover:underline">
            Invite someone who’s in your corner →
          </a>
        </div>
      ) : (
        <ul className="space-y-4">
          {memos.map((memo) => (
            <li key={memo.id}>
              <MemoCard memo={memo} isPro={isPro} onQuotaMessage={setQuotaMessage} />
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section className="mt-8">
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            aria-expanded={showArchived}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {showArchived ? '▾' : '▸'} Archived ({archived.length}) — still yours, still playable
          </button>
          {showArchived && (
            <ul className="space-y-4 mt-4">
              {archived.map((memo) => (
                <li key={memo.id}>
                  <MemoCard memo={memo} isPro={isPro} onQuotaMessage={setQuotaMessage} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

// ─── One memo card ────────────────────────────────────────────────────────────

function MemoCard({
  memo,
  isPro,
  onQuotaMessage,
}: {
  memo: SerializedMemo;
  isPro: boolean;
  onQuotaMessage: (m: string | null) => void;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [, startTransition] = useTransition();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const play = useCallback(async () => {
    onQuotaMessage(null);
    // A signed URL lives 1 hour — reuse it within the session (replays of the
    // SAME load still meter: each press calls play(), see below).
    setLoading(true);
    try {
      const res = await fetch(`/api/praise/play/${memo.id}`, { method: 'POST' });
      const body = await res.json();
      if (!body.ok) {
        if (body.error === 'quota_reached') {
          onQuotaMessage(body.message);
        } else {
          addToast({ message: body.message ?? 'Playback didn’t start. Try again?', type: 'info' });
        }
        return;
      }
      setAudioUrl(body.url);
      requestAnimationFrame(() => {
        if (audioRef.current) {
          audioRef.current.playbackRate = speed;
          void audioRef.current.play();
        }
      });
    } catch {
      addToast({ message: 'Playback didn’t start. Try again?', type: 'info' });
    } finally {
      setLoading(false);
    }
  }, [memo.id, speed, addToast, onQuotaMessage]);

  const changeSpeed = useCallback((next: (typeof SPEEDS)[number]) => {
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, []);

  const setCategory = useCallback(
    (category: MemoCategory | '') => {
      startTransition(async () => {
        const result = await setMemoCategoryAction(memo.id, category === '' ? null : category);
        if (!result.ok) {
          addToast({ message: result.message ?? 'That didn’t save. Try again?', type: 'info' });
          return;
        }
        router.refresh();
      });
    },
    [memo.id, router, addToast],
  );

  const seconds = Math.round(memo.audioDurationMs / 1000);
  const date = new Date(memo.createdAtIso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium text-[var(--text-primary)]">{memo.senderDisplayName}</h2>
          <p className="text-xs text-[var(--text-tertiary)]">
            {date} · {seconds}s
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          Report
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={play}
          disabled={loading}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? '…' : '▶ Play'}
        </button>
        <div className="flex gap-1" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeSpeed(s)}
              aria-pressed={speed === s}
              className={
                speed === s
                  ? 'rounded-full border border-[var(--accent)] px-2.5 py-1 text-xs text-[var(--text-primary)]'
                  : 'rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)]'
              }
            >
              {s}×
            </button>
          ))}
        </div>
        <select
          value={(memo.category as MemoCategory) ?? ''}
          onChange={(e) => setCategory(e.target.value as MemoCategory | '')}
          aria-label={`Listening moment for the memo from ${memo.senderDisplayName}`}
          className="ml-auto bg-transparent text-xs text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded"
        >
          <option value="">No category</option>
          {(Object.keys(CATEGORY_LABELS) as MemoCategory[]).map((key) => (
            <option key={key} value={key}>
              {CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {audioUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- transcript rendered below for Pro
        <audio ref={audioRef} controls src={audioUrl} className="mt-3 w-full" />
      )}

      {isPro && memo.transcript ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)] border-l-2 border-[var(--border)] pl-3">
          {memo.transcript}
        </p>
      ) : !isPro ? (
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">Transcripts are a Pro feature.</p>
      ) : null}

      {showReport && <ReportModal memoId={memo.id} onClose={() => setShowReport(false)} />}
    </article>
  );
}

// ─── Report modal ─────────────────────────────────────────────────────────────

function ReportModal({ memoId, onClose }: { memoId: string; onClose: () => void }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]['value']>('inappropriate');
  const [details, setDetails] = useState('');

  const submit = useCallback(() => {
    startTransition(async () => {
      const result = await reportPraiseMemoAction(memoId, reason, details);
      if (!result.ok) {
        addToast({ message: result.message ?? 'That didn’t send. Try again?', type: 'info' });
        return;
      }
      addToast({
        message: 'Reported. The memo is hidden while our team reviews it.',
        type: 'success',
      });
      onClose();
      router.refresh();
    });
  }, [memoId, reason, details, router, addToast, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Report this memo"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[var(--bg-elevated)] p-6 space-y-4">
        <h3 className="font-medium text-[var(--text-primary)]">Report this memo</h3>
        <p className="text-xs text-[var(--text-secondary)]">
          It will be hidden from your inbox right away while our team reviews it.
        </p>
        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
              />
              {r.label}
            </label>
          ))}
        </div>
        <div>
          <label htmlFor={`report-details-${memoId}`} className="text-xs text-[var(--text-secondary)]">
            Anything that helps us understand (optional)
          </label>
          <textarea
            id={`report-details-${memoId}`}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? 'Sending…' : 'Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
