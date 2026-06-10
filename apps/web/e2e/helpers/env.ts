/**
 * env.ts — Load apps/web/.env.local into process.env for E2E setup/teardown.
 *
 * Playwright's global setup runs in plain Node (no Next.js env loading),
 * so we parse .env.local ourselves to get DATABASE_URL etc.
 * Minimal parser — no dotenv dependency.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadEnvLocal(): void {
  const envPath = join(__dirname, '..', '..', '.env.local');
  let contents: string;
  try {
    contents = readFileSync(envPath, 'utf8');
  } catch {
    console.warn(`[e2e] .env.local not found at ${envPath} — relying on existing process.env`);
    return;
  }

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
