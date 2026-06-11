/**
 * Unit tests: focus-session lifecycle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  endFocusSession,
} from '../focus-session';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';

vi.mock('../../badges/check-and-award', () => ({
  checkAndAward: vi.fn().mockResolvedValue([]),
}));

const USER = 'user_test_01';

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fs_test_01',
    userId: USER,
    taskId: null,
    plannedDurationSeconds: 1500,
    actualDurationSeconds: null,
    status: 'running',
    soundFamily: null,
    alertIntervalSeconds: null,
    startedAt: new Date(),
    endedAt: null,
    ...overrides,
  };
}

describe('startFocusSession', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.focusSession.create.mockResolvedValue(makeSession());
    db.event.create.mockResolvedValue({});
  });

  it('rejects non-positive durations', async () => {
    const r = await startFocusSession(db, { userId: USER, plannedDurationSeconds: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_duration');
  });

  it('rejects durations beyond the 6h cap', async () => {
    const r = await startFocusSession(db, { userId: USER, plannedDurationSeconds: 6 * 60 * 60 + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_duration');
  });

  it('creates a running session and logs focus_session.started', async () => {
    const r = await startFocusSession(db, { userId: USER, plannedDurationSeconds: 1500, soundFamily: 'soft_chimes' });
    expect(r.ok).toBe(true);
    expect(db.focusSession.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'running', plannedDurationSeconds: 1500, soundFamily: 'soft_chimes' }) }),
    );
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'focus_session.started' }) }),
    );
  });

  it('checks the first_focus badge on start', async () => {
    const { checkAndAward } = await import('../../badges/check-and-award');
    await startFocusSession(db, { userId: USER, plannedDurationSeconds: 1500 });
    expect(checkAndAward).toHaveBeenCalledWith(db, USER, 'focus_session.started');
  });

  it('returns db_error when create throws', async () => {
    db.focusSession.create.mockRejectedValue(new Error('down'));
    const r = await startFocusSession(db, { userId: USER, plannedDurationSeconds: 1500 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('db_error');
  });
});

describe('pause / resume', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.focusSession.update.mockResolvedValue({});
  });

  it('pause: running → paused', async () => {
    db.focusSession.findUnique.mockResolvedValue(makeSession({ status: 'running' }));
    const r = await pauseFocusSession(db, { sessionId: 'fs_test_01', userId: USER });
    expect(r.ok).toBe(true);
    expect(db.focusSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'paused' } }),
    );
  });

  it('pause rejects when not running', async () => {
    db.focusSession.findUnique.mockResolvedValue(makeSession({ status: 'paused' }));
    const r = await pauseFocusSession(db, { sessionId: 'fs_test_01', userId: USER });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_state');
  });

  it('pause forbids another user', async () => {
    db.focusSession.findUnique.mockResolvedValue(makeSession({ userId: 'someone_else' }));
    const r = await pauseFocusSession(db, { sessionId: 'fs_test_01', userId: USER });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('forbidden');
  });

  it('resume: paused → running', async () => {
    db.focusSession.findUnique.mockResolvedValue(makeSession({ status: 'paused' }));
    const r = await resumeFocusSession(db, { sessionId: 'fs_test_01', userId: USER });
    expect(r.ok).toBe(true);
    expect(db.focusSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'running' } }),
    );
  });

  it('resume rejects when not paused', async () => {
    db.focusSession.findUnique.mockResolvedValue(makeSession({ status: 'running' }));
    const r = await resumeFocusSession(db, { sessionId: 'fs_test_01', userId: USER });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('invalid_state');
  });

  it('returns session_not_found when missing', async () => {
    db.focusSession.findUnique.mockResolvedValue(null);
    const r = await pauseFocusSession(db, { sessionId: 'nope', userId: USER });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('session_not_found');
  });
});

describe('endFocusSession', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.focusSession.findUnique.mockResolvedValue(makeSession({ status: 'running' }));
    db.focusSession.update.mockResolvedValue({});
    db.event.create.mockResolvedValue({});
  });

  it('completed: sets status/actual/endedAt and logs focus_session.completed', async () => {
    const r = await endFocusSession(db, { sessionId: 'fs_test_01', userId: USER, actualDurationSeconds: 1500, status: 'completed' });
    expect(r.ok).toBe(true);
    const call = db.focusSession.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.status).toBe('completed');
    expect(call.data.actualDurationSeconds).toBe(1500);
    expect(call.data.endedAt).toBeInstanceOf(Date);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'focus_session.completed' }) }),
    );
  });

  it('checks focus_complete badge on completion', async () => {
    const { checkAndAward } = await import('../../badges/check-and-award');
    await endFocusSession(db, { sessionId: 'fs_test_01', userId: USER, actualDurationSeconds: 1500, status: 'completed' });
    expect(checkAndAward).toHaveBeenCalledWith(db, USER, 'focus_session.completed');
  });

  it('incomplete is neutral — no completed event, never "failed"', async () => {
    await endFocusSession(db, { sessionId: 'fs_test_01', userId: USER, actualDurationSeconds: 300, status: 'incomplete' });
    const call = db.focusSession.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.status).toBe('incomplete');
    expect(call.data.status).not.toBe('failed');
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it('is idempotent — already-ended session does nothing', async () => {
    db.focusSession.findUnique.mockResolvedValue(makeSession({ status: 'completed' }));
    await endFocusSession(db, { sessionId: 'fs_test_01', userId: USER, actualDurationSeconds: 1500, status: 'completed' });
    expect(db.focusSession.update).not.toHaveBeenCalled();
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it('clamps negative actualDuration to 0', async () => {
    await endFocusSession(db, { sessionId: 'fs_test_01', userId: USER, actualDurationSeconds: -50, status: 'incomplete' });
    const call = db.focusSession.update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.actualDurationSeconds).toBe(0);
  });

  it('returns db_error when update throws', async () => {
    db.focusSession.update.mockRejectedValue(new Error('down'));
    const r = await endFocusSession(db, { sessionId: 'fs_test_01', userId: USER, actualDurationSeconds: 1500, status: 'completed' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('db_error');
  });
});
