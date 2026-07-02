/**
 * Server actions for admin user list — currently just "create user".
 * Per-user actions (pause, suspend, delete, etc.) live in [id]/actions.ts.
 */
'use server';

import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Resend } from 'resend';

import { authOptions } from '@/lib/auth';
import { logAdminAction } from '@focus-forge/domain/admin/audit';
import { type AdminPermission, getAdminPermissions } from '@focus-forge/domain/admin/permissions';
import { db } from '@focus-forge/database/client';

async function requirePermission(permission: AdminPermission): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin');
  const perms = await getAdminPermissions(db, session.user.id);
  if (!perms.includes(permission)) redirect('/admin');
  return session.user.id;
}

// ─── Create user ──────────────────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  const adminId = await requirePermission('admin_user_management');

  const email       = formData.get('email')?.toString()?.trim()?.toLowerCase() ?? '';
  const name        = formData.get('name')?.toString()?.trim() || null;
  const tier        = formData.get('tier')?.toString() ?? 'free';
  const sendInvite  = formData.get('sendInvite') === 'on';
  const note        = formData.get('note')?.toString()?.trim() ?? '';

  if (!email) redirect('/admin/users/new?error=email_required');

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/admin/users/new?error=email_invalid');
  }

  // Check for duplicate
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) redirect(`/admin/users/new?error=email_exists`);

  // Create the user — admin-created accounts are pre-verified and active.
  // Audit row + creation commit atomically (PROGRAMMING-PRACTICES §10).
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        tier:          tier as never,
        accountState:  'active',
        emailVerified: new Date(), // pre-verified by admin
      },
    });

    await logAdminAction({
      db: tx,
      adminUserId: adminId,
      targetUserId: created.id,
      action: 'admin_create_user',
      justification: note || `Admin-created account. Tier: ${tier}.`,
      metadata: { tier, sendInvite },
    });

    return created;
  });

  // Optionally send a sign-in invite email
  if (sendInvite) {
    await sendInviteEmail(user.id, email, name);
  }

  redirect(`/admin/users/${user.id}?created=1`);
}

// ─── Invite email ─────────────────────────────────────────────────────────────
// Sends a password-reset style link so the recipient can set their password
// and sign in for the first time.

async function sendInviteEmail(userId: string, email: string, name: string | null) {
  try {
    // Reuse the password reset token mechanism as a first-login invite link
    const tokenRaw  = crypto.randomBytes(32);
    const tokenHex  = tokenRaw.toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenRaw).digest();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.passwordResetToken.deleteMany({ where: { userId } });
    await db.passwordResetToken.create({
      data: { userId, email, tokenHash, expiresAt },
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL}/reset-password/${tokenHex}`;
    const firstName = name?.split(' ')[0] ?? 'there';

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to:   email,
      subject: 'Your Focus Forge account is ready',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">
            Hey ${firstName}, your account is ready 👋
          </h1>
          <p style="color: #475569; margin-bottom: 8px;">
            Someone set up a Focus Forge account for you.
            Click the button below to set your password and sign in.
          </p>
          <p style="color: #475569; margin-bottom: 24px; font-size: 13px;">
            This link expires in 7 days.
          </p>
          <a href="${inviteUrl}"
             style="display: inline-block; background: #6366f1; color: white;
                    padding: 12px 24px; border-radius: 8px; text-decoration: none;
                    font-weight: 500; font-size: 15px;">
            Set up my account
          </a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
            You can also sign in with Google if you use the same email address.
          </p>
        </div>
      `,
      text: `Set up your Focus Forge account: ${inviteUrl}\n\nThis link expires in 7 days.`,
    });
  } catch (err) {
    // Don't fail the whole creation if email send fails — admin can resend later
    console.error('[admin create-user] invite email failed:', err);
  }
}
