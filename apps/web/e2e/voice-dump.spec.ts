/**
 * E2E: Voice Dump (M7)
 *
 * Scenarios:
 *  1. The hold-to-record mic button is present on the dashboard
 *  2. When the daily quota is exhausted, recording shows the quota-reached card
 *     with a local reset time + "Type instead" — and NO OpenAI call happens
 *     (the route 429s before transcription, so this costs nothing).
 *
 * The happy-path (real audio → real tasks) is a Manual Smoke Test (Human): it
 * needs a real recording + a paid OpenAI call, so it isn't automated here.
 */

import {
  test,
  expect,
  getTestUserId,
  resetTestUserData,
  gotoDashboardReady,
  seedQuotaAtLimit,
} from './helpers/spec-base';

const userId = getTestUserId();

async function holdRecord(page: import('@playwright/test').Page) {
  const mic = page.getByRole('button', { name: /Hold to record/i });
  const box = await mic.boundingBox();
  if (!box) throw new Error('mic button not found');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800); // record ~0.8s of the fake audio device
  await page.mouse.up();
}

test.describe('Voice Dump', () => {
  test.beforeEach(async () => {
    await resetTestUserData(userId);
  });

  test('the hold-to-record mic button is on the dashboard', async ({ page }) => {
    await gotoDashboardReady(page, userId);
    await expect(page.getByRole('button', { name: /Hold to record/i })).toBeVisible();
  });

  test('exhausted quota shows the reset-time card and never hits OpenAI', async ({ page }) => {
    await seedQuotaAtLimit(userId, 'voice_dump', 10); // free-tier cap
    await gotoDashboardReady(page, userId);

    await holdRecord(page);

    // The quota-reached card appears with a local reset time + "Type instead".
    await expect(page.getByText(/used your free voice dumps/i)).toBeVisible();
    await expect(page.getByText(/Resets at .* your time/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Type instead' })).toBeVisible();

    // "Type instead" dismisses the card and focuses the input.
    await page.getByRole('button', { name: 'Type instead' }).click();
    await expect(page.getByText(/used your free voice dumps/i)).toHaveCount(0);
    await expect(page.getByLabel('Task text')).toBeFocused();
  });
});
