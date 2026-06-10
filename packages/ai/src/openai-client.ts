/**
 * openai-client.ts — Lazy OpenAI client singleton.
 * ──────────────────────────────────────────────────────────────────────────────
 * Lazily constructed so importing this module doesn't throw at build time when
 * OPENAI_API_KEY isn't present (e.g. during `next build` of unrelated routes).
 * The key is read from the environment at first use.
 */

import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set. Add it to apps/web/.env.local (and Vercel).');
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/** Test seam — inject a mock client (used by unit tests). */
export function __setOpenAIForTests(client: unknown): void {
  _client = client as OpenAI;
}
