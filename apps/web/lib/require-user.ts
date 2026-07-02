/**
 * Session + account-state guards
 * ──────────────────────────────────────────────────────────────────────────────
 * The single place where "is this user allowed to act?" is decided. Wraps
 * getServerSession and the domain account-state rules (doc 01 §4):
 *
 *   suspended      → no access (sessions are also revoked at suspension time)
 *   paused         → read-only: sign in and see data, but no writes
 *   pending_delete → full access (self-recovery window)
 *
 * Two flavours:
 *   requireUser(capability)  — for server actions & API routes; returns a
 *                              typed failure instead of redirecting.
 *   requirePageUser()        — for server components; redirects to /signin or
 *                              the state's landing page and never returns null.
 *
 * accountState comes from the session callback in lib/auth.ts, which attaches
 * it fresh from the DB on every getServerSession call (database sessions).
 * When session.user.id is set, accountState is always set with it — a missing
 * accountState can only happen in unit tests that stub a bare session, so it
 * is treated as 'active' rather than triggering an extra DB round-trip.
 */

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { UserAccountState } from '@prisma/client';

import { db } from '@focus-forge/database/client';
import {
  canUserDo,
  getRedirectForState,
  isPauseExpired,
  type AccountCapability,
} from '@focus-forge/domain/users/account-state';

import { authOptions } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequireUserOk = {
  ok: true;
  userId: string;
  accountState: UserAccountState;
};

export type RequireUserError = {
  ok: false;
  error: 'unauthenticated' | 'account_restricted';
  message: string;
};

export type RequireUserResult = RequireUserOk | RequireUserError;

// Calm, blame-free copy per state (Inviolable Rule 5 — no shame framing).
const RESTRICTED_MESSAGES: Partial<Record<UserAccountState, string>> = {
  paused: "Your account is paused right now, so changes can't be saved. Everything you've made is safe.",
  suspended: 'Your account is currently suspended.',
  deleted: 'Please sign in.',
};

// ─── Shared state resolution ──────────────────────────────────────────────────

/**
 * Resolves the user's effective account state. A pause whose pausedUntil has
 * passed counts as active immediately — the daily cron heals the stored state,
 * but the user should not stay read-only while waiting for it.
 */
async function resolveEffectiveState(
  userId: string,
  sessionState: UserAccountState | undefined,
): Promise<UserAccountState> {
  const state = sessionState ?? 'active';
  if (state !== 'paused') return state;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pausedUntil: true },
  });
  return isPauseExpired('paused', user?.pausedUntil ?? null) ? 'active' : 'paused';
}

// ─── Server-action / API-route guard ──────────────────────────────────────────

export async function requireUser(
  capability: AccountCapability,
): Promise<RequireUserResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, error: 'unauthenticated', message: 'Please sign in.' };
  }

  const state = await resolveEffectiveState(session.user.id, session.user.accountState);

  if (!canUserDo(state, capability)) {
    return {
      ok: false,
      error: 'account_restricted',
      message: RESTRICTED_MESSAGES[state] ?? 'Your account can’t do that right now.',
    };
  }

  return { ok: true, userId: session.user.id, accountState: state };
}

// ─── Server-component guard ───────────────────────────────────────────────────

export type PageUser = {
  userId: string;
  accountState: UserAccountState;
  name: string | null;
  email: string | null;
};

/**
 * For pages: redirects unauthenticated users to /signin (with an optional
 * callback path) and blocked states to their landing page (e.g. suspended →
 * /account/suspended). Returns the user for everyone else — including paused
 * users, who may still READ their data; write enforcement happens in the
 * server actions via requireUser().
 */
export async function requirePageUser(callbackPath?: string): Promise<PageUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(
      callbackPath ? `/signin?callbackUrl=${encodeURIComponent(callbackPath)}` : '/signin',
    );
  }

  const state = await resolveEffectiveState(session.user.id, session.user.accountState);

  const target = getRedirectForState(state);
  if (target) {
    redirect(target);
  }

  return {
    userId: session.user.id,
    accountState: state,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
  };
}
