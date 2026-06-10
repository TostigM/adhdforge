/**
 * Unit tests: useSyncStream hook
 * @vitest-environment jsdom
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests polling behaviour, visibility-change shortcut, and disabled mode.
 * Uses fake timers so tests don't actually wait 5 seconds.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncStream, type SyncEvent } from '../use-sync-stream';

// ── Helpers ───────────────────────────────────────────────────────────────────

const POLL_MS = 5_000;

const FAKE_EVENTS: SyncEvent[] = [
  { id: 'evt_1', eventType: 'task.created', payload: {}, occurredAt: '2026-05-31T10:00:00Z' },
];

function makeFetchResponse(events: SyncEvent[] = [], serverTime?: string) {
  return Promise.resolve(
    new Response(
      JSON.stringify({
        events,
        serverTime: serverTime ?? new Date().toISOString(),
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  );
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(() => makeFetchResponse()));
  // Default: tab is visible
  Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useSyncStream', () => {
  it('does not poll when enabled is false', async () => {
    renderHook(() => useSyncStream({ enabled: false }));
    await act(async () => { vi.advanceTimersByTime(POLL_MS * 2); });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('polls /api/sync after the poll interval elapses', async () => {
    renderHook(() => useSyncStream({ enabled: true }));

    await act(async () => { vi.advanceTimersByTime(POLL_MS); });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0] ?? '')).toMatch('/api/sync?since=');
  });

  it('calls onEvents when events are returned', async () => {
    vi.stubGlobal('fetch', vi.fn(() => makeFetchResponse(FAKE_EVENTS)));
    const onEvents = vi.fn();

    renderHook(() => useSyncStream({ enabled: true, onEvents }));
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });

    expect(onEvents).toHaveBeenCalledOnce();
    expect(onEvents).toHaveBeenCalledWith(FAKE_EVENTS);
  });

  it('does not call onEvents when events array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(() => makeFetchResponse([])));
    const onEvents = vi.fn();

    renderHook(() => useSyncStream({ enabled: true, onEvents }));
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });

    expect(onEvents).not.toHaveBeenCalled();
  });

  it('skips the poll when document is hidden', async () => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });

    renderHook(() => useSyncStream({ enabled: true }));
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('polls immediately when tab becomes visible', async () => {
    // Start hidden so the scheduled poll is skipped
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    renderHook(() => useSyncStream({ enabled: true }));
    await act(async () => { vi.advanceTimersByTime(POLL_MS); });
    expect(fetch).not.toHaveBeenCalled();

    // Tab becomes visible — visibilitychange should fire an immediate poll
    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
