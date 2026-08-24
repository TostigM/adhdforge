/**
 * spec-base.ts — Shared imports + helpers for all E2E specs.
 *
 * Re-exports Playwright's test/expect, ensures the worker process has
 * DATABASE_URL loaded, and exposes DB seeding helpers + a "go to a ready
 * dashboard" routine that dismisses the morning ritual deterministically.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';

import { loadEnvLocal } from './env';
import {
  getPrisma,
  resetTestUserData,
  createFlexTask,
  createTaskWithSteps,
  getTaskState,
  getLatestFocusSession,
  countBadgeForUser,
  seedQuotaAtLimit,
  skipRitualForUser,
  resetPreferences,
  getLatestPlanId,
  addQueueItems,
  getDoorknobAlerts,
  createLaunchpadItem,
  getLaunchpadItemsForUser,
  createPraiseContact,
  seedPraiseMemo,
  getPraiseMemosForUser,
} from './test-user';

// Worker process needs DATABASE_URL for direct DB seeding/reset
loadEnvLocal();

/** The dedicated test user's id, written by global-setup. */
export function getTestUserId(): string {
  const p = join(__dirname, '..', '.auth', 'user-id.txt');
  return readFileSync(p, 'utf8').trim();
}

/**
 * Navigate to the dashboard with a deterministic, ritual-free state.
 * The plan is created on first visit; we then skip the ritual and reload so
 * the card area / empty state is what's under test (not the ritual prompt).
 */
export async function gotoDashboardReady(page: Page, userId: string): Promise<void> {
  await page.goto('/dashboard');
  // Plan now exists — suppress the ritual and reload for a clean surface.
  await skipRitualForUser(userId);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Hey,/ })).toBeVisible();
}

export {
  test,
  expect,
  getPrisma,
  resetTestUserData,
  createFlexTask,
  createTaskWithSteps,
  getTaskState,
  getLatestFocusSession,
  countBadgeForUser,
  seedQuotaAtLimit,
  skipRitualForUser,
  resetPreferences,
  getLatestPlanId,
  addQueueItems,
  getDoorknobAlerts,
  createLaunchpadItem,
  getLaunchpadItemsForUser,
  createPraiseContact,
  seedPraiseMemo,
  getPraiseMemosForUser,
};
