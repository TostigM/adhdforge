/**
 * doorknob-sessions.test.ts — DB-backed session lifecycle
 * (create / get-active / recalculate-late / complete / cancel)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';
import { cancelDoorknob } from '../cancel-doorknob';
import { completeDoorknob } from '../complete-doorknob';
import { createDoorknobSession } from '../create-doorknob-session';
import { getActiveDoorknob } from '../get-active-doorknob';
import { recalculateLate } from '../recalculate-late';
import type { DoorknobAlertPayload } from '../_session';

const USER = 'user_test_01';
const NOW = new Date('2026-06-15T18:00:00Z'); // 11 AM PDT
const ARRIVAL = new Date('2026-06-15T20:00:00Z'); // 1 PM PDT

let db: ReturnType<typeof makeMockPrisma>;

beforeEach(() => {
  vi.clearAllMocks();
  db = makeMockPrisma();
  db.scheduledAlert.updateMany.mockResolvedValue({ count: 0 });
  db.scheduledAlert.createMany.mockResolvedValue({ count: 4 });
  db.scheduledAlert.findMany.mockResolvedValue([]);
  db.event.create.mockResolvedValue({});
  db.badge.findMany.mockResolvedValue([]);
});

/** Build the alert rows a real create would have persisted. */
function sessionRows(sessionId: string, overrides: Partial<DoorknobAlertPayload['session']> = {}) {
  const session = {
    arrivalAtIso: ARRIVAL.toISOString(),
    transitMinutes: 20,
    gatherMinutes: 15,
    wrapUpMinutes: 15,
    doorMinutes: 10,
    preDepartureTasks: ['keys', 'water bottle'],
    createdAtIso: NOW.toISOString(),
    ...overrides,
  };
  // Zone starts for these params: wrap 19:00, gather 19:15, door 19:30, transit 19:40
  const starts: Array<[DoorknobAlertPayload['zoneKey'], string]> = [
    ['wrap_up', '2026-06-15T19:00:00.000Z'],
    ['gather', '2026-06-15T19:15:00.000Z'],
    ['door', '2026-06-15T19:30:00.000Z'],
    ['transit', '2026-06-15T19:40:00.000Z'],
  ];
  return starts.map(([zoneKey, iso], i) => ({
    id: `alert_${i}`,
    payload: { sessionId, zoneKey, session } satisfies DoorknobAlertPayload,
    scheduledFor: new Date(iso),
    createdAt: new Date(NOW),
  }));
}

// ─── createDoorknobSession ────────────────────────────────────────────────────

describe('createDoorknobSession', () => {
  it('creates one pending alert per future zone start', async () => {
    const r = await createDoorknobSession(
      db,
      { userId: USER, arrivalAt: ARRIVAL, transitMinutes: 20 },
      NOW,
    );

    expect(r.ok).toBe(true);
    const created = db.scheduledAlert.createMany.mock.calls[0]?.[0].data as Array<{
      alertType: string;
      scheduledFor: Date;
      payload: DoorknobAlertPayload;
    }>;
    expect(created).toHaveLength(4);
    expect(created.every((a) => a.alertType === 'doorknob_zone')).toBe(true);
    expect(created.map((a) => a.payload.zoneKey)).toEqual(['wrap_up', 'gather', 'door', 'transit']);
    // All payloads share one sessionId and carry full session params
    const ids = new Set(created.map((a) => a.payload.sessionId));
    expect(ids.size).toBe(1);
    expect(created[0]?.payload.session.arrivalAtIso).toBe(ARRIVAL.toISOString());
  });

  it('cancels any previous pending doorknob alerts first (one session at a time)', async () => {
    await createDoorknobSession(db, { userId: USER, arrivalAt: ARRIVAL, transitMinutes: 20 }, NOW);

    expect(db.scheduledAlert.updateMany).toHaveBeenCalledWith({
      where: { userId: USER, alertType: 'doorknob_zone', status: 'pending' },
      data: { status: 'cancelled' },
    });
  });

  it('skips zone starts already in the past (late session start)', async () => {
    // Now is 19:20 — wrap_up (19:00) and gather (19:15) already started
    const late = new Date('2026-06-15T19:20:00Z');
    const r = await createDoorknobSession(
      db,
      { userId: USER, arrivalAt: ARRIVAL, transitMinutes: 20 },
      late,
    );

    expect(r.ok).toBe(true);
    const created = db.scheduledAlert.createMany.mock.calls[0]?.[0].data as Array<{
      payload: DoorknobAlertPayload;
    }>;
    expect(created.map((a) => a.payload.zoneKey)).toEqual(['door', 'transit']);
  });

  it('rejects a departure already in the past', async () => {
    // Arrival 20:00 with 130 min transit → depart 17:50, before NOW (18:00)
    const r = await createDoorknobSession(
      db,
      { userId: USER, arrivalAt: ARRIVAL, transitMinutes: 130 },
      NOW,
    );
    expect(r).toMatchObject({ ok: false, error: 'departure_passed' });
    expect(db.scheduledAlert.createMany).not.toHaveBeenCalled();
  });

  it('trims, drops empties, and caps the pre-departure checklist', async () => {
    const tasks = ['  keys  ', '', '   ', ...Array.from({ length: 12 }, (_, i) => `item ${i}`)];
    await createDoorknobSession(
      db,
      { userId: USER, arrivalAt: ARRIVAL, transitMinutes: 20, preDepartureTasks: tasks },
      NOW,
    );

    const created = db.scheduledAlert.createMany.mock.calls[0]?.[0].data as Array<{
      payload: DoorknobAlertPayload;
    }>;
    const list = created[0]?.payload.session.preDepartureTasks ?? [];
    expect(list[0]).toBe('keys');
    expect(list).toHaveLength(10);
    expect(list.every((t) => t.length > 0)).toBe(true);
  });

  it('logs doorknob.created', async () => {
    await createDoorknobSession(db, { userId: USER, arrivalAt: ARRIVAL, transitMinutes: 20 }, NOW);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'doorknob.created', userId: USER }),
      }),
    );
  });

  it('propagates invalid input from the calculator', async () => {
    const r = await createDoorknobSession(
      db,
      { userId: USER, arrivalAt: ARRIVAL, transitMinutes: -1 },
      NOW,
    );
    expect(r).toMatchObject({ ok: false, error: 'invalid_input' });
  });

  it('returns db_error when persistence fails (never throws)', async () => {
    db.scheduledAlert.createMany.mockRejectedValue(new Error('boom'));
    const r = await createDoorknobSession(
      db,
      { userId: USER, arrivalAt: ARRIVAL, transitMinutes: 20 },
      NOW,
    );
    expect(r).toMatchObject({ ok: false, error: 'db_error' });
  });
});

// ─── getActiveDoorknob ────────────────────────────────────────────────────────

describe('getActiveDoorknob', () => {
  it('returns null when there are no pending alerts', async () => {
    const r = await getActiveDoorknob(db, USER, NOW);
    expect(r).toMatchObject({ ok: true, value: null });
  });

  it('rebuilds the session from alert payloads', async () => {
    db.scheduledAlert.findMany.mockResolvedValue(sessionRows('sess_1'));

    const r = await getActiveDoorknob(db, USER, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok || r.value === null) throw new Error('expected a session');

    expect(r.value.sessionId).toBe('sess_1');
    expect(r.value.schedule.departAt.toISOString()).toBe('2026-06-15T19:40:00.000Z');
    expect(r.value.schedule.startAt.toISOString()).toBe('2026-06-15T19:00:00.000Z');
    expect(r.value.preDepartureTasks).toEqual(['keys', 'water bottle']);
    expect(r.value.position).toEqual({ state: 'before_start', nextZone: 'wrap_up' });
    expect(r.value.pendingAlerts).toHaveLength(4);
  });

  it('reports the current zone when mid-session', async () => {
    db.scheduledAlert.findMany.mockResolvedValue(sessionRows('sess_1').slice(2)); // door+transit pending
    const midGather = new Date('2026-06-15T19:20:00Z');

    const r = await getActiveDoorknob(db, USER, midGather);
    if (!r.ok || r.value === null) throw new Error('expected a session');
    expect(r.value.position).toEqual({ state: 'in_zone', zone: 'gather' });
  });

  it('returns null once arrival has passed (session simply over — no failed state)', async () => {
    db.scheduledAlert.findMany.mockResolvedValue(sessionRows('sess_1'));
    const afterArrival = new Date('2026-06-15T20:01:00Z');

    const r = await getActiveDoorknob(db, USER, afterArrival);
    expect(r).toMatchObject({ ok: true, value: null });
  });

  it('skips corrupt payloads without throwing', async () => {
    db.scheduledAlert.findMany.mockResolvedValue([
      { id: 'bad', payload: { nonsense: true }, scheduledFor: NOW, createdAt: NOW },
    ]);
    const r = await getActiveDoorknob(db, USER, NOW);
    expect(r).toMatchObject({ ok: true, value: null });
  });
});

// ─── recalculateLate ──────────────────────────────────────────────────────────

describe('recalculateLate', () => {
  it('shifts every pending alert and the arrival by +15 (default)', async () => {
    db.scheduledAlert.findMany.mockResolvedValue(sessionRows('sess_1'));
    db.scheduledAlert.update.mockResolvedValue({});

    const r = await recalculateLate(db, { userId: USER, sessionId: 'sess_1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.value.arrivalAt.toISOString()).toBe('2026-06-15T20:15:00.000Z');
    expect(r.value.departAt.toISOString()).toBe('2026-06-15T19:55:00.000Z');

    // Each of the 4 pending alerts was moved to its shifted zone start
    expect(db.scheduledAlert.update).toHaveBeenCalledTimes(4);
    const newTimes = db.scheduledAlert.update.mock.calls
      .map((c) => (c[0] as { data: { scheduledFor: Date } }).data.scheduledFor.toISOString())
      .sort();
    expect(newTimes).toEqual([
      '2026-06-15T19:15:00.000Z',
      '2026-06-15T19:30:00.000Z',
      '2026-06-15T19:45:00.000Z',
      '2026-06-15T19:55:00.000Z',
    ]);
    // Payload snapshots carry the new arrival
    const firstPayload = db.scheduledAlert.update.mock.calls[0]?.[0].data
      .payload as DoorknobAlertPayload;
    expect(firstPayload.session.arrivalAtIso).toBe('2026-06-15T20:15:00.000Z');
  });

  it('only shifts downstream: fired alerts are not part of the query', async () => {
    db.scheduledAlert.findMany.mockResolvedValue(sessionRows('sess_1').slice(2));
    db.scheduledAlert.update.mockResolvedValue({});

    await recalculateLate(db, { userId: USER, sessionId: 'sess_1' });

    const where = db.scheduledAlert.findMany.mock.calls[0]?.[0].where as Record<string, unknown>;
    expect(where.status).toBe('pending');
    expect(db.scheduledAlert.update).toHaveBeenCalledTimes(2);
  });

  it('logs doorknob.recalculated with the shift size', async () => {
    db.scheduledAlert.findMany.mockResolvedValue(sessionRows('sess_1'));
    db.scheduledAlert.update.mockResolvedValue({});

    await recalculateLate(db, { userId: USER, sessionId: 'sess_1', minutes: 30 });

    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'doorknob.recalculated',
          payload: { sessionId: 'sess_1', minutes: 30 },
        }),
      }),
    );
  });

  it('rejects out-of-range shifts', async () => {
    for (const minutes of [0, -15, 121, 2.5]) {
      const r = await recalculateLate(db, { userId: USER, sessionId: 'sess_1', minutes });
      expect(r, `minutes=${minutes}`).toMatchObject({ ok: false, error: 'invalid_input' });
    }
  });

  it('not_found when the session has no pending alerts', async () => {
    db.scheduledAlert.findMany.mockResolvedValue([]);
    const r = await recalculateLate(db, { userId: USER, sessionId: 'sess_gone' });
    expect(r).toMatchObject({ ok: false, error: 'not_found' });
  });
});

// ─── completeDoorknob ─────────────────────────────────────────────────────────

describe('completeDoorknob', () => {
  it('cancels remaining alerts, logs doorknob.completed, awards badges', async () => {
    db.scheduledAlert.count.mockResolvedValue(4);
    db.scheduledAlert.updateMany.mockResolvedValue({ count: 2 });
    db.badge.findMany.mockResolvedValue([
      {
        id: 'badge_doorknob',
        badgeKey: 'doorknob_made',
        isRepeatable: true,
        triggerThreshold: 1,
      },
    ]);
    db.event.count.mockResolvedValue(1);
    db.userBadge.create.mockResolvedValue({});

    const r = await completeDoorknob(db, { userId: USER, sessionId: 'sess_1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(db.scheduledAlert.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'cancelled' } }),
    );
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'doorknob.completed' }),
      }),
    );
    expect(r.value.newBadges).toEqual(['doorknob_made']);
  });

  it('not_found for an unknown session', async () => {
    db.scheduledAlert.count.mockResolvedValue(0);
    const r = await completeDoorknob(db, { userId: USER, sessionId: 'nope' });
    expect(r).toMatchObject({ ok: false, error: 'not_found' });
  });

  it('badge engine failure is non-fatal', async () => {
    db.scheduledAlert.count.mockResolvedValue(1);
    db.scheduledAlert.updateMany.mockResolvedValue({ count: 1 });
    db.badge.findMany.mockRejectedValue(new Error('badge boom'));

    const r = await completeDoorknob(db, { userId: USER, sessionId: 'sess_1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.newBadges).toEqual([]);
  });
});

// ─── cancelDoorknob ───────────────────────────────────────────────────────────

describe('cancelDoorknob', () => {
  it('cancels pending alerts and logs a neutral doorknob.cancelled', async () => {
    db.scheduledAlert.updateMany.mockResolvedValue({ count: 3 });

    const r = await cancelDoorknob(db, { userId: USER, sessionId: 'sess_1' });
    expect(r.ok).toBe(true);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ eventType: 'doorknob.cancelled' }),
      }),
    );
  });

  it('not_found when nothing was pending', async () => {
    db.scheduledAlert.updateMany.mockResolvedValue({ count: 0 });
    const r = await cancelDoorknob(db, { userId: USER, sessionId: 'sess_1' });
    expect(r).toMatchObject({ ok: false, error: 'not_found' });
  });

  it('never awards a badge for cancelling (no judgment either way)', async () => {
    db.scheduledAlert.updateMany.mockResolvedValue({ count: 3 });
    await cancelDoorknob(db, { userId: USER, sessionId: 'sess_1' });
    expect(db.userBadge.create).not.toHaveBeenCalled();
  });
});
