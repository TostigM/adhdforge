/**
 * use-sync-stream.ts — 5-second polling hook for cross-device sync
 * ──────────────────────────────────────────────────────────────────────────────
 * Polls /api/sync every 5 seconds.
 * Pauses when document is hidden (tab not focused). Resumes on focus.
 * Optimistic UI: the hook signals staleness so the page can re-fetch.
 *
 * See 06-build-roadmap.md §4.7
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 5_000;

export type SyncEvent = {
  id: string;
  eventType: string;
  payload: unknown;
  occurredAt: string;
};

export type UseSyncStreamOptions = {
  /** Called whenever new events arrive — use to trigger re-fetch or update local state. */
  onEvents?: (events: SyncEvent[]) => void;
  /** Disable polling altogether (e.g. on unauthenticated pages). Default: true */
  enabled?: boolean;
};

export function useSyncStream({ onEvents, enabled = true }: UseSyncStreamOptions = {}) {
  const [isPolling, setIsPolling] = useState(false);
  const sinceRef = useRef<string>(new Date().toISOString());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!mountedRef.current || document.hidden) return;

    setIsPolling(true);
    try {
      const url = `/api/sync?since=${encodeURIComponent(sinceRef.current)}`;
      const res = await fetch(url);
      if (!res.ok || !mountedRef.current) return;

      const data = (await res.json()) as { events: SyncEvent[]; serverTime: string };

      if (data.serverTime) {
        sinceRef.current = data.serverTime;
      }

      if (data.events.length > 0 && onEvents) {
        onEvents(data.events);
      }
    } catch {
      // Network errors are silent — sync will retry on next tick
    } finally {
      if (mountedRef.current) setIsPolling(false);
    }
  }, [onEvents]);

  // Schedule next poll
  const scheduleNext = useCallback(() => {
    if (!mountedRef.current || !enabled) return;
    timerRef.current = setTimeout(async () => {
      await poll();
      scheduleNext();
    }, POLL_INTERVAL_MS);
  }, [poll, enabled]);

  // Visibility API — resume immediately on tab focus
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible — poll immediately
        poll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [poll, enabled]);

  // Main effect
  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;
    scheduleNext();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleNext, enabled]);

  return { isPolling };
}
