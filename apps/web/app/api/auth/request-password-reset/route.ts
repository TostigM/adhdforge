/**
 * POST /api/auth/request-password-reset
 * Sends a password reset email.
 *
 * Anti-enumeration: always responds with 200 regardless of whether the email
 * exists. The client always shows "if we have that address, we sent an email."
 *
 * Token: 32 random bytes, SHA-256 hashed before storage, 1-hour TTL.
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { db } from '@focus-forge/database/client';

const schema = z.object({ email: z.string().email() });

// Route handlers are only executed on request, so instantiating here is safe.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    ({ email } = schema.parse(body));
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true },
  });

  // Always return success — never reveal whether the account exists.
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  // Generate a secure token
  const tokenRaw   = crypto.randomBytes(32);
  const tokenHex   = tokenRaw.toString('hex');         // sent in the email link
  const tokenHash  = crypto.createHash('sha256').update(tokenRaw).digest(); // stored

  const expiresAt  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate any existing tokens for this user
  await db.passwordResetToken.deleteMany({ where: { userId: user.id } });

  // Store the hashed token
  await db.passwordResetToken.create({
    data: {
      userId:    user.id,
      email:     email.toLowerCase(),
      tokenHash: tokenHash,
      expiresAt: expiresAt,
    },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${tokenHex}`;

  try {
    await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      to:   email,
      subject: 'Reset your Focus Forge password',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">
            Reset your password
          </h1>
          <p style="color: #475569; margin-bottom: 24px;">
            Click the button below to set a new password. This link expires in 1 hour
            and can only be used once.
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #6366f1; color: white;
                    padding: 12px 24px; border-radius: 8px; text-decoration: none;
                    font-weight: 500; font-size: 15px;">
            Reset password
          </a>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
            If you didn't request this, you can safely ignore this email.
            Your password won't change.
          </p>
        </div>
      `,
      text: `Reset your Focus Forge password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });
  } catch (err) {
    // Log but don't expose to caller — anti-enumeration still applies.
    console.error('[password-reset] email send failed:', err);
  }

  return NextResponse.json({ ok: true });
}
