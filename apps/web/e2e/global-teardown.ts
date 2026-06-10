/**
 * global-teardown.ts — Runs once after all E2E tests.
 * Removes the test user and ALL its data from the shared DB.
 */

import { loadEnvLocal } from './helpers/env';
import { cleanupTestUser, disconnectPrisma } from './helpers/test-user';

async function globalTeardown(): Promise<void> {
  loadEnvLocal();
  console.log('[e2e] Cleaning up test user…');
  try {
    await cleanupTestUser();
    console.log('[e2e] Test user removed.');
  } catch (e) {
    console.error('[e2e] Teardown cleanup failed:', e);
  } finally {
    await disconnectPrisma();
  }
}

export default globalTeardown;
