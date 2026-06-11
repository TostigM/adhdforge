/**
 * Unit tests: incrementQuota
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { incrementQuota } from '../increment-quota';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';

const USER = 'user_test_01';

describe('incrementQuota', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.$executeRaw.mockResolvedValue(1);
  });

  it('issues an atomic upsert (INSERT … ON DUPLICATE KEY UPDATE)', async () => {
    await incrementQuota(db, USER, 'voice_dump');
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    // The tagged-template strings are the first arg; assert the SQL shape.
    const strings = db.$executeRaw.mock.calls[0]?.[0] as string[];
    const sql = strings.join('?');
    expect(sql).toMatch(/INSERT INTO quota_usage/i);
    expect(sql).toMatch(/ON DUPLICATE KEY UPDATE count = count \+ 1/i);
  });

  it('is non-fatal when the write throws (user already got the feature)', async () => {
    db.$executeRaw.mockRejectedValue(new Error('db down'));
    await expect(incrementQuota(db, USER, 'voice_dump')).resolves.toBeUndefined();
  });
});
