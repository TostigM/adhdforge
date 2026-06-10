/**
 * Unit tests: checkSpeedRunEligibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkSpeedRunEligibility } from '../speed-run-hook';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';

const USER = 'user_test_01';

describe('checkSpeedRunEligibility', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.event.create.mockResolvedValue({});
  });

  it('does nothing when the user has not opted in', async () => {
    db.event.count.mockResolvedValue(5);
    const fired = await checkSpeedRunEligibility(db, USER, { enabled: false });
    expect(fired).toBe(false);
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it('does not fire below the threshold', async () => {
    db.event.count.mockResolvedValue(1);
    const fired = await checkSpeedRunEligibility(db, USER, { enabled: true });
    expect(fired).toBe(false);
    expect(db.event.create).not.toHaveBeenCalled();
  });

  it('fires speed-run:eligible at the threshold (2 in 15 min)', async () => {
    db.event.count.mockResolvedValue(2);
    const fired = await checkSpeedRunEligibility(db, USER, { enabled: true });
    expect(fired).toBe(true);
    expect(db.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eventType: 'speed-run:eligible' }) }),
    );
  });

  it('counts only task.completed within the window', async () => {
    db.event.count.mockResolvedValue(3);
    await checkSpeedRunEligibility(db, USER, { enabled: true, windowMinutes: 15 });
    const callArg = db.event.count.mock.calls[0][0] as { where: { eventType: string; occurredAt: { gte: Date } } };
    expect(callArg.where.eventType).toBe('task.completed');
    expect(callArg.where.occurredAt.gte).toBeInstanceOf(Date);
  });

  it('never throws — returns false on db error', async () => {
    db.event.count.mockRejectedValue(new Error('down'));
    const fired = await checkSpeedRunEligibility(db, USER, { enabled: true });
    expect(fired).toBe(false);
  });
});
