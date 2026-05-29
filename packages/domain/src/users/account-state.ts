/**
 * Account State Helpers
 * ──────────────────────────────────────────────────────────────────────────────
 * Centralises all reasoning about what a user in a given state can/cannot do.
 * Consumed by middleware, server actions, and admin UI.
 * See doc 01 §4 for the full state machine.
 */

import type { UserAccountState } from '@prisma/client';

// ─── What each state allows ───────────────────────────────────────────────────

export type AccountCapability =
  | 'sign_in'       // Can the user sign in at all?
  | 'read_data'     // Can they see their own data?
  | 'create_data'   // Can they create new content?
  | 'mutate_data'   // Can they modify existing content?
  | 'receive_email' // Should the system send them emails?

const STATE_CAPABILITIES: Record<UserAccountState, Set<AccountCapability>> = {
  unverified:     new Set(['sign_in', 'read_data', 'create_data', 'mutate_data', 'receive_email']),
  active:         new Set(['sign_in', 'read_data', 'create_data', 'mutate_data', 'receive_email']),
  // Paused: read-only. Can sign in but cannot create or modify content.
  paused:         new Set(['sign_in', 'read_data', 'receive_email']),
  // Suspended: login blocked entirely.
  suspended:      new Set(['receive_email']),
  // Pending delete: can still access everything (to allow self-recovery).
  pending_delete: new Set(['sign_in', 'read_data', 'create_data', 'mutate_data', 'receive_email']),
  // Deleted: no capabilities.
  deleted:        new Set(),
};

export function canUserDo(
  state: UserAccountState,
  capability: AccountCapability,
): boolean {
  return STATE_CAPABILITIES[state]?.has(capability) ?? false;
}

// ─── Redirect targets for each blocked state ──────────────────────────────────

export function getRedirectForState(state: UserAccountState): string | null {
  switch (state) {
    case 'suspended':      return '/account/suspended';
    case 'pending_delete': return null; // Shows banner but doesn't hard-redirect
    case 'deleted':        return '/signin';
    default:               return null;
  }
}

// ─── Banner messages ─────────────────────────────────────────────────────────
// Shown at top of app when user is in a non-standard state.
// Language follows doc 01 §4.6 — empathetic, no "failed" or "locked" framing.

export interface StateBanner {
  message: string;
  /** If true, show a CTA button */
  showCta?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}

export function getStateBanner(
  state: UserAccountState,
  reason?: string | null,
  pausedUntil?: Date | null,
): StateBanner | null {
  switch (state) {
    case 'paused': {
      const until = pausedUntil
        ? ` until ${pausedUntil.toLocaleDateString()}`
        : '';
      return {
        message: reason
          ? `Your account is paused${until}. Reason: ${reason}`
          : `Your account is paused${until}.`,
        showCta: true,
        ctaLabel: 'Questions? Contact support',
        ctaHref: 'mailto:support@focusforge.app',
      };
    }
    case 'pending_delete': {
      return {
        message: 'Your account is scheduled for deletion. Changed your mind?',
        showCta: true,
        ctaLabel: 'Keep my account',
        ctaHref: '/account/cancel-deletion',
      };
    }
    default:
      return null;
  }
}

// ─── Auto-restore check ───────────────────────────────────────────────────────
// Used by the hourly cron dispatcher to find accounts whose pause has expired.

export function isPauseExpired(
  state: UserAccountState,
  pausedUntil: Date | null,
): boolean {
  return state === 'paused' && pausedUntil !== null && pausedUntil < new Date();
}
