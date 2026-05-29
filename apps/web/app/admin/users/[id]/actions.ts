/**
 * Server actions for admin user management.
 * Each action validates permissions, captures state, applies the change, then logs.
 * All destructive actions require a non-empty justification.
 * Emergency delete requires 100+ chars (enforced in logAdminAction).
 *
 * Usage in page: <form action={pauseUser.bind(null, userId)}>
 */
'use server';

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/lib/auth';
import { captureUserState, logAdminAction } from '@focus-forge/domain/admin/audit';
import { type AdminPermission, getAdminPermissions } from '@focus-forge/domain/admin/permissions';
import { db } from '@focus-forge/database/client';

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requirePermission(permission: AdminPermission): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin');
  const perms = await getAdminPermissions(db, session.user.id);
  if (!perms.includes(permission)) redirect('/admin');
  return session.user.id;
}

// ─── Pause ────────────────────────────────────────────────────────────────────

export async function pauseUser(userId: string, formData: FormData) {
  const adminId      = await requirePermission('admin_user_pause');
  const justification = formData.get('justification')?.toString()?.trim() ?? '';
  const reason        = formData.get('reason')?.toString()?.trim() ?? '';
  const pausedUntilRaw = formData.get('pausedUntil')?.toString() ?? '';

  if (!justification) redirect(`/admin/users/${userId}/pause?error=1`);

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  await logAdminAction({
    db, adminUserId: adminId, targetUserId: userId,
    action: 'pause_user', justification,
    stateBefore: captureUserState(user),
  });

  await db.user.update({
    where: { id: userId },
    data: {
      accountState: 'paused',
      pausedReason: reason || null,
      pausedUntil:  pausedUntilRaw ? new Date(pausedUntilRaw) : null,
    },
  });

  redirect(`/admin/users/${userId}`);
}

// ─── Unpause ──────────────────────────────────────────────────────────────────

export async function unpauseUser(userId: string, formData: FormData) {
  const adminId       = await requirePermission('admin_user_pause');
  const justification = formData.get('justification')?.toString()?.trim() ?? '';

  if (!justification) redirect(`/admin/users/${userId}/unpause?error=1`);

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  await logAdminAction({
    db, adminUserId: adminId, targetUserId: userId,
    action: 'unpause_user', justification,
    stateBefore: captureUserState(user),
  });

  await db.user.update({
    where: { id: userId },
    data: { accountState: 'active', pausedReason: null, pausedUntil: null },
  });

  redirect(`/admin/users/${userId}`);
}

// ─── Suspend ──────────────────────────────────────────────────────────────────

export async function suspendUser(userId: string, formData: FormData) {
  const adminId       = await requirePermission('admin_user_suspend');
  const justification = formData.get('justification')?.toString()?.trim() ?? '';
  const reason        = formData.get('reason')?.toString()?.trim() ?? '';

  if (!justification) redirect(`/admin/users/${userId}/suspend?error=1`);

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  await logAdminAction({
    db, adminUserId: adminId, targetUserId: userId,
    action: 'suspend_user', justification,
    stateBefore: captureUserState(user),
  });

  await db.user.update({
    where: { id: userId },
    data: { accountState: 'suspended', suspendedReason: reason || null },
  });

  redirect(`/admin/users/${userId}`);
}

// ─── Unsuspend ────────────────────────────────────────────────────────────────

export async function unsuspendUser(userId: string, formData: FormData) {
  const adminId       = await requirePermission('admin_user_suspend');
  const justification = formData.get('justification')?.toString()?.trim() ?? '';

  if (!justification) redirect(`/admin/users/${userId}/unsuspend?error=1`);

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  await logAdminAction({
    db, adminUserId: adminId, targetUserId: userId,
    action: 'unsuspend_user', justification,
    stateBefore: captureUserState(user),
  });

  await db.user.update({
    where: { id: userId },
    data: { accountState: 'active', suspendedReason: null },
  });

  redirect(`/admin/users/${userId}`);
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function softDeleteUser(userId: string, formData: FormData) {
  const adminId       = await requirePermission('admin_user_soft_delete');
  const justification = formData.get('justification')?.toString()?.trim() ?? '';

  if (!justification) redirect(`/admin/users/${userId}/soft-delete?error=1`);

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  await logAdminAction({
    db, adminUserId: adminId, targetUserId: userId,
    action: 'soft_delete_user', justification,
    stateBefore: captureUserState(user),
  });

  // 30-day pending window; a scheduled job will purge after this date.
  const deleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.user.update({
    where: { id: userId },
    data: {
      accountState: 'pending_delete',
      pendingDeleteAt: deleteAt,
    },
  });

  redirect(`/admin/users/${userId}`);
}

// ─── Emergency delete ─────────────────────────────────────────────────────────

export async function emergencyDeleteUser(userId: string, formData: FormData) {
  const adminId       = await requirePermission('admin_user_emergency_delete');
  const justification = formData.get('justification')?.toString()?.trim() ?? '';

  if (justification.length < 100) {
    redirect(`/admin/users/${userId}/emergency-delete?error=1`);
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  // Log BEFORE deletion so targetUserId is still valid (SET NULL fires after).
  await logAdminAction({
    db, adminUserId: adminId, targetUserId: userId,
    action: 'emergency_delete_user', justification,
    stateBefore: captureUserState(user),
  });

  await db.user.delete({ where: { id: userId } });

  redirect('/admin/users');
}

// ─── Grant / revoke comp tier ─────────────────────────────────────────────────

export async function grantCompTier(userId: string, formData: FormData) {
  const adminId       = await requirePermission('admin_user_management');
  const justification = formData.get('justification')?.toString()?.trim() ?? '';
  const compReason    = formData.get('compReason')?.toString()?.trim() ?? '';
  const expiresAtRaw  = formData.get('expiresAt')?.toString() ?? '';

  if (!justification) redirect(`/admin/users/${userId}/grant-comp?error=1`);

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  await logAdminAction({
    db, adminUserId: adminId, targetUserId: userId,
    action: 'grant_comp', justification,
    stateBefore: captureUserState(user),
    metadata: { compReason, expiresAt: expiresAtRaw || null },
  });

  await db.user.update({
    where: { id: userId },
    data: {
      tier: 'comp',
      compReason:    compReason || null,
      compExpiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null,
    },
  });

  redirect(`/admin/users/${userId}`);
}
