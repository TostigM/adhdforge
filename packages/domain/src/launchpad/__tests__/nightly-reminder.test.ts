/**
 * Unit tests: nextReminderInstant + ensureNightlyReminder (M9.3).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';
import { ensureNightlyReminder, nextReminderInstant } from '../nightly-reminder';

// PDT: 21:00 local = 04:00 UTC next calendar day
const NOW = new Date('2026-07-08T22:00:00Z'); // 15:00 PDT
const TONIGHT = new Date('2026-07-09T04:00:00.000Z'); // 21:00 PDT July 8

describe('nextReminderInstant', () => {
  it('before the time today → tonight', () => {
    expect(nextReminderInstant('21:00', NOW).toISOString()).toBe(TONIGHT.toISOString());
  });

  it('after the time today → tomorrow night', () => {
    const lateEvening = new Date('2026-07-09T05:30:00Z'); // 22:30 PDT July 8
    expect(nextReminderInstant('21:00', lateEvening).toISOString()).toBe(
      '2026-07-10T04:00:00.000Z', // 21:00 PDT July 9
    );
  });

  it('winter (PST) → 21:00 local is 05:00 UTC', () => {
    const now = new Date('2026-01-15T16:00:00Z'); // 08:00 PST
    expect(nextReminderInstant('21:00', now).toISOString()).toBe('2026-01-16T05:00:00.000Z');
  });
});

describe('ensureNightlyReminder', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.scheduledAlert.updateMany.mockResolvedValue({ count: 0 });
    db.scheduledAlert.findMany.mockResolvedValue([]);
    db.scheduledAlert.create.mockResolvedValue({});
  });

  it('rejects a malformed time', async () => {
    const result = await ensureNightlyReminder(db, {
      userId: 'u1',
      enabled: true,
      timeLocal: '9pm',
      now: NOW,
    });
    expect(result).toMatchObject({ ok: false, error: 'invalid_time' });
  });

  it('disabled → cancels all pending rows, creates nothing', async () => {
    const result = await ensureNightlyReminder(db, {
      userId: 'u1',
      enabled: false,
      timeLocal: '21:00',
      now: NOW,
    });
    expect(result.ok && result.value.scheduledFor).toBeNull();
    expect(db.scheduledAlert.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', alertType: 'launchpad_nightly', status: 'pending' },
      data: { status: 'cancelled' },
    });
    expect(db.scheduledAlert.create).not.toHaveBeenCalled();
  });

  it('enabled with no pending row → creates one at the next occurrence', async () => {
    const result = await ensureNightlyReminder(db, {
      userId: 'u1',
      enabled: true,
      timeLocal: '21:00',
      now: NOW,
    });
    expect(result.ok && result.value.scheduledFor?.toISOString()).toBe(TONIGHT.toISOString());
    expect(db.scheduledAlert.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        alertType: 'launchpad_nightly',
        scheduledFor: TONIGHT,
        payload: { timeLocal: '21:00' },
      },
    });
  });

  it('is idempotent: a matching pending row is kept, nothing new created', async () => {
    db.scheduledAlert.findMany.mockResolvedValue([{ id: 'a1', scheduledFor: TONIGHT }]);
    await ensureNightlyReminder(db, { userId: 'u1', enabled: true, timeLocal: '21:00', now: NOW });
    expect(db.scheduledAlert.create).not.toHaveBeenCalled();
    expect(db.scheduledAlert.updateMany).not.toHaveBeenCalled();
  });

  it('a time change cancels the stale row and creates the new one', async () => {
    const stale = new Date('2026-07-09T03:00:00Z'); // was 20:00
    db.scheduledAlert.findMany.mockResolvedValue([{ id: 'stale1', scheduledFor: stale }]);

    await ensureNightlyReminder(db, { userId: 'u1', enabled: true, timeLocal: '21:00', now: NOW });

    expect(db.scheduledAlert.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['stale1'] } },
      data: { status: 'cancelled' },
    });
    expect(db.scheduledAlert.create).toHaveBeenCalledTimes(1);
  });
});
