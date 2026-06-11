/**
 * Unit tests: updateUserPreferences + parsePreferences
 *
 * Covers:
 *   - parsePreferences: defaults, clamping, type coercion, partial input
 *   - Guards: user_not_found, invalid_value (out of range)
 *   - Merge: new values merge over existing, untouched keys preserved
 *   - Clamping on write
 *   - db_error handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateUserPreferences,
  parsePreferences,
  PREFERENCE_DEFAULTS,
} from '../update-preferences';
import { makeMockPrisma } from '../../__test-utils__/mock-prisma';

describe('parsePreferences', () => {
  it('returns defaults for null/undefined', () => {
    expect(parsePreferences(null)).toEqual(PREFERENCE_DEFAULTS);
    expect(parsePreferences(undefined)).toEqual(PREFERENCE_DEFAULTS);
  });

  it('returns defaults for non-object input', () => {
    expect(parsePreferences('garbage')).toEqual(PREFERENCE_DEFAULTS);
    expect(parsePreferences(42)).toEqual(PREFERENCE_DEFAULTS);
  });

  it('preserves valid stored values (merging in defaults for unset keys)', () => {
    const stored = { visibleSlots: 4, gentleReframeEnabled: false, gentleReframeThreshold: 6 };
    expect(parsePreferences(stored)).toMatchObject(stored);
  });

  it('parses the timer preference keys with correct defaults', () => {
    const p = parsePreferences({});
    expect(p.soundEnabled).toBe(true);
    expect(p.hapticsEnabled).toBe(true);
    expect(p.tenThreeRuleEnabled).toBe(false);
    expect(p.speedRunChallengesEnabled).toBe(false);
    // Explicit overrides
    expect(parsePreferences({ soundEnabled: false }).soundEnabled).toBe(false);
    expect(parsePreferences({ tenThreeRuleEnabled: true }).tenThreeRuleEnabled).toBe(true);
  });

  it('clamps visibleSlots to 1–5', () => {
    expect(parsePreferences({ visibleSlots: 0 }).visibleSlots).toBe(1);
    expect(parsePreferences({ visibleSlots: 99 }).visibleSlots).toBe(5);
  });

  it('clamps gentleReframeThreshold to 3–7', () => {
    expect(parsePreferences({ gentleReframeThreshold: 1 }).gentleReframeThreshold).toBe(3);
    expect(parsePreferences({ gentleReframeThreshold: 20 }).gentleReframeThreshold).toBe(7);
  });

  it('treats gentleReframeEnabled as true unless explicitly false', () => {
    expect(parsePreferences({}).gentleReframeEnabled).toBe(true);
    expect(parsePreferences({ gentleReframeEnabled: false }).gentleReframeEnabled).toBe(false);
    expect(parsePreferences({ gentleReframeEnabled: true }).gentleReframeEnabled).toBe(true);
  });

  it('fills missing keys with defaults (partial input)', () => {
    const result = parsePreferences({ visibleSlots: 2 });
    expect(result.visibleSlots).toBe(2);
    expect(result.gentleReframeEnabled).toBe(PREFERENCE_DEFAULTS.gentleReframeEnabled);
    expect(result.gentleReframeThreshold).toBe(PREFERENCE_DEFAULTS.gentleReframeThreshold);
  });
});

describe('updateUserPreferences', () => {
  let db: ReturnType<typeof makeMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeMockPrisma();
    db.user.findUnique.mockResolvedValue({ id: 'user_test_01', preferences: null });
    db.user.update.mockResolvedValue({});
  });

  // ── Guards ───────────────────────────────────────────────────────────────────

  it('returns err("user_not_found") when user does not exist', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const result = await updateUserPreferences(db, 'user_test_01', { visibleSlots: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('user_not_found');
  });

  it('returns err("invalid_value") for out-of-range visibleSlots', async () => {
    const result = await updateUserPreferences(db, 'user_test_01', { visibleSlots: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_value');
  });

  it('returns err("invalid_value") for out-of-range threshold', async () => {
    const result = await updateUserPreferences(db, 'user_test_01', { gentleReframeThreshold: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('invalid_value');
  });

  // ── Merge behavior ─────────────────────────────────────────────────────────

  it('merges new value over existing preferences', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user_test_01',
      preferences: { visibleSlots: 4, gentleReframeEnabled: false, gentleReframeThreshold: 6 },
    });

    await updateUserPreferences(db, 'user_test_01', { visibleSlots: 2 });

    const call = db.user.update.mock.calls[0]?.[0] as { data: { preferences: Record<string, unknown> } };
    expect(call.data.preferences).toMatchObject({
      visibleSlots: 2,           // updated
      gentleReframeEnabled: false, // preserved
      gentleReframeThreshold: 6,   // preserved
    });
  });

  it('returns the merged preferences on success', async () => {
    const result = await updateUserPreferences(db, 'user_test_01', { visibleSlots: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.visibleSlots).toBe(5);
  });

  it('toggling gentleReframeEnabled to false persists', async () => {
    await updateUserPreferences(db, 'user_test_01', { gentleReframeEnabled: false });
    const call = db.user.update.mock.calls[0]?.[0] as { data: { preferences: Record<string, unknown> } };
    expect(call.data.preferences.gentleReframeEnabled).toBe(false);
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  it('returns err("db_error") when update throws', async () => {
    db.user.update.mockRejectedValue(new Error('connection lost'));
    const result = await updateUserPreferences(db, 'user_test_01', { visibleSlots: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('db_error');
  });
});
