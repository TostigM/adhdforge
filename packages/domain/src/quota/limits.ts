/**
 * limits.ts — Free-tier quota limits + per-tier resolution.
 * ──────────────────────────────────────────────────────────────────────────────
 * Free-tier daily limits (05-monetization-strategy.md §2.1, §5.5). Paid/comp
 * tiers get 'unlimited'. The paid tier doesn't exist yet (M18) — for now every
 * real user is free/legacy_free, which is fine.
 *
 * See 05-monetization-strategy.md §4.2
 */

export type QuotaKey = 'voice_dump' | 'ai_breakdown' | 'ai_decision' | 'praise_play';

export type QuotaLimit = number | 'unlimited';

/** Free-tier daily caps. */
export const FREE_TIER_LIMITS: Record<QuotaKey, QuotaLimit> = {
  voice_dump: 10,
  ai_breakdown: 5,
  ai_decision: 3,
  praise_play: 15,
};

/** Tiers that get unlimited AI/quota features. */
const UNLIMITED_TIERS = new Set(['comp', 'paid', 'paid_lifetime']);

/**
 * Resolve the daily limit for a tier + quota key.
 * free / legacy_free → free-tier caps; comp / paid* → unlimited.
 */
export function getQuotaLimit(tier: string, quotaKey: QuotaKey): QuotaLimit {
  if (UNLIMITED_TIERS.has(tier)) return 'unlimited';
  return FREE_TIER_LIMITS[quotaKey];
}
