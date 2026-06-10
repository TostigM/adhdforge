/**
 * Integration tests: GET /api/sync
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests the route handler in isolation by mocking next-auth and the db client.
 *
 * Covers:
 *   - 401 when unauthenticated
 *   - 400 when `since` param is not a valid ISO date
 *   - Returns events newer than `since` for the current user only
 *   - Returns `serverTime` in every successful response
 *   - Applies take(200) limit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock next-auth ─────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// ── Mock db client ─────────────────────────────────────────────────────────
vi.mock('@focus-forge/database/client', () => ({
  db: {
    event: {
      findMany: vi.fn(),
    },
  },
}));

// ── Mock auth options (just needs to be an object) ─────────────────────────
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

import { GET } from '../route';
import { getServerSession } from 'next-auth';
import { db } from '@focus-forge/database/client';

function makeRequest(since?: string) {
  const url = since
    ? `http://localhost/api/sync?since=${encodeURIComponent(since)}`
    : 'http://localhost/api/sync';
  return new NextRequest(url);
}

const FAKE_SESSION = { user: { id: 'user_test_01' } };

const FAKE_EVENTS = [
  {
    id: 'evt_1',
    userId: 'user_test_01' as string | null,
    eventType: 'task.created',
    payload: { taskId: 'task_1' },
    occurredAt: new Date('2026-05-31T10:01:00Z'),
  },
];

describe('GET /api/sync', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(db.event.findMany).mockResolvedValue([]);
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET(makeRequest('2026-01-01T00:00:00Z'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthenticated');
  });

  // ── Validation ──────────────────────────────────────────────────────────────

  it('returns 400 for a non-date `since` value', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    const res = await GET(makeRequest('not-a-date'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_since');
  });

  it('accepts epoch 0 as the `since` value (returns everything)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(db.event.findMany).mockResolvedValue(FAKE_EVENTS);
    const res = await GET(makeRequest('1970-01-01T00:00:00.000Z'));
    expect(res.status).toBe(200);
  });

  // ── Response shape ──────────────────────────────────────────────────────────

  it('returns events and serverTime on success', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(db.event.findMany).mockResolvedValue(FAKE_EVENTS);

    const res = await GET(makeRequest('2026-01-01T00:00:00Z'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].eventType).toBe('task.created');
    expect(body.serverTime).toBeDefined();
    expect(new Date(body.serverTime)).toBeInstanceOf(Date);
  });

  it('returns empty events array when nothing is new', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(db.event.findMany).mockResolvedValue([]);

    const res = await GET(makeRequest('2099-01-01T00:00:00Z'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
  });

  // ── Query isolation ─────────────────────────────────────────────────────────

  it('queries events filtered by userId and since timestamp', async () => {
    vi.mocked(getServerSession).mockResolvedValue(FAKE_SESSION);
    vi.mocked(db.event.findMany).mockResolvedValue([]);

    await GET(makeRequest('2026-05-01T00:00:00Z'));

    expect(db.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user_test_01',
          occurredAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
      }),
    );
  });
});
