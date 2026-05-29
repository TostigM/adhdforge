/**
 * Admin Audit Logger
 * ──────────────────────────────────────────────────────────────────────────────
 * Every admin action MUST call logAdminAction(). No exceptions.
 * The audit trail survives user deletion (FKs are SET NULL, not CASCADE).
 * See doc 01 §4.7 and AGENTS.md §5.7
 */

import { Prisma } from '@prisma/client';
import type { PrismaClient, User } from '@prisma/client';
import type { AdminPermission } from './permissions';

// Actions that REQUIRE a justification string (non-empty).
// Attempting to log these without justification throws at runtime.
const JUSTIFICATION_REQUIRED_ACTIONS = new Set([
  'pause_user',
  'suspend_user',
  'soft_delete_user',
  'emergency_delete_user',
  'remove_content',
  'grant_admin',
  'revoke_admin',
  'grant_comp',
  'revoke_comp',
]);

export interface LogAdminActionInput {
  db: PrismaClient;
  adminUserId: string;
  targetUserId?: string;
  action: string;
  justification?: string;
  /** JSON snapshot of relevant user state before the action. */
  stateBefore?: Record<string, unknown>;
  /** Any additional metadata about the action. */
  metadata?: Record<string, unknown>;
  /** Raw request object to extract IP + user-agent from (optional). */
  request?: Request;
}

/**
 * Insert a row into admin_actions.
 * Call this inside every admin server action, before or after the state change.
 * (Prefer before for destructive actions so the trail exists even if the
 * main action partially fails.)
 */
export async function logAdminAction({
  db,
  adminUserId,
  targetUserId,
  action,
  justification,
  stateBefore,
  metadata,
  request,
}: LogAdminActionInput): Promise<void> {
  if (
    JUSTIFICATION_REQUIRED_ACTIONS.has(action) &&
    (!justification || justification.trim().length === 0)
  ) {
    throw new Error(
      `Admin action "${action}" requires a non-empty justification. ` +
        'If you are seeing this in a test, provide a justification string.',
    );
  }

  // Extra validation for emergency_delete — requires meaningful prose.
  if (action === 'emergency_delete_user') {
    if (!justification || justification.trim().length < 100) {
      throw new Error(
        'Emergency delete requires at least 100 characters of justification.',
      );
    }
  }

  let ipAddress: Buffer | undefined;
  let userAgent: string | undefined;

  if (request) {
    userAgent = request.headers.get('user-agent') ?? undefined;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const rawIp = forwardedFor?.split(',')[0]?.trim() ?? undefined;
    if (rawIp) {
      ipAddress = ipToBuffer(rawIp);
    }
  }

  await db.adminAction.create({
    data: {
      adminUserId,
      targetUserId: targetUserId ?? null,
      action,
      justification: justification ?? null,
      stateBefore: stateBefore as Prisma.InputJsonValue | undefined,
      metadata:    metadata    as Prisma.InputJsonValue | undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ipAddress: (ipAddress ?? null) as any,
      userAgent: userAgent ?? null,
    },
  });
}

/**
 * Capture a user state snapshot for the stateBefore field.
 * Call this BEFORE making any changes to the user.
 */
export function captureUserState(
  user: Pick<
    User,
    | 'accountState'
    | 'tier'
    | 'pausedUntil'
    | 'pausedReason'
    | 'suspendedReason'
    | 'compExpiresAt'
  >,
): Record<string, unknown> {
  return {
    accountState: user.accountState,
    tier: user.tier,
    pausedUntil: user.pausedUntil?.toISOString() ?? null,
    pausedReason: user.pausedReason,
    suspendedReason: user.suspendedReason,
    compExpiresAt: user.compExpiresAt?.toISOString() ?? null,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert an IPv4 or IPv6 string to a 4- or 16-byte Buffer. */
function ipToBuffer(ip: string): Buffer | undefined {
  try {
    if (ip.includes(':')) {
      // IPv6 — 16 bytes
      const parts = ip.replace(/^\[|]$/g, '').split(':');
      const buf = Buffer.alloc(16);
      // Expand :: shorthand
      const expanded = expandIPv6(parts);
      if (!expanded) return undefined;
      expanded.forEach((part, i) => {
        buf.writeUInt16BE(parseInt(part || '0', 16), i * 2);
      });
      return buf;
    } else {
      // IPv4 — 4 bytes
      const parts = ip.split('.').map(Number);
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p > 255))
        return undefined;
      return Buffer.from(parts);
    }
  } catch {
    return undefined;
  }
}

function expandIPv6(parts: string[]): string[] | null {
  const doubleColonIdx = parts.indexOf('');
  if (doubleColonIdx === -1) {
    return parts.length === 8 ? parts : null;
  }
  const missing = 8 - (parts.filter((p) => p !== '').length);
  const filler = Array(missing).fill('0');
  return [
    ...parts.slice(0, doubleColonIdx),
    ...filler,
    ...parts.slice(doubleColonIdx + 1),
  ];
}
