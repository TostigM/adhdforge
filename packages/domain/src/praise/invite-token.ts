/**
 * invite-token.ts — Praise invite tokens (M10).
 * ──────────────────────────────────────────────────────────────────────────────
 * 256-bit random tokens, SHA-256 hashed at rest (same posture as password-reset
 * tokens). The raw token exists only inside the invite link the recipient
 * shares; the DB stores the hash (BINARY(32), unique).
 */

import crypto from 'node:crypto';

export type GeneratedInviteToken = {
  /** 64 hex chars — goes into the /praise/[token] link, shown once. */
  raw: string;
  /** SHA-256 of the raw bytes — what trusted_contacts.invite_token_hash stores. */
  hash: Buffer;
};

export function generateInviteToken(): GeneratedInviteToken {
  const bytes = crypto.randomBytes(32);
  return {
    raw: bytes.toString('hex'),
    hash: crypto.createHash('sha256').update(bytes).digest(),
  };
}

/**
 * Hash a raw token from a URL for lookup. Returns null for anything that is
 * not exactly 64 hex chars — malformed input never reaches the DB.
 */
export function hashInviteToken(raw: string): Buffer | null {
  if (!/^[0-9a-f]{64}$/i.test(raw)) return null;
  return crypto.createHash('sha256').update(Buffer.from(raw, 'hex')).digest();
}
