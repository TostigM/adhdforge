/**
 * global-setup.ts — Runs once before all E2E tests.
 *
 * 1. Loads .env.local (DATABASE_URL etc.)
 * 2. Seeds the dedicated test user + an authenticated DB session
 * 3. Writes storageState.json containing the session cookie so every test
 *    starts already logged in (no UI login needed)
 * 4. Stashes the userId in an env var for specs to read
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FullConfig } from '@playwright/test';

import { loadEnvLocal } from './helpers/env';
import { seedTestUser, disconnectPrisma, SESSION_COOKIE_NAME } from './helpers/test-user';

export const STORAGE_STATE_PATH = join(__dirname, '.auth', 'state.json');
export const USER_ID_PATH = join(__dirname, '.auth', 'user-id.txt');

async function globalSetup(_config: FullConfig): Promise<void> {
  loadEnvLocal();

  if (!process.env.DATABASE_URL) {
    throw new Error('[e2e] DATABASE_URL not set — cannot seed test user. Check apps/web/.env.local');
  }

  console.log('[e2e] Seeding test user + session…');
  const { userId, sessionToken, expires } = await seedTestUser();

  // Build a Playwright storage state with the NextAuth session cookie.
  const storageState = {
    cookies: [
      {
        name: SESSION_COOKIE_NAME,
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        expires: Math.floor(expires.getTime() / 1000),
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  };

  writeFileSync(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
  writeFileSync(USER_ID_PATH, userId);

  console.log(`[e2e] Test user ready (id=${userId}). Storage state written.`);
  await disconnectPrisma();
}

export default globalSetup;
