'use client';

/**
 * TodayClient — the Today home screen (M4.5 core loop)
 * ──────────────────────────────────────────────────────────────────────────────
 * Layout:
 *   1. Capture field
 *   2. Morning ritual (when pending)
 *   3. Card area — active anchor cards (if within doorknob window) + flex cards.
 *      Total cards = visibleSlots (anchors borrow slots from flex).
 *   4. Compact "Today's schedule" strip — all of today's anchors.
 *   5. Queue counter.
 *
 * See 02-design-system.md §13.5
 */

import React, { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmptyState, useToast, VoiceDumpButton } from '@focus-forge/ui';
import type {
  QueueItem,
  ScheduledAnchor,
  TodayItem,
  TodayViewResult,
} from '@focus-forge/domain/daily-plan/get-today-view';

import { createTaskAction } from '@/server-actions/tasks/create-task';
import { completePlanItemAction } from '@/server-actions/daily-plan/complete-plan-item';
import { swapPlanItemAction } from '@/server-actions/daily-plan/swap-plan-item';
import { addToPlanAction } from '@/server-actions/daily-plan/add-to-plan';
import { updateRitualAction } from '@/server-actions/daily-plan/update-ritual';
import { reframePlanItemAction } from '@/server-actions/daily-plan/reframe-plan-item';
import { useSyncStream } from '@/lib/sync/use-sync-stream';

import { TodayCard } from './TodayCard';
import { MorningRitual } from './MorningRitual';

// ─── Props ────────────────────────────────────────────────────────────────────

/** Compact summary of an active Doorknob session, surfaced on Today. */
export type DoorknobSummary = {
  departAtIso: string;
  startAtIso: string;
  arrivalAtIso: string;
  positionState: 'before_start' | 'in_zone' | 'arrived';
};

export type TodayClientProps = {
  view: TodayViewResult;
  displayName: string;
  doorknob?: DoorknobSummary | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a Date as "8:30 AM" using the user's locale. */
function fmtTime(d: Date | null): string {
  if (!d) return '·';
  return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Convert a ScheduledAnchor to a TodayItem for the TodayCard component. */
function anchorToTodayItem(a: ScheduledAnchor): TodayItem {
  return {
    itemId: a.itemId,
    taskId: a.taskId,
    rawText: a.rawText,
    title: a.title,
    priorityKind: 'anchor',
    priorityLevel: a.priorityLevel,
    scheduledFor: a.scheduledFor,
    estimatedMinutes: a.estimatedMinutes,
    source: 'anchor',
    todaySwapCount: 0,
    showReframeCard: false,
  };
}

// ─── Priority display (matches TodayCard) ─────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  cant_miss: 'bg-amber-400',
  high:      'bg-yellow-500',
  med:       'bg-slate-400',
  low:       'bg-amber-700',
};

const PRIORITY_LABEL: Record<string, string> = {
  cant_miss: 'Amber',
  high:      'Gold',
  med:       'Silver',
  low:       'Bronze',
};

// ─── QueueRow — one line in the backlog drawer ────────────────────────────────

function QueueRow({ item }: { item: QueueItem }) {
  const dotClass = PRIORITY_DOT[item.priorityLevel] ?? 'bg-slate-400';
  const displayText = item.title ?? item.rawText;
  const label = PRIORITY_LABEL[item.priorityLevel] ?? item.priorityLevel;

  return (
    <li className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)]">
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotClass}`}
        aria-label={label}
      />
      <span className="flex-1 truncate">{displayText}</span>
      {item.estimatedMinutes && (
        <span className="text-xs text-[var(--text-tertiary)] shrink-0 tabular-nums">
          {item.estimatedMinutes} min
        </span>
      )}
    </li>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TodayClient({ view, displayName, doorknob }: TodayClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [inputValue, setInputValue] = useState('');
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [movedItems, setMovedItems] = useState<Set<string>>(new Set());
  const [showBacklog, setShowBacklog] = useState(false);
  const [singleTaskMode, setSingleTaskMode] = useState(false);
  const [priorityKind, setPriorityKind] = useState<'flexible' | 'anchor'>('flexible');
  const [priorityLevel, setPriorityLevel] = useState<'low' | 'med' | 'high'>('med');
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [quotaResetIso, setQuotaResetIso] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Voice dump ───────────────────────────────────────────────────────────────
  const handleVoiceRecorded = useCallback(
    async (audio: Blob) => {
      setVoiceBusy(true);
      try {
        const form = new FormData();
        form.append('audio', audio, 'voice-dump.webm');
        const res = await fetch('/api/voice-dump', { method: 'POST', body: form });

        if (res.status === 429) {
          const body = await res.json();
          setQuotaResetIso(body.resetsAtUtc ?? null);
          return;
        }
        if (!res.ok) {
          addToast({ message: 'Couldn’t process that recording. Try typing instead.', type: 'warning' });
          return;
        }
        const body = await res.json();
        const n = body.tasks?.length ?? 0;
        if (n === 0) {
          addToast({ message: 'Heard you, but couldn’t pull out a task. Try again or type it.', type: 'info' });
        } else {
          addToast({ message: `Added ${n} task${n > 1 ? 's' : ''} from your voice. 🎙️`, type: 'success' });
          router.refresh();
        }
      } catch {
        addToast({ message: 'Couldn’t reach the server. Try typing instead.', type: 'warning' });
      } finally {
        setVoiceBusy(false);
      }
    },
    [router, addToast],
  );

  const handleMicDenied = useCallback(() => {
    addToast({ message: 'No mic access — type your thought instead.', type: 'info' });
    inputRef.current?.focus();
  }, [addToast]);

  // Cross-device sync
  useSyncStream({
    onEvents: useCallback(() => { router.refresh(); }, [router]),
  });

  // ── Card composition ───────────────────────────────────────────────────────
  // Active anchors "borrow" flex slots — total visible cards = visibleSlots.
  const { todayItems, scheduledAnchors, visibleSlots, queueCount, doneCount, ritualState, ritualSuggestions, queueItems } = view;

  const activeAnchors = useMemo(
    () => scheduledAnchors.filter((a) => a.isActive && !a.isDone),
    [scheduledAnchors],
  );

  const flexToShow = useMemo(
    () => todayItems.slice(0, Math.max(0, visibleSlots - activeAnchors.length)),
    [todayItems, visibleSlots, activeAnchors.length],
  );

  // All cards for the slot area (anchors first, then flex)
  const allDisplayItems: TodayItem[] = useMemo(
    () => [...activeAnchors.map(anchorToTodayItem), ...flexToShow],
    [activeAnchors, flexToShow],
  );

  // Single-task mode shows only the top item — the overwhelm escape hatch
  const displayItems: TodayItem[] = useMemo(
    () => singleTaskMode ? allDisplayItems.slice(0, 1) : allDisplayItems,
    [singleTaskMode, allDisplayItems],
  );

  // How many tasks are hidden in single-task mode
  const hiddenCount = singleTaskMode ? Math.max(0, allDisplayItems.length - 1) : 0;

  // For MorningRitual preload count — how many anchors are already on today's plan
  const anchorCount = scheduledAnchors.filter((a) => !a.isDone).length;

  // ── Capture ────────────────────────────────────────────────────────────────

  const handleCapture = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text) return;
      setCaptureError(null);

      const priorityInput = priorityKind === 'anchor'
        ? { priorityKind: 'anchor' as const, priorityLevel: 'cant_miss' as const }
        : { priorityKind: 'flexible' as const, priorityLevel };

      startTransition(async () => {
        const result = await createTaskAction({ rawText: text, ...priorityInput });
        if (result.ok) {
          setInputValue('');
          setPriorityKind('flexible'); // reset to defaults after capture
          setPriorityLevel('med');
          // Confirm the capture landed — even when slots are full and it goes to
          // the queue rather than appearing as a card (otherwise it feels like
          // the thought vanished).
          addToast({ message: 'Got it — saved. 📝', type: 'success' });
          router.refresh();
        } else {
          setCaptureError(result.message ?? 'Could not save task. Please try again.');
        }
      });
    },
    [inputValue, priorityKind, priorityLevel, router, addToast],
  );

  // ── Today item actions ────────────────────────────────────────────────────

  const handleComplete = useCallback(
    async (item: TodayItem) => {
      const result = await completePlanItemAction(item.itemId, view.planId);
      if (result.ok) {
        router.refresh();
        addToast({ message: 'Done. Onto the next one. 🎉', type: 'success' });
      } else {
        addToast({ message: result.message ?? 'Could not complete task.', type: 'warning' });
      }
    },
    [view.planId, router, addToast],
  );

  const handleSwap = useCallback(
    async (item: TodayItem) => {
      const result = await swapPlanItemAction(item.itemId, view.planId, item.taskId);
      if (result.ok) {
        setMovedItems((prev) => new Set(prev).add(item.itemId));
        setTimeout(() => {
          setMovedItems((prev) => {
            const next = new Set(prev);
            next.delete(item.itemId);
            return next;
          });
          router.refresh();
        }, 1200);
      } else {
        addToast({ message: result.message ?? 'Could not push task back.', type: 'warning' });
      }
    },
    [view.planId, router, addToast],
  );

  const handleReframeAction = useCallback(
    async (item: TodayItem, action: 'break' | 'lower' | 'anchor' | 'snooze') => {
      // 'anchor' and 'break' need M5+ UI — forward-pointing messages only
      if (action === 'anchor') {
        addToast({ message: 'Give it a set time — scheduling is coming in the next update.', type: 'info' });
        return;
      }
      if (action === 'break') {
        addToast({ message: 'Breaking into steps is coming soon. For now, try lowering its priority.', type: 'info' });
        return;
      }

      // 'snooze' and 'lower' are real DB writes
      const result = await reframePlanItemAction(item.taskId, action);
      if (result.ok) {
        addToast({
          message:
            action === 'snooze'
              ? "Got it — won't surface this again today."
              : 'Priority lowered. One less thing to worry about.',
          type: 'success',
        });
        router.refresh();
      } else {
        addToast({ message: result.message ?? 'Could not update task.', type: 'warning' });
      }
    },
    [router, addToast],
  );

  // ── Ritual actions ────────────────────────────────────────────────────────

  const handleAddTask = useCallback(
    async (taskId: string) => {
      await addToPlanAction(view.planId, taskId, 'ritual');
    },
    [view.planId],
  );

  const handleRitualComplete = useCallback(async () => {
    await updateRitualAction(view.planId, 'complete');
    router.refresh();
  }, [view.planId, router]);

  const handleRitualSkip = useCallback(async () => {
    await updateRitualAction(view.planId, 'skip');
    router.refresh();
  }, [view.planId, router]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Hey, {displayName}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {allDisplayItems.length === 0
              ? 'Nothing pressing right now.'
              : `${flexToShow.length} of ${visibleSlots} tasks · ${queueCount > 0 ? `${queueCount} more later` : 'queue clear'}`}
            {doneCount > 0 && ` · ${doneCount} done today`}
          </p>
        </div>

        {/* Single-task mode toggle — only when there are tasks to show */}
        {allDisplayItems.length > 0 && (
          <button
            type="button"
            onClick={() => setSingleTaskMode((v) => !v)}
            className={[
              'shrink-0 mt-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
              singleTaskMode
                ? 'bg-[var(--accent)] text-slate-900'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]',
            ].join(' ')}
            aria-pressed={singleTaskMode}
            title={singleTaskMode ? 'Show all tasks' : 'Show just one task — less overwhelming'}
          >
            {singleTaskMode ? 'Show everything' : 'One thing at a time'}
          </button>
        )}
      </div>

      {/* Capture form */}
      <form onSubmit={handleCapture} className="flex gap-2" aria-label="Capture a task">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Capture a thought…"
          disabled={isPending}
          aria-label="Task text"
          className={[
            'flex-1 rounded-xl px-4 py-3 text-base',
            'bg-[var(--bg-surface)] border border-[var(--border)]',
            'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
            'transition-colors disabled:opacity-60',
          ].join(' ')}
        />
        {/* Hold-to-record voice dump (falls back to text if mic denied) */}
        <VoiceDumpButton
          onRecorded={handleVoiceRecorded}
          onMicDenied={handleMicDenied}
          busy={voiceBusy}
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !inputValue.trim()}
          className={[
            'rounded-xl px-5 py-3 text-sm font-semibold',
            'bg-[var(--accent)] text-slate-900',
            'hover:opacity-90 active:scale-95 transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {isPending ? '…' : 'Add'}
        </button>
      </form>

      {/* Voice dump quota reached */}
      {quotaResetIso && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 -mt-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            You’ve used your free voice dumps for today.
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Resets at {new Date(quotaResetIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} your time.
          </p>
          <button
            type="button"
            onClick={() => { setQuotaResetIso(null); inputRef.current?.focus(); }}
            className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
          >
            Type instead
          </button>
        </div>
      )}

      {/* Priority pickers: kind (flexible/anchor) + level (bronze/silver/gold) */}
      <div className="flex items-center gap-4 -mt-2">
        {/* Kind toggle */}
        <div className="flex gap-1" role="group" aria-label="Task kind">
          {(['flexible', 'anchor'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setPriorityKind(kind)}
              aria-pressed={priorityKind === kind}
              className={[
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors capitalize',
                priorityKind === kind
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--accent)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
              ].join(' ')}
            >
              {kind === 'anchor' ? '📌 Anchor' : 'Flexible'}
            </button>
          ))}
        </div>

        {/* Level chips — only for flexible tasks */}
        {priorityKind === 'flexible' && (
          <div className="flex gap-1" role="group" aria-label="Priority level">
            {([
              { value: 'low',  label: 'Bronze', dot: 'bg-amber-700'  },
              { value: 'med',  label: 'Silver', dot: 'bg-slate-400'  },
              { value: 'high', label: 'Gold',   dot: 'bg-yellow-500' },
            ] as const).map(({ value, label, dot }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPriorityLevel(value)}
                aria-pressed={priorityLevel === value}
                className={[
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  priorityLevel === value
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--accent)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]',
                ].join(' ')}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Anchor hint */}
        {priorityKind === 'anchor' && (
          <span className="text-xs text-[var(--text-tertiary)]">
            Time-pinned · set the time in task details
          </span>
        )}
      </div>

      {captureError && (
        <p role="alert" className="text-sm text-[var(--soft-error)] -mt-2">
          {captureError}
        </p>
      )}

      {/* Morning ritual */}
      {ritualState === 'pending' && (
        <MorningRitual
          planId={view.planId}
          suggestions={ritualSuggestions}
          preloadedCount={anchorCount}
          onAddTask={handleAddTask}
          onComplete={handleRitualComplete}
          onSkip={handleRitualSkip}
        />
      )}

      {/* ── Active Doorknob summary ── */}
      {doorknob && (
        <Link
          href="/doorknob"
          aria-label={`Doorknob: leave by ${fmtTime(new Date(doorknob.departAtIso))}. Open the timeline.`}
          className={[
            'block rounded-2xl border px-5 py-4 transition-colors',
            doorknob.positionState === 'in_zone'
              ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
              : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <span aria-hidden="true">🚪</span>
                {doorknob.positionState === 'in_zone'
                  ? 'Time to start getting ready'
                  : 'Heading out later'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Leave by{' '}
                <span className="font-medium text-[var(--text-primary)]">
                  {fmtTime(new Date(doorknob.departAtIso))}
                </span>
                {doorknob.positionState === 'before_start' && (
                  <> · start wrapping up at {fmtTime(new Date(doorknob.startAtIso))}</>
                )}
              </p>
            </div>
            <span
              className="shrink-0 text-xs font-medium text-[var(--text-secondary)]"
              aria-hidden="true"
            >
              Open →
            </span>
          </div>
        </Link>
      )}

      {/* ── Card area: active anchors + flex tasks ── */}
      {displayItems.length > 0 ? (
        <section aria-label="Today's tasks">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
            {singleTaskMode ? 'Focus on this' : `Right now · ${displayItems.length}`}
          </h2>
          <ul className="space-y-3">
            {displayItems.map((item) => (
              <li key={item.itemId}>
                <TodayCard
                  item={item}
                  onComplete={() => handleComplete(item)}
                  onSwap={() => handleSwap(item)}
                  onReframeAction={(action) => handleReframeAction(item, action)}
                  movedConfirmation={movedItems.has(item.itemId)}
                />
              </li>
            ))}
          </ul>
          {/* Hidden tasks note in single-task mode */}
          {singleTaskMode && hiddenCount > 0 && (
            <p className="text-xs text-[var(--text-tertiary)] mt-3 text-center">
              {hiddenCount} more task{hiddenCount > 1 ? 's' : ''} waiting — this one first.
            </p>
          )}
        </section>
      ) : ritualState !== 'pending' ? (
        <EmptyState
          icon="✨"
          message="Nothing pressing right now. That's allowed."
          description={
            queueCount > 0
              ? `${queueCount} task${queueCount > 1 ? 's' : ''} waiting in the queue — pull one when you're ready.`
              : "Capture something above when you're ready."
          }
        />
      ) : null}

      {/* ── Compact schedule strip ── */}
      {scheduledAnchors.length > 0 && (
        <section aria-label="Today's scheduled events">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">
            Today&apos;s schedule
          </h2>
          <ul className="space-y-0.5">
            {scheduledAnchors.map((anchor) => (
              <li
                key={anchor.itemId}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  anchor.isDone
                    ? 'opacity-40 line-through text-[var(--text-tertiary)]'
                    : anchor.isActive
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]',
                ].join(' ')}
              >
                {/* Active pulse dot */}
                {anchor.isActive && !anchor.isDone ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0 animate-pulse"
                    aria-label="Active now"
                  />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--border)] shrink-0" aria-hidden="true" />
                )}

                {/* Time */}
                <span className="tabular-nums text-xs text-[var(--text-tertiary)] w-14 shrink-0">
                  {fmtTime(anchor.scheduledFor)}
                </span>

                {/* Title */}
                <span className="flex-1 truncate">{anchor.title ?? anchor.rawText}</span>

                {/* Duration */}
                {anchor.estimatedMinutes && !anchor.isDone && (
                  <span className="text-xs text-[var(--text-tertiary)] shrink-0 tabular-nums">
                    {anchor.estimatedMinutes} min
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Queue counter + "All tasks" backlog drawer */}
      {queueCount > 0 && (
        <div className="pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setShowBacklog((v) => !v)}
            className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-2 flex items-center justify-between"
            aria-expanded={showBacklog}
            aria-controls="backlog-drawer"
          >
            <span>{queueCount} more in the queue</span>
            <span aria-hidden="true">{showBacklog ? '↑ Hide' : '↓ Show all'}</span>
          </button>

          {showBacklog && (
            <section id="backlog-drawer" aria-label="Queued tasks">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] mb-2 mt-1">
                Up next
              </h2>
              <ul className="space-y-0.5 mb-2">
                {queueItems.map((item) => (
                  <QueueRow key={item.itemId} item={item} />
                ))}
              </ul>
              {queueCount > queueItems.length && (
                <p className="text-xs text-[var(--text-tertiary)] pb-1">
                  …and {queueCount - queueItems.length} more. Complete tasks above — they&apos;ll bubble up automatically.
                </p>
              )}
              {queueCount <= queueItems.length && (
                <p className="text-xs text-[var(--text-tertiary)] pb-1">
                  Complete or push back tasks above — they&apos;ll bubble up automatically.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
