/**
 * Playwright E2E config for Focus Forge.
 *
 * Notes:
 *  - Tests run against a locally-running dev server (reused if already up).
 *  - Auth is seeded in global-setup (storageState.json), so tests start logged in.
 *  - Single worker: all tests share ONE dedicated test user, so parallel runs
 *    would race on that user's data. Keep it serial.
 *  - Timeouts are generous because the dev DB (Bluehost) can be slow.
 */

import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

const STORAGE_STATE_PATH = join(__dirname, 'e2e', '.auth', 'state.json');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  // Serial — shared test user
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,

  // Generous timeouts for the slow shared DB
  timeout: 60_000,
  expect: { timeout: 15_000 },

  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    storageState: STORAGE_STATE_PATH,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Fake mic so the voice-dump button works headlessly + auto-grant the
        // permission prompt. (The quota E2E never reaches OpenAI — the route
        // 429s before any paid call — so no real audio/transcription happens.)
        launchOptions: {
          args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
        },
        permissions: ['microphone'],
      },
    },
  ],

  // NOTE: No `webServer` block — the dev server must already be running on
  // :3000 (`pnpm dev`). Playwright's auto-spawn was unreliable here because the
  // app's `/` route 307-redirects (auth), which broke its readiness probe.
});
