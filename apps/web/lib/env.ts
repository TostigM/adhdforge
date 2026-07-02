/**
 * Environment validation — fail fast and loud at server startup.
 * ──────────────────────────────────────────────────────────────────────────────
 * Called once from instrumentation.ts when the Node server boots. A missing or
 * malformed variable stops the boot with a clear list of what's wrong, instead
 * of surfacing later as a confusing runtime failure (doc 07 §Canonical
 * Environment Variables; PROGRAMMING-PRACTICES §1.4).
 *
 * Deviation from doc 07 (which places this in packages/config/env.ts):
 * packages/config is tsconfig-presets-only with no build step, and every env
 * var in this project lives in apps/web/.env.local — so the schema lives here.
 *
 * SECURITY: error output lists variable NAMES only, never values.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url({ message: 'must be a connection URL (mysql://…)' }),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'must be at least 32 chars (openssl rand -base64 32)'),
  NEXTAUTH_URL: z.string().url({ message: 'must be the full app URL (e.g. http://localhost:3000)' }),

  // Auth providers
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // Email (Resend). FROM address is optional — code falls back to the sandbox
  // sender, which only delivers to the account owner's own address.
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().min(3).optional(),

  // AI (M7 voice dump)
  OPENAI_API_KEY: z.string().min(1),

  // Cron dispatcher auth (M8)
  CRON_SECRET: z.string().min(16, 'must be at least 16 chars (openssl rand -base64 32)'),
});

export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  const result = envSchema.safeParse(env);
  if (result.success) return;

  const issues = result.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `Environment validation failed — refusing to start.\n${issues}\n` +
      'Set these in apps/web/.env.local (dev) or the Vercel project settings (prod). ' +
      'See files/07-claude-code-instructions.md §Canonical Environment Variables.',
  );
}
