/**
 * Unit tests: getQuotaLimit
 */

import { describe, it, expect } from 'vitest';
import { getQuotaLimit, FREE_TIER_LIMITS } from '../limits';

describe('getQuotaLimit', () => {
  it('returns free-tier caps for free and legacy_free', () => {
    expect(getQuotaLimit('free', 'voice_dump')).toBe(10);
    expect(getQuotaLimit('free', 'ai_breakdown')).toBe(5);
    expect(getQuotaLimit('legacy_free', 'voice_dump')).toBe(10);
  });

  it('returns unlimited for comp / paid / paid_lifetime on AI keys', () => {
    expect(getQuotaLimit('comp', 'voice_dump')).toBe('unlimited');
    expect(getQuotaLimit('paid', 'ai_breakdown')).toBe('unlimited');
    expect(getQuotaLimit('paid_lifetime', 'voice_dump')).toBe('unlimited');
  });

  // M10 fix: praise_play is capped for Pro too (30/day, §2.2) — a usage
  // safeguard, not a monetization lever. Previously wrongly unlimited.
  it('caps praise_play at 30/day even for paid tiers', () => {
    expect(getQuotaLimit('comp', 'praise_play')).toBe(30);
    expect(getQuotaLimit('paid', 'praise_play')).toBe(30);
    expect(getQuotaLimit('paid_lifetime', 'praise_play')).toBe(30);
    expect(getQuotaLimit('free', 'praise_play')).toBe(15);
  });

  it('FREE_TIER_LIMITS matches the spec (§2.1)', () => {
    expect(FREE_TIER_LIMITS).toMatchObject({
      voice_dump: 10,
      ai_breakdown: 5,
      ai_decision: 3,
      praise_play: 15,
    });
  });
});
