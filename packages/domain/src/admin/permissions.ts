/**
 * Admin Permission System
 * ──────────────────────────────────────────────────────────────────────────────
 * 12 granular admin permissions stored as feature_grant rows.
 * See AGENTS.md §5.7 and 04-mysql-schema.md §4.7
 *
 * Never use a single is_admin boolean. Each permission is intentional.
 * See anti-pattern in 07-claude-code-instructions.md: "I'll create a single
 * 'is_admin' column on users for simplicity" — hard no.
 */

import type { PrismaClient } from '@prisma/client';

// ─── The 12 admin permission keys ────────────────────────────────────────────

export const ADMIN_PERMISSIONS = [
  'admin_user_view',            // Read user accounts, email, state, tier
  'admin_user_management',      // Edit user accounts, force sign-out, grant comp
  'admin_user_pause',           // Pause a user (lighter touch, time-bound)
  'admin_user_suspend',         // Suspend a user (indefinite, login-blocked)
  'admin_user_soft_delete',     // Soft-delete a user (30-day grace)
  'admin_user_emergency_delete',// Hard-delete immediately (legal compliance only)
  'admin_content_moderate',     // Access content_reports, remove praise audio
  'admin_audit_view',           // View admin_actions audit log
  'admin_grant_admin',          // Grant/revoke other admin permissions (super-admin)
  'admin_feedback_manage',      // Manage bug/feature request submissions
  'admin_announcements',        // Post feature announcements
  'admin_cron_trigger',         // Manually trigger cron jobs
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if a user has a specific admin permission.
 * Reads from feature_grants — active (not revoked, not expired) grants only.
 */
export async function hasAdminPermission(
  db: PrismaClient,
  userId: string,
  permission: AdminPermission,
): Promise<boolean> {
  const grant = await db.featureGrant.findFirst({
    where: {
      userId,
      featureKey: permission,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return grant !== null;
}

/**
 * Check if a user has ANY of the listed permissions.
 * Useful for broad access checks ("is this person any kind of admin?").
 */
export async function hasAnyAdminPermission(
  db: PrismaClient,
  userId: string,
  permissions: AdminPermission[],
): Promise<boolean> {
  const grant = await db.featureGrant.findFirst({
    where: {
      userId,
      featureKey: { in: permissions },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  });
  return grant !== null;
}

/**
 * Check if a user has ALL of the listed permissions.
 */
export async function hasAllAdminPermissions(
  db: PrismaClient,
  userId: string,
  permissions: AdminPermission[],
): Promise<boolean> {
  const count = await db.featureGrant.count({
    where: {
      userId,
      featureKey: { in: permissions },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  return count >= permissions.length;
}

/**
 * Fetch all active admin permissions for a user in one query.
 * Used to build permission sets for the admin UI.
 */
export async function getAdminPermissions(
  db: PrismaClient,
  userId: string,
): Promise<AdminPermission[]> {
  const grants = await db.featureGrant.findMany({
    where: {
      userId,
      featureKey: { in: [...ADMIN_PERMISSIONS] },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { featureKey: true },
  });
  return grants.map((g) => g.featureKey as AdminPermission);
}

/**
 * Composite: true if user has admin_user_view OR admin_user_management
 * (minimum to access /admin at all).
 */
export const MINIMUM_ADMIN_PERMISSIONS: AdminPermission[] = [
  'admin_user_view',
  'admin_user_management',
];

export function isAnyAdmin(permissions: AdminPermission[]): boolean {
  return ADMIN_PERMISSIONS.some((p) => permissions.includes(p));
}
