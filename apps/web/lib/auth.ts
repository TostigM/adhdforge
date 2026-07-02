/**
 * NextAuth v4 Configuration
 * ──────────────────────────────────────────────────────────────────────────────
 * Providers: Google, Email (magic link via Resend), Credentials (email+password)
 * Facebook: skipped for now, add later.
 * Session strategy: database (sessions table in MySQL).
 * See doc 01 §2–3 and AGENTS.md §5.2.
 *
 * NOTE: Using NextAuth v4 stable, NOT v5 beta. See AGENTS.md §5.2 for rationale.
 */

import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { verify } from '@node-rs/argon2';
import type { NextAuthOptions, Session, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { Resend } from 'resend';
import { z } from 'zod';

import { db } from '@focus-forge/database/client';

// ─── Resend magic-link sender ─────────────────────────────────────────────────

// Lazy-initialized so `new Resend()` doesn't throw at build time (env not available then).
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendVerificationRequest({
  identifier: email,
  url,
}: {
  identifier: string;
  url: string;
  provider: { from: string };
}) {
  // Rate limit: max 3 magic-link emails per address per token lifetime (15 min).
  // Counts unexpired verification tokens — NextAuth's adapter creates the token
  // for THIS send before calling us, hence `>` rather than `>=`. DB-backed, so
  // it holds across serverless instances. Protects both the recipient's inbox
  // and the Resend daily quota (100/day free) from being burned by a loop.
  const outstanding = await db.verificationToken.count({
    where: { identifier: email, expires: { gt: new Date() } },
  });
  if (outstanding > 3) {
    throw new Error(
      'A few sign-in emails are already on their way — please use one of those, or try again in 15 minutes.',
    );
  }

  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
    to: email,
    subject: 'Sign in to Focus Forge',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">
          Sign in to Focus Forge
        </h1>
        <p style="color: #475569; margin-bottom: 24px;">
          Click the button below to sign in. This link expires in 15 minutes and can only be used once.
        </p>
        <a href="${url}"
           style="display: inline-block; background: #6366f1; color: white;
                  padding: 12px 24px; border-radius: 8px; text-decoration: none;
                  font-weight: 500; font-size: 15px;">
          Sign in to Focus Forge
        </a>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Sign in to Focus Forge: ${url}\n\nThis link expires in 15 minutes.`,
  });

  // The Resend SDK returns errors as a value, not a throw. Surface them so a
  // failed send becomes a visible sign-in error instead of a silent "check
  // your email" with no email (e.g. the onboarding@resend.dev sandbox sender
  // rejects any recipient that isn't the Resend account's own address — verify
  // a domain and set RESEND_FROM_EMAIL to fix).
  if (error) {
    console.error('[auth] magic-link send failed:', error);
    throw new Error(`Failed to send sign-in email: ${error.message ?? 'unknown error'}`);
  }
}

// ─── Input validation schemas ─────────────────────────────────────────────────

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── NextAuth options ─────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),

  session: {
    strategy: 'database',
    // 30-day sliding window — "Remember me" is always on per doc 01 §3.1
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60, // Refresh the session every 24h of activity
  },

  pages: {
    signIn: '/signin',
    verifyRequest: '/signin/check-email',
    error: '/signin',
    // newUser: '/onboarding' — onboarding flow comes in a later milestone
  },

  providers: [
    // ── Google OAuth ────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Google verifies email ownership, so linking is safe here.
      allowDangerousEmailAccountLinking: true,
    }),

    // ── Email (magic link via Resend) ───────────────────────────────────────
    EmailProvider({
      from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
      maxAge: 15 * 60, // 15 minutes
      sendVerificationRequest,
    }),

    // ── Email + Password (Credentials) ──────────────────────────────────────
    // Note: Credentials provider does NOT work with database sessions in
    // NextAuth v4 by default — we manually create the session in the
    // signIn callback below.
    CredentialsProvider({
      name: 'Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            accountState: true,
            emailVerified: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        // Suspended users are blocked from signing in at all
        if (user.accountState === 'suspended') return null;
        if (user.accountState === 'deleted') return null;

        // Rate limiting check — 5 failed attempts per email per 15 min
        const rateLimitExceeded = await checkLoginRateLimit(email);
        if (rateLimitExceeded) return null;

        const valid = await verify(user.passwordHash, password);
        if (!valid) {
          await recordFailedLogin(email);
          return null;
        }

        // Update last login timestamp
        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],

  callbacks: {
    // ── session callback ────────────────────────────────────────────────────
    // Extend the session object with the user's id, tier, and account state
    // so pages don't need an extra DB query for common checks.
    async session({ session, user }: { session: Session; user: User }) {
      if (session.user && user) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            accountState: true,
            tier: true,
            emailVerified: true,
          },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          // These are added via module augmentation (see types/next-auth.d.ts)
          (session.user as SessionUser).accountState = dbUser.accountState;
          (session.user as SessionUser).tier = dbUser.tier;
        }
      }
      return session;
    },

    // ── signIn callback ─────────────────────────────────────────────────────
    // Block suspended/deleted users. Activate unverified users on first OAuth sign-in
    // (Google/email providers verify the email address for us).
    async signIn({ user, account }) {
      if (!user.id) return true;

      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { accountState: true },
      });

      if (!dbUser) return true;
      if (dbUser.accountState === 'suspended') return '/account/suspended';
      if (dbUser.accountState === 'deleted') return '/signin?error=account_deleted';

      // Activate users who sign in via OAuth or magic link — their email is verified
      // by the provider. Credentials sign-ins don't verify email on their own.
      if (
        dbUser.accountState === 'unverified' &&
        account?.provider !== 'credentials'
      ) {
        await db.user.update({
          where: { id: user.id },
          data: { accountState: 'active', emailVerified: new Date() },
        });
      }

      return true;
    },
  },

  events: {
    // Log successful sign-ins to audit_log
    async signIn({ user, account, isNewUser }) {
      if (!user.id) return;
      await db.auditLog.create({
        data: {
          userId: user.id,
          eventType: isNewUser ? 'signup' : 'signin',
          metadata: { provider: account?.provider ?? 'unknown' },
        },
      });
    },
  },
};

// ─── Rate limiting (DB-backed) ────────────────────────────────────────────────
// 5 failed login attempts per email per 15 minutes.
// Serverless-safe (no in-memory state).

async function checkLoginRateLimit(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  // Look up the user first so we can query by userId — avoids JSON-path typing issues.
  // Unknown emails have no stored failures, so they pass.
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (!user) return false;

  const failures = await db.auditLog.count({
    where: {
      userId: user.id,
      eventType: 'signin_failed',
      createdAt: { gte: windowStart },
    },
  });
  return failures >= 5;
}

async function recordFailedLogin(email: string): Promise<void> {
  // We need a userId to write an audit log. For failed logins on unknown emails,
  // we find the user if they exist. If they don't exist, we skip logging
  // (don't want to leak account existence via timing either).
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (!user) return;

  await db.auditLog.create({
    data: {
      userId: user.id,
      eventType: 'signin_failed',
      metadata: { email: email.toLowerCase() },
    },
  });
}

// ─── Type augmentation ────────────────────────────────────────────────────────

interface SessionUser {
  id: string;
  accountState: string;
  tier: string;
}
