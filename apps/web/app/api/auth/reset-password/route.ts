/**
 * POST /api/auth/reset-password
 * Validates the reset token and sets the new password.
 *
 * Expects: { token: string (hex), password: string }
 * Returns: { ok: true } | { error: 'token_invalid' | 'token_expired' | 'weak_password' }
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { db } from '@focus-forge/database/client';

const schema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  let token: string, password: string;
  try {
    const body = await req.json();
    ({ token, password } = schema.parse(body));
  } catch {
    return NextResponse.json({ error: 'weak_password' }, { status: 400 });
  }

  // Hash the raw hex token to compare against stored hash
  let tokenBytes: Buffer;
  try {
    tokenBytes = Buffer.from(token, 'hex');
    if (tokenBytes.length !== 32) throw new Error('bad length');
  } catch {
    return NextResponse.json({ error: 'token_invalid' }, { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(tokenBytes).digest();

  const record = await db.passwordResetToken.findFirst({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt) {
    return NextResponse.json({ error: 'token_invalid' }, { status: 400 });
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'token_expired' }, { status: 400 });
  }

  // Hash the new password
  const passwordHash = await hash(password, {
    memoryCost: 65536, // 64 MiB
    timeCost:   3,
    parallelism: 1,
  });

  // Update user password + mark token as used in a transaction
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data:  { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data:  { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
