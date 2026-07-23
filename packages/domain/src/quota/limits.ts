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

/**
 * Paid/comp-tier caps. Most keys are unlimited, but praise_play stays capped
 * at 30/day even for Pro (doc 05 §2.2 / AGENTS.md §5.5) — the cap is a usage
 * safeguard, not a monetization lever. Fixed in M10; before that the helper
 * wrongly returned 'unlimited' for Pro praise plays.
 */
export const PAID_TIER_LIMITS: Record<QuotaKey, QuotaLimit> = {
  voice_dump: 'unlimited',
  ai_breakdown: 'unlimited',
  ai_decision: 'unlimited',
  praise_play: 30,
};

/** Tiers that resolve against PAID_TIER_LIMITS. */
const PAID_TIERS = new Set(['comp', 'paid', 'paid_lifetime']);

/**
 * Resolve the daily limit for a tier + quota key.
 * free / legacy_free → free caps; comp / paid* → paid caps.
 */
export function getQuotaLimit(tier: string, quotaKey: QuotaKey): QuotaLimit {
  if (PAID_TIERS.has(tier)) return PAID_TIER_LIMITS[quotaKey];
  return FREE_TIER_LIMITS[quotaKey];
}
