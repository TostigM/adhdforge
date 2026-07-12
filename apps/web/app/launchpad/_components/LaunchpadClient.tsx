'use client';

/**
 * LaunchpadClient — the "items by the door" checklist (M9).
 * ──────────────────────────────────────────────────────────────────────────────
 * Single column (Rule 6), big touch targets, no red (Rule 1), and no shame:
 * unchecked items are simply "not packed yet", never overdue.
 *
 * Optimistic updates for check/uncheck (the most frequent action); add /
 * reorder / delete go through useTransition + router.refresh. Reorder uses
 * accessible up/down buttons (StepsEditor precedent, M5).
 *
 * Nightly reminder: when the server says a reminder is pending, arm a
 * client-side Notification timer — same delivery model as Doorknob zones (M8):
 * fires while the app is open; the daily cron sweeps the row as bookkeeping.
 */

import React, {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@focus-forge/ui';
import type { LaunchpadItemView } from '@focus-forge/domain/launchpad/list-items';

import { addLaunchpadItemAction } from '@/server-actions/launchpad/add-item';
import { checkLaunchpadItemAction } from '@/server-actions/launchpad/check-item';
import { deleteLaunchpadItemAction } from '@/server-actions/launchpad/delete-item';
import { reorderLaunchpadItemsAction } from '@/server-actions/launchpad/reorder-items';
import { updateLaunchpadItemAction } from '@/server-actions/launchpad/update-item';
import { useSyncStream } from '@/lib/sync/use-sync-stream';

const SCHEDULE_LABELS: Record<LaunchpadItemView['resetSchedule'], string> = {
  daily: 'Resets daily',
  on_departure: 'Resets when you head out',
  never: 'Stays checked',
};

// Optimistic patches — applied instantly, then superseded by the server props
// once the transition's router.refresh() lands. useOptimistic reverts on its
// own, so an interleaved refresh from an earlier mutation can't clobber a
// newer optimistic state (that race broke check-persistence in E2E).
type OptimisticPatch =
  | { type: 'check'; id: string; checked: boolean }
  | { type: 'schedule'; id: string; resetSchedule: LaunchpadItemView['resetSchedule'] }
  | { type: 'reorder'; orderedIds: string[] }
  | { type: 'delete'; id: string };

function applyPatch(state: LaunchpadItemView[], patch: OptimisticPatch): LaunchpadItemView[] {
  switch (patch.type) {
    case 'check':
      return state.map((i) => (i.id === patch.id ? { ...i, isChecked: patch.checked } : i));
    case 'schedule':
      return state.map((i) =>
        i.id === patch.id ? { ...i, resetSchedule: patch.resetSchedule } : i,
      );
    case 'reorder': {
      const byId = new Map(state.map((i) => [i.id, i]));
      const reordered = patch.orderedIds
        .map((id) => byId.get(id))
        .filter((i): i is LaunchpadItemView => i !== undefined);
      return reordered.length === state.length ? reordered : state;
    }
    case 'delete':
      return state.filter((i) => i.id !== patch.id);
  }
}

export function LaunchpadClient({
  items: initialItems,
  reminderAtIso,
}: {
  items: LaunchpadItemView[];
  reminderAtIso: string | null;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Server props are the truth; patches render instantly during transitions.
  const [items, applyOptimistic] = useOptimistic(initialItems, applyPatch);

  const [newLabel, setNewLabel] = useState('');

  // Cross-device: refresh when this user's events arrive on the 5s poll.
  useSyncStream({ onEvents: () => router.refresh() });

  // ── Nightly reminder (client-side delivery, M8 pattern) ────────────────────
  const reminderFired = useRef(false);
  useEffect(() => {
    if (!reminderAtIso || reminderFired.current) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const delay = new Date(reminderAtIso).getTime() - Date.now();
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
    const timer = window.setTimeout(() => {
      reminderFired.current = true;
      new Notification('Focus Forge', {
        body: "Time to set up tomorrow's launchpad.",
        tag: 'launchpad-nightly',
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reminderAtIso]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const label = newLabel.trim();
      if (!label) return;
      setNewLabel('');
      startTransition(async () => {
        const result = await addLaunchpadItemAction(label);
        if (!result.ok) {
          setNewLabel(label); // give the text back — nothing is lost
          addToast({ message: result.message ?? 'That didn’t save. Try again?', type: 'info' });
          return;
        }
        router.refresh();
      });
    },
    [newLabel, router, addToast],
  );

  const handleCheck = useCallback(
    (item: LaunchpadItemView, checked: boolean) => {
      startTransition(async () => {
        applyOptimistic({ type: 'check', id: item.id, checked });
        const result = await checkLaunchpadItemAction(item.id, checked);
        if (!result.ok) {
          addToast({ message: result.message ?? 'That didn’t save. Try again?', type: 'info' });
        }
        router.refresh(); // success or not, converge on server truth
      });
    },
    [router, addToast, applyOptimistic],
  );

  const handleMove = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return;
      const next = [...items];
      const [moved] = next.splice(index, 1);
      if (!moved) return;
      next.splice(target, 0, moved);
      const orderedIds = next.map((i) => i.id);
      startTransition(async () => {
        applyOptimistic({ type: 'reorder', orderedIds });
        const result = await reorderLaunchpadItemsAction(orderedIds);
        if (!result.ok) {
          addToast({ message: result.message ?? 'Reorder didn’t save. Try again?', type: 'info' });
        }
        router.refresh();
      });
    },
    [items, router, addToast, applyOptimistic],
  );

  const handleScheduleChange = useCallback(
    (item: LaunchpadItemView, resetSchedule: LaunchpadItemView['resetSchedule']) => {
      startTransition(async () => {
        applyOptimistic({ type: 'schedule', id: item.id, resetSchedule });
        const result = await updateLaunchpadItemAction(item.id, { resetSchedule });
        if (!result.ok) {
          addToast({ message: result.message ?? 'That didn’t save. Try again?', type: 'info' });
        }
        router.refresh();
      });
    },
    [router, addToast, applyOptimistic],
  );

  const handleDelete = useCallback(
    (item: LaunchpadItemView) => {
      startTransition(async () => {
        applyOptimistic({ type: 'delete', id: item.id });
        const result = await deleteLaunchpadItemAction(item.id);
        if (!result.ok) {
          addToast({ message: result.message ?? 'That didn’t save. Try again?', type: 'info' });
        }
        router.refresh();
      });
    },
    [router, addToast, applyOptimistic],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const total = items.length;
  const checkedCount = items.filter((i) => i.isChecked).length;
  const allPacked = total > 0 && checkedCount === total;

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Launchpad</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          The things you grab on the way out. Daily items uncheck themselves each morning.
        </p>
      </header>

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <label htmlFor="launchpad-new-item" className="sr-only">
          New launchpad item
        </label>
        <input
          id="launchpad-new-item"
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Keys, wallet, lunch…"
          maxLength={120}
          className="flex-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={isPending || newLabel.trim().length === 0}
          className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
        >
          Add
        </button>
      </form>

      {/* All packed */}
      {allPacked && (
        <div
          className="mb-6 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] px-5 py-4 text-center"
          role="status"
        >
          <span className="text-lg" aria-hidden="true">
            🚪
          </span>{' '}
          <span className="text-[var(--text-primary)] font-medium">Ready to go.</span>{' '}
          <span className="text-[var(--text-secondary)]">Everything’s by the door.</span>
        </div>
      )}

      {/* Items — single column, big touch targets */}
      {total === 0 ? (
        <p className="text-center text-[var(--text-secondary)] py-10">
          Nothing here yet. Add the things you always pat your pockets for.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <label className="flex flex-1 items-center gap-3 cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    onChange={(e) => handleCheck(item, e.target.checked)}
                    className="h-6 w-6 rounded-md accent-[var(--accent)]"
                  />
                  <span
                    className={
                      item.isChecked
                        ? 'text-[var(--text-tertiary)] line-through'
                        : 'text-[var(--text-primary)]'
                    }
                  >
                    {item.label}
                  </span>
                </label>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0 || isPending}
                    aria-label={`Move ${item.label} up`}
                    className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === items.length - 1 || isPending}
                    aria-label={`Move ${item.label} down`}
                    className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between pl-9">
                <select
                  value={item.resetSchedule}
                  onChange={(e) =>
                    handleScheduleChange(item, e.target.value as LaunchpadItemView['resetSchedule'])
                  }
                  aria-label={`Reset schedule for ${item.label}`}
                  className="bg-transparent text-xs text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] rounded"
                >
                  {(Object.keys(SCHEDULE_LABELS) as Array<keyof typeof SCHEDULE_LABELS>).map(
                    (key) => (
                      <option key={key} value={key}>
                        {SCHEDULE_LABELS[key]}
                      </option>
                    ),
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={isPending}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {total > 0 && !allPacked && (
        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {checkedCount} of {total} by the door
        </p>
      )}
    </main>
  );
}
