/**
 * Server actions for admin user management.
 * Each action validates permissions, captures state, applies the change, then logs.
 * All destructive actions require a non-empty justification.
 * Emergency delete requires 100+ chars (enforced in logAdminAction).
 *
 * Usage in page: <form action={pauseUser.bind(null, userId)}>
 */
'use server';

import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';

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

  // Validate the optional expiry date before it reaches Prisma (an Invalid
  // Date would throw an unhandled error there).
  let pausedUntil: Date | null = null;
  if (pausedUntilRaw) {
    pausedUntil = new Date(pausedUntilRaw);
    if (Number.isNaN(pausedUntil.getTime())) redirect(`/admin/users/${userId}/pause?error=1`);
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  // Audit row + state change commit atomically — the trail never records an
  // action that didn't happen (PROGRAMMING-PRACTICES §10).
  await db.$transaction(async (tx) => {
    await logAdminAction({
      db: tx, adminUserId: adminId, targetUserId: userId,
      action: 'pause_user', justification,
      stateBefore: captureUserState(user),
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        accountState: 'paused',
        pausedReason: reason || null,
        pausedUntil,
      },
    });
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

  await db.$transaction(async (tx) => {
    await logAdminAction({
      db: tx, adminUserId: adminId, targetUserId: userId,
      action: 'unpause_user', justification,
      stateBefore: captureUserState(user),
    });
    await tx.user.update({
      where: { id: userId },
      data: { accountState: 'active', pausedReason: null, pausedUntil: null },
    });
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

  await db.$transaction(async (tx) => {
    await logAdminAction({
      db: tx, adminUserId: adminId, targetUserId: userId,
      action: 'suspend_user', justification,
      stateBefore: captureUserState(user),
    });
    await tx.user.update({
      where: { id: userId },
      data: { accountState: 'suspended', suspendedReason: reason || null },
    });
    // Suspension blocks sign-in (doc 01 §4) — revoke live sessions too, so the
    // block takes effect immediately instead of when the 30-day session expires.
    await tx.session.deleteMany({ where: { userId } });
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

  await db.$transaction(async (tx) => {
    await logAdminAction({
      db: tx, adminUserId: adminId, targetUserId: userId,
      action: 'unsuspend_user', justification,
      stateBefore: captureUserState(user),
    });
    await tx.user.update({
      where: { id: userId },
      data: { accountState: 'active', suspendedReason: null },
    });
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

  // 30-day pending window; a scheduled job will purge after this date.
  const deleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.$transaction(async (tx) => {
    await logAdminAction({
      db: tx, adminUserId: adminId, targetUserId: userId,
      action: 'soft_delete_user', justification,
      stateBefore: captureUserState(user),
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        accountState: 'pending_delete',
        pendingDeleteAt: deleteAt,
      },
    });
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

  // Log BEFORE the delete within the transaction so targetUserId is still
  // valid when the row is written (the FK SET NULL fires at delete time).
  await db.$transaction(async (tx) => {
    await logAdminAction({
      db: tx, adminUserId: adminId, targetUserId: userId,
      action: 'emergency_delete_user', justification,
      stateBefore: captureUserState(user),
    });
    await tx.user.delete({ where: { id: userId } });
  });

  redirect('/admin/users');
}

// ─── Send password reset ──────────────────────────────────────────────────────
// Admin-initiated reset. Generates a 1-hour token and emails the user.
// Non-destructive — no justification required, but logged to admin_actions.

export async function sendPasswordReset(userId: string) {
  const adminId = await requirePermission('admin_user_management');

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) redirect('/admin/users');

  // Generate and store the token
  const tokenRaw  = crypto.randomBytes(32);
  const tokenHex  = tokenRaw.toString('hex');
  const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.passwordResetToken.deleteMany({ where: { userId } });
  await db.passwordResetToken.create({
    data: { userId, email: user.email, tokenHash, expiresAt },
  });

  const resetUrl  = `${process.env.NEXTAUTH_URL}/reset-password/${tokenHex}`;
  const firstName = user.name?.split(' ')[0] ?? 'there';

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to:   user.email,
      subject: 'Reset your Focus Forge password',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">
            Hey ${firstName}, reset your password
          </h1>
          <p style="color: #475569; margin-bottom: 24px;">
            An admin has sent you a password reset link.
            Click the button below to set a new password. This link expires in 1 hour.
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #6366f1; color: white;
                    padding: 12px 24px; border-radius: 8px; text-decoration: none;
                    font-weight: 500; font-size: 15px;">
            Reset password
          </a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
            If you didn't expect this, you can safely ignore it.
            Your password won't change unless you click the link above.
          </p>
        </div>
      `,
      text: `Reset your Focus Forge password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });
  } catch (err) {
    console.error('[admin send-password-reset] email failed:', err);
    redirect(`/admin/users/${userId}?resetError=1`);
  }

  await logAdminAction({
    db,
    adminUserId: adminId,
    targetUserId: userId,
    action: 'send_password_reset',
    justification: 'Admin-initiated password reset email sent.',
  });

  redirect(`/admin/users/${userId}?resetSent=1`);
}

// ─── Grant / revoke comp tier ─────────────────────────────────────────────────

export async function grantCompTier(userId: string, formData: FormData) {
  const adminId       = await requirePermission('admin_user_management');
  const justification = formData.get('justification')?.toString()?.trim() ?? '';
  const compReason    = formData.get('compReason')?.toString()?.trim() ?? '';
  const expiresAtRaw  = formData.get('expiresAt')?.toString() ?? '';

  if (!justification) redirect(`/admin/users/${userId}/grant-comp?error=1`);

  // Validate the optional expiry date before it reaches Prisma.
  let compExpiresAt: Date | null = null;
  if (expiresAtRaw) {
    compExpiresAt = new Date(expiresAtRaw);
    if (Number.isNaN(compExpiresAt.getTime())) redirect(`/admin/users/${userId}/grant-comp?error=1`);
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: {
    accountState: true, tier: true, pausedUntil: true, pausedReason: true,
    suspendedReason: true, compExpiresAt: true,
  }});
  if (!user) redirect('/admin/users');

  await db.$transaction(async (tx) => {
    await logAdminAction({
      db: tx, adminUserId: adminId, targetUserId: userId,
      action: 'grant_comp', justification,
      stateBefore: captureUserState(user),
      metadata: { compReason, expiresAt: expiresAtRaw || null },
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        tier: 'comp',
        compReason:    compReason || null,
        compExpiresAt,
      },
    });
  });

  redirect(`/admin/users/${userId}`);
}
