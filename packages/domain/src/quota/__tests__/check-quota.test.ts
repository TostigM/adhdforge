/**
 * Unit tests: checkQuota
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkQuota } from '../check-quota';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';

const USER = 'user_test_01';

describe('checkQuota', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.user.findUnique.mockResolvedValue({ tier: 'free' });
    db.$queryRaw.mockResolvedValue([]);
  });

  it('allows when under the limit', async () => {
    db.$queryRaw.mockResolvedValue([{ count: 3 }]);
    const r = await checkQuota(db, USER, 'voice_dump');
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(3);
    expect(r.limit).toBe(10);
  });

  it('blocks when at the limit', async () => {
    db.$queryRaw.mockResolvedValue([{ count: 10 }]);
    const r = await checkQuota(db, USER, 'voice_dump');
    expect(r.allowed).toBe(false);
    expect(r.used).toBe(10);
  });

  it('treats no usage row as 0 used', async () => {
    db.$queryRaw.mockResolvedValue([]);
    const r = await checkQuota(db, USER, 'voice_dump');
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(0);
  });

  it('coerces BigInt counts from MySQL', async () => {
    db.$queryRaw.mockResolvedValue([{ count: BigInt(5) }]);
    const r = await checkQuota(db, USER, 'voice_dump'); // limit 10 → 5 < 10 allowed
    expect(r.used).toBe(5);
    expect(r.allowed).toBe(true);
  });

  it('blocks ai_breakdown at its lower cap of 5', async () => {
    db.$queryRaw.mockResolvedValue([{ count: 5 }]);
    const r = await checkQuota(db, USER, 'ai_breakdown');
    expect(r.allowed).toBe(false);
    expect(r.limit).toBe(5);
  });

  it('comp tier is unlimited (no usage query needed)', async () => {
    db.user.findUnique.mockResolvedValue({ tier: 'comp' });
    const r = await checkQuota(db, USER, 'voice_dump');
    expect(r.allowed).toBe(true);
    expect(r.limit).toBe('unlimited');
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('FAILS OPEN when the DB query throws', async () => {
    db.$queryRaw.mockRejectedValue(new Error('db down'));
    const r = await checkQuota(db, USER, 'voice_dump');
    expect(r.allowed).toBe(true); // never block on our bug
  });

  it('FAILS OPEN when the user lookup throws', async () => {
    db.user.findUnique.mockRejectedValue(new Error('db down'));
    const r = await checkQuota(db, USER, 'voice_dump');
    expect(r.allowed).toBe(true);
  });

  it('unknown user defaults to free tier (does not crash)', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.$queryRaw.mockResolvedValue([{ count: 2 }]);
    const r = await checkQuota(db, USER, 'voice_dump');
    expect(r.limit).toBe(10);
    expect(r.allowed).toBe(true);
  });

  it('always returns a reset instant', async () => {
    const r = await checkQuota(db, USER, 'voice_dump', new Date('2026-06-08T10:00:00Z'));
    expect(r.resetsAtUtc.toISOString()).toBe('2026-06-09T04:00:00.000Z');
  });
});
