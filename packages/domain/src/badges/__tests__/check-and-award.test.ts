/**
 * Unit tests: checkAndAward (Badge Engine)
 *
 * Covers:
 *   - No matching badges → returns empty array
 *   - Single-award badge: fires once, idempotent on subsequent calls
 *   - Repeatable badge: fires every eligible time
 *   - Threshold: badge with trigger_threshold > 1 only fires when count meets it
 *   - Inactive badge: never fires
 *   - Multiple badges for same event type: all evaluated independently
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { checkAndAward } from '../check-and-award';
import { makeMockPrisma, makeBadge } from '../../__test-utils__/mock-prisma';

const USER_ID = 'user_test_01';

describe('checkAndAward', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    db = makeMockPrisma();
    db.userBadge.create.mockResolvedValue({ id: 'ub_1' });
  });

  it('returns [] when no badges match the event type', async () => {
    db.badge.findMany.mockResolvedValue([]);

    const result = await checkAndAward(db, USER_ID, 'task.created');
    expect(result).toEqual([]);
    expect(db.userBadge.create).not.toHaveBeenCalled();
  });

  // ── First Capture Badge (single-award, threshold = 1) ─────────────────────

  describe('first_capture — non-repeatable, threshold 1', () => {
    beforeEach(() => {
      db.badge.findMany.mockResolvedValue([makeBadge()]);
      db.event.count.mockResolvedValue(1); // First ever task.created
    });

    it('awards the badge on the first qualifying event', async () => {
      db.userBadge.findFirst.mockResolvedValue(null); // Not already earned

      const result = await checkAndAward(db, USER_ID, 'task.created');
      expect(result).toEqual(['first_capture']);
      expect(db.userBadge.create).toHaveBeenCalledOnce();
    });

    it('does NOT re-award if already earned (idempotent)', async () => {
      db.userBadge.findFirst.mockResolvedValue({ id: 'ub_existing' }); // Already earned

      const result = await checkAndAward(db, USER_ID, 'task.created');
      expect(result).toEqual([]);
      expect(db.userBadge.create).not.toHaveBeenCalled();
    });
  });

  // ── Daily Capture Badge (repeatable, threshold 1) ─────────────────────────

  describe('daily_capture — repeatable', () => {
    beforeEach(() => {
      db.badge.findMany.mockResolvedValue([
        makeBadge({ badgeKey: 'daily_capture', isRepeatable: true }),
      ]);
      db.event.count.mockResolvedValue(5); // 5th task created
    });

    it('awards the badge even if user has earned it before', async () => {
      // findFirst is NOT called for repeatable badges — no need to check
      const result = await checkAndAward(db, USER_ID, 'task.created');
      expect(result).toEqual(['daily_capture']);
      expect(db.userBadge.create).toHaveBeenCalledOnce();
    });

    it('does not call findFirst for repeatable badges', async () => {
      await checkAndAward(db, USER_ID, 'task.created');
      expect(db.userBadge.findFirst).not.toHaveBeenCalled();
    });
  });

  // ── Threshold > 1 ─────────────────────────────────────────────────────────

  describe('threshold enforcement', () => {
    const STREAKY_BADGE = makeBadge({
      badgeKey: 'five_tasks',
      triggerThreshold: 5,
      isRepeatable: false,
    });

    it('does NOT award badge when count is below threshold', async () => {
      db.badge.findMany.mockResolvedValue([STREAKY_BADGE]);
      db.event.count.mockResolvedValue(3); // Only 3 events — below threshold of 5
      db.userBadge.findFirst.mockResolvedValue(null);

      const result = await checkAndAward(db, USER_ID, 'task.created');
      expect(result).toEqual([]);
    });

    it('awards badge exactly when count meets threshold', async () => {
      db.badge.findMany.mockResolvedValue([STREAKY_BADGE]);
      db.event.count.mockResolvedValue(5); // Exactly at threshold
      db.userBadge.findFirst.mockResolvedValue(null);

      const result = await checkAndAward(db, USER_ID, 'task.created');
      expect(result).toEqual(['five_tasks']);
    });

    it('awards badge when count exceeds threshold', async () => {
      db.badge.findMany.mockResolvedValue([STREAKY_BADGE]);
      db.event.count.mockResolvedValue(10); // Over threshold
      db.userBadge.findFirst.mockResolvedValue(null);

      const result = await checkAndAward(db, USER_ID, 'task.created');
      expect(result).toEqual(['five_tasks']);
    });
  });

  // ── Multiple badges for same event ────────────────────────────────────────

  it('evaluates multiple badges independently for the same event', async () => {
    db.badge.findMany.mockResolvedValue([
      makeBadge({ badgeKey: 'first_capture', isRepeatable: false, triggerThreshold: 1 }),
      makeBadge({ badgeKey: 'daily_capture', isRepeatable: true, triggerThreshold: 1 }),
    ]);
    db.event.count.mockResolvedValue(1);
    // first_capture: not yet earned
    db.userBadge.findFirst.mockResolvedValue(null);

    const result = await checkAndAward(db, USER_ID, 'task.created');
    expect(result).toContain('first_capture');
    expect(result).toContain('daily_capture');
    expect(db.userBadge.create).toHaveBeenCalledTimes(2);
  });

  // ── Inactive badge ─────────────────────────────────────────────────────────

  it('never fires for inactive badges (query filters them out)', async () => {
    // The query filters isActive: true — simulate empty result for inactive badge
    db.badge.findMany.mockResolvedValue([]);

    const result = await checkAndAward(db, USER_ID, 'task.created');
    expect(result).toEqual([]);
  });
});
