/**
 * Tests: startup environment validation (Session 13).
 */
import { describe, expect, it } from 'vitest';

import { validateEnv } from '../env';

const validEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'mysql://user:pass@host:3306/db',
  NEXTAUTH_SECRET: 'x'.repeat(44),
  NEXTAUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'gid',
  GOOGLE_CLIENT_SECRET: 'gsecret',
  RESEND_API_KEY: 're_key',
  RESEND_FROM_EMAIL: 'hello@focusforge.test',
  OPENAI_API_KEY: 'sk-test',
  CRON_SECRET: 'c'.repeat(44),
  R2_ACCOUNT_ID: 'r2acct',
  R2_ACCESS_KEY_ID: 'r2key',
  R2_SECRET_ACCESS_KEY: 'r2secret',
  R2_BUCKET_NAME: 'focus-forge-praise-dev',
} as NodeJS.ProcessEnv;

describe('validateEnv', () => {
  it('passes with a complete environment', () => {
    expect(() => validateEnv(validEnv)).not.toThrow();
  });

  it('passes without the optional RESEND_FROM_EMAIL', () => {
    const { RESEND_FROM_EMAIL: _omit, ...rest } = validEnv;
    expect(() => validateEnv(rest as NodeJS.ProcessEnv)).not.toThrow();
  });

  it('names the missing variable without leaking any values', () => {
    const { DATABASE_URL: _omit, ...rest } = validEnv;
    try {
      validateEnv(rest as NodeJS.ProcessEnv);
      expect.unreachable('should have thrown');
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain('DATABASE_URL');
      // No secret values in the error output
      expect(message).not.toContain('gsecret');
      expect(message).not.toContain('sk-test');
    }
  });

  it('rejects a too-short NEXTAUTH_SECRET', () => {
    expect(() => validateEnv({ ...validEnv, NEXTAUTH_SECRET: 'short' })).toThrow(
      /NEXTAUTH_SECRET/,
    );
  });

  it('rejects a malformed NEXTAUTH_URL', () => {
    expect(() => validateEnv({ ...validEnv, NEXTAUTH_URL: 'not a url' })).toThrow(
      /NEXTAUTH_URL/,
    );
  });
});
